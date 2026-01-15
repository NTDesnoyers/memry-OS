import { authUsers, betaEvents, betaWhitelist, type AuthUser, type UpsertAuthUser, type SubscriptionStatus, type InsertBetaEvent, type BetaEvent, type BetaWhitelistEntry, type InsertBetaWhitelistEntry } from "@shared/models/auth";
import { db } from "../../db";
import { eq, desc, ne, sql, gte, and, count, ilike } from "drizzle-orm";
import { createLogger } from "../../logger";

const logger = createLogger("AuthStorage");

// Founder email - auto-approved and admin
const FOUNDER_EMAIL = "nathan@desnoyersproperties.com";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface UpsertResult {
  user: AuthUser;
  isNewUser: boolean;
}

export interface IAuthStorage {
  getUser(id: string): Promise<AuthUser | undefined>;
  getUserByEmail(email: string): Promise<AuthUser | undefined>;
  upsertUser(user: UpsertAuthUser): Promise<UpsertResult>;
  getAllUsers(): Promise<AuthUser[]>;
  getPendingUsers(): Promise<AuthUser[]>;
  updateUserStatus(id: string, status: 'pending' | 'approved' | 'denied'): Promise<AuthUser | undefined>;
  updateSubscription(id: string, data: {
    stripeCustomerId?: string;
    subscriptionId?: string;
    subscriptionStatus: SubscriptionStatus;
    currentPeriodEnd?: Date;
    trialEnd?: Date;
    canceledAt?: Date | null;
  }): Promise<AuthUser | undefined>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<AuthUser | undefined> {
    const [user] = await db.select().from(authUsers).where(eq(authUsers.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<AuthUser | undefined> {
    const [user] = await db.select().from(authUsers).where(ilike(authUsers.email, email));
    return user;
  }

  async upsertUser(userData: UpsertAuthUser): Promise<UpsertResult> {
    logger.info(`upsertUser called: id=${userData.id} email=${userData.email}`);
    
    // Check if user already exists by ID first
    let existingUser = await this.getUser(userData.id!);
    
    // Also check by email to handle OIDC with different sub but same email
    if (!existingUser && userData.email) {
      existingUser = await this.getUserByEmail(userData.email);
    }
    
    logger.info(`upsertUser: existingUser=${existingUser ? existingUser.id : 'none'}`);
    
    // Auto-approve founder
    const isFounder = userData.email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
    
    // Check if email is whitelisted for auto-approval
    const isWhitelisted = userData.email ? await this.isEmailWhitelisted(userData.email) : false;
    
    if (existingUser) {
      // User exists - update profile info
      // For founder: always ensure approved status and admin rights
      const updateData: any = {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        updatedAt: new Date(),
      };
      
      // Auto-fix founder status if somehow not set correctly
      if (isFounder) {
        updateData.status = 'approved';
        updateData.isAdmin = true;
      }
      
      // BETA MODE: Auto-approve any pending users on login
      // To restore approval gate later, change condition to: isWhitelisted && existingUser.status === 'pending'
      if (existingUser.status === 'pending') {
        updateData.status = 'approved';
        if (isWhitelisted) {
          updateData.signupSource = 'invited';
          await this.markWhitelistUsed(userData.email!);
        }
      }
      
      try {
        const [user] = await db
          .update(authUsers)
          .set(updateData)
          .where(eq(authUsers.id, existingUser.id))
          .returning();
        logger.info(`upsertUser: updated existing user id=${user.id} email=${user.email}`);
        return { user, isNewUser: false };
      } catch (dbError: any) {
        logger.error(`upsertUser: DB UPDATE failed for id=${existingUser.id} error=${dbError.message}`);
        throw dbError;
      }
    } else {
      // New user - set initial status
      // BETA MODE: Auto-approve all new users for frictionless onboarding
      // To restore approval gate later, change this to: isFounder || isWhitelisted
      const shouldAutoApprove = true;
      
      try {
        const [user] = await db
          .insert(authUsers)
          .values({
            ...userData,
            status: shouldAutoApprove ? 'approved' : 'pending',
            isAdmin: isFounder,
            signupSource: isWhitelisted ? 'invited' : 'organic',
          })
          .returning();
        
        logger.info(`upsertUser: created new user id=${user.id} email=${user.email} status=${user.status}`);
        
        // Mark whitelist entry as used
        if (isWhitelisted && userData.email) {
          await this.markWhitelistUsed(userData.email);
        }
        
        return { user, isNewUser: true };
      } catch (dbError: any) {
        logger.error(`upsertUser: DB INSERT failed for email=${userData.email} error=${dbError.message}`);
        logger.error(`upsertUser: Stack trace: ${dbError.stack}`);
        throw dbError;
      }
    }
  }
  
  async isEmailWhitelisted(email: string): Promise<boolean> {
    const [entry] = await db.select()
      .from(betaWhitelist)
      .where(ilike(betaWhitelist.email, email));
    return !!entry;
  }
  
  async markWhitelistUsed(email: string): Promise<void> {
    await db.update(betaWhitelist)
      .set({ usedAt: new Date() })
      .where(ilike(betaWhitelist.email, email));
  }

  async getAllUsers(): Promise<AuthUser[]> {
    return await db.select().from(authUsers).orderBy(desc(authUsers.createdAt));
  }

  async getPendingUsers(): Promise<AuthUser[]> {
    return await db.select().from(authUsers)
      .where(eq(authUsers.status, 'pending'))
      .orderBy(desc(authUsers.createdAt));
  }

  async updateUserStatus(id: string, status: 'pending' | 'approved' | 'denied'): Promise<AuthUser | undefined> {
    const [user] = await db
      .update(authUsers)
      .set({ status, updatedAt: new Date() })
      .where(eq(authUsers.id, id))
      .returning();
    return user;
  }

  async updateSubscription(id: string, data: {
    stripeCustomerId?: string;
    subscriptionId?: string;
    subscriptionStatus: SubscriptionStatus;
    currentPeriodEnd?: Date;
    trialEnd?: Date;
    canceledAt?: Date | null;
  }): Promise<AuthUser | undefined> {
    const [user] = await db
      .update(authUsers)
      .set({
        stripeCustomerId: data.stripeCustomerId,
        subscriptionId: data.subscriptionId,
        subscriptionStatus: data.subscriptionStatus,
        currentPeriodEnd: data.currentPeriodEnd,
        trialEnd: data.trialEnd,
        canceledAt: data.canceledAt,
        updatedAt: new Date(),
      })
      .where(eq(authUsers.id, id))
      .returning();
    return user;
  }

  async getUserByStripeCustomerId(customerId: string): Promise<AuthUser | undefined> {
    const [user] = await db.select().from(authUsers).where(eq(authUsers.stripeCustomerId, customerId));
    return user;
  }

  async updateLastActive(id: string): Promise<void> {
    await db
      .update(authUsers)
      .set({ lastActiveAt: new Date() })
      .where(eq(authUsers.id, id));
  }

  async trackBetaEvent(event: InsertBetaEvent): Promise<BetaEvent> {
    // Legacy method - use recordBetaEvent for new code
    return this.recordBetaEvent({
      userId: event.userId,
      sessionId: event.sessionId,
      eventType: event.eventType,
      properties: event.properties ?? undefined,
    });
  }

  /**
   * Record a beta analytics event with strict validation.
   * Every event must have either userId, sessionId, or both.
   * Rejects events missing both (per analytics spec).
   */
  async recordBetaEvent(event: {
    userId?: string | null;
    sessionId?: string | null;
    eventType: string;
    properties?: Record<string, unknown>;
  }): Promise<BetaEvent> {
    // Validation: reject if no userId AND no sessionId
    if (!event.userId && !event.sessionId) {
      const errorMsg = `Invalid beta event: missing userId and sessionId for eventType=${event.eventType}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const [created] = await db.insert(betaEvents).values({
        userId: event.userId || undefined,
        sessionId: event.sessionId || undefined,
        eventType: event.eventType,
        properties: event.properties,
      }).returning();
      
      logger.info(`Beta event recorded: type=${event.eventType} userId=${event.userId || 'none'} sessionId=${event.sessionId || 'none'}`);
      return created;
    } catch (error: any) {
      logger.error(`Failed to record beta event: type=${event.eventType} error=${error.message}`);
      throw error;
    }
  }

  /**
   * Mark user as activated (first meaningful action).
   * Idempotent - only fires once per user.
   */
  async markUserActivated(userId: string, sessionId?: string): Promise<boolean> {
    // Check if already activated
    const user = await this.getUser(userId);
    if (!user) {
      logger.warn(`markUserActivated: user not found userId=${userId}`);
      return false;
    }
    
    if (user.activatedAt) {
      // Already activated, skip
      return false;
    }

    // Mark activated
    await db.update(authUsers)
      .set({ activatedAt: new Date() })
      .where(eq(authUsers.id, userId));

    // Record activation event
    await this.recordBetaEvent({
      userId,
      sessionId,
      eventType: 'activated',
      properties: { trigger: 'first_meaningful_action' },
    });

    logger.info(`User activated: userId=${userId}`);
    return true;
  }

  async getBetaStats(): Promise<{
    totalUsers: number;
    activeUsersLast7Days: number;
    usersWithFollowupsLast7Days: number;
    avgConversationsPerUser: number;
    retentionWeekOverWeek: number;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [totalUsersResult] = await db.select({ count: count() }).from(authUsers).where(eq(authUsers.status, 'approved'));
    const totalUsers = totalUsersResult?.count || 0;

    const conversationsThisWeekResult = await db.selectDistinct({ userId: betaEvents.userId })
      .from(betaEvents)
      .where(and(
        eq(betaEvents.eventType, 'conversation_logged'),
        gte(betaEvents.createdAt, sevenDaysAgo)
      ));
    const activeUsersLast7Days = conversationsThisWeekResult.length;

    const followupsResult = await db.selectDistinct({ userId: betaEvents.userId })
      .from(betaEvents)
      .where(and(
        eq(betaEvents.eventType, 'followup_created'),
        gte(betaEvents.createdAt, sevenDaysAgo)
      ));
    const usersWithFollowupsLast7Days = followupsResult.length;

    const [convCountResult] = await db.select({ count: count() }).from(betaEvents)
      .where(and(eq(betaEvents.eventType, 'conversation_logged'), gte(betaEvents.createdAt, sevenDaysAgo)));
    const totalConversations = convCountResult?.count || 0;
    const avgConversationsPerUser = activeUsersLast7Days > 0 ? totalConversations / activeUsersLast7Days : 0;

    const conversationsPriorWeekResult = await db.selectDistinct({ userId: betaEvents.userId })
      .from(betaEvents)
      .where(and(
        eq(betaEvents.eventType, 'conversation_logged'),
        gte(betaEvents.createdAt, fourteenDaysAgo),
        sql`${betaEvents.createdAt} < ${sevenDaysAgo}`
      ));
    const activeLastWeekUserIds = new Set(conversationsPriorWeekResult.map(r => r.userId));
    
    const retainedUsers = conversationsThisWeekResult.filter(r => activeLastWeekUserIds.has(r.userId)).length;
    const retentionWeekOverWeek = activeLastWeekUserIds.size > 0 
      ? Math.round((retainedUsers / activeLastWeekUserIds.size) * 100) 
      : 0;

    return {
      totalUsers,
      activeUsersLast7Days,
      usersWithFollowupsLast7Days,
      avgConversationsPerUser: Math.round(avgConversationsPerUser * 10) / 10,
      retentionWeekOverWeek,
    };
  }
  
  // Whitelist management methods
  async getWhitelist(): Promise<BetaWhitelistEntry[]> {
    return await db.select().from(betaWhitelist).orderBy(desc(betaWhitelist.createdAt));
  }
  
  async addToWhitelist(email: string, addedBy?: string, note?: string): Promise<BetaWhitelistEntry> {
    const [entry] = await db.insert(betaWhitelist)
      .values({ 
        email: email.toLowerCase().trim(), 
        addedBy, 
        note 
      })
      .returning();
    return entry;
  }
  
  async removeFromWhitelist(id: string): Promise<boolean> {
    const result = await db.delete(betaWhitelist).where(eq(betaWhitelist.id, id)).returning();
    return result.length > 0;
  }
  
  async addMultipleToWhitelist(emails: string[], addedBy?: string): Promise<BetaWhitelistEntry[]> {
    const entries = emails.map(email => ({
      email: email.toLowerCase().trim(),
      addedBy,
    }));
    
    // Use ON CONFLICT to skip duplicates
    const result = await db.insert(betaWhitelist)
      .values(entries)
      .onConflictDoNothing({ target: betaWhitelist.email })
      .returning();
    
    return result;
  }

  async getBetaUsers(): Promise<Array<{
    email: string;
    status: 'activated' | 'signed_up';
    lastSeen: Date | null;
    conversationCount: number;
    followupCount: number;
    signedUpAt: Date | null;
  }>> {
    // Get all auth users (excluding test accounts)
    const allUsers = await db.select().from(authUsers);
    
    const result = [];
    for (const user of allUsers) {
      if (!user.id) continue;
      
      // Get user's beta events
      const userEvents = await db.select()
        .from(betaEvents)
        .where(eq(betaEvents.userId, user.id));
      
      // Derive status from events
      const hasActivated = userEvents.some(e => e.eventType === 'activated');
      const status: 'activated' | 'signed_up' = hasActivated ? 'activated' : 'signed_up';
      
      // Get last seen (most recent event)
      const lastSeenEvent = userEvents.sort((a, b) => 
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      )[0];
      const lastSeen = lastSeenEvent?.createdAt || null;
      
      // Get signup date from user_signup event or fallback to createdAt
      const signupEvent = userEvents.find(e => e.eventType === 'user_signup');
      const signedUpAt = signupEvent?.createdAt || user.createdAt || null;
      
      // Count conversations (from beta_events conversation_logged)
      const conversationCount = userEvents.filter(e => e.eventType === 'conversation_logged').length;
      
      // Count follow-ups (from beta_events followup_created)
      const followupCount = userEvents.filter(e => e.eventType === 'followup_created').length;
      
      result.push({
        email: user.email || 'unknown',
        status,
        lastSeen,
        conversationCount,
        followupCount,
        signedUpAt,
      });
    }
    
    // Sort by lastSeen (most recent first), nulls last
    result.sort((a, b) => {
      if (!a.lastSeen && !b.lastSeen) return 0;
      if (!a.lastSeen) return 1;
      if (!b.lastSeen) return -1;
      return b.lastSeen.getTime() - a.lastSeen.getTime();
    });
    
    return result;
  }

  async getAdminBetaStats(): Promise<{
    users: { total: number; signedUpLast7Days: number };
    events: { total: number; byType: Record<string, number> };
    activation: { activatedUsers: number; activationRate: number };
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Users stats
    const [totalUsersResult] = await db.select({ count: count() }).from(authUsers);
    const totalUsers = totalUsersResult?.count || 0;

    const [signedUpLast7DaysResult] = await db.select({ count: count() })
      .from(authUsers)
      .where(gte(authUsers.createdAt, sevenDaysAgo));
    const signedUpLast7Days = signedUpLast7DaysResult?.count || 0;

    // Events stats
    const [totalEventsResult] = await db.select({ count: count() }).from(betaEvents);
    const totalEvents = totalEventsResult?.count || 0;

    const eventsByType = await db
      .select({ eventType: betaEvents.eventType, count: count() })
      .from(betaEvents)
      .groupBy(betaEvents.eventType);
    
    const byType: Record<string, number> = {};
    for (const row of eventsByType) {
      byType[row.eventType] = row.count;
    }

    // Activation stats
    const [activatedUsersResult] = await db.select({ count: count() })
      .from(authUsers)
      .where(sql`${authUsers.activatedAt} IS NOT NULL`);
    const activatedUsers = activatedUsersResult?.count || 0;
    const activationRate = totalUsers > 0 ? Math.round((activatedUsers / totalUsers) * 100) / 100 : 0;

    return {
      users: { total: totalUsers, signedUpLast7Days },
      events: { total: totalEvents, byType },
      activation: { activatedUsers, activationRate },
    };
  }
}

export const authStorage = new AuthStorage();
