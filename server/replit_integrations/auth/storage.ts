import { authUsers, betaEvents, type AuthUser, type UpsertAuthUser, type SubscriptionStatus, type InsertBetaEvent, type BetaEvent } from "@shared/models/auth";
import { db } from "../../db";
import { eq, desc, ne, sql, gte, and, count } from "drizzle-orm";

// Founder emails - auto-approved and admin
const FOUNDER_EMAILS = [
  "nathan@desnoyersproperties.com",
  "desnoyers94@gmail.com"
];

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<AuthUser | undefined>;
  getUserByEmail(email: string): Promise<AuthUser | undefined>;
  upsertUser(user: UpsertAuthUser): Promise<AuthUser>;
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
    const [user] = await db.select().from(authUsers).where(eq(authUsers.email, email));
    return user;
  }

  async upsertUser(userData: UpsertAuthUser): Promise<AuthUser> {
    // Check if user already exists by ID first
    let existingUser = await this.getUser(userData.id!);
    
    // Also check by email to handle OIDC with different sub but same email
    if (!existingUser && userData.email) {
      existingUser = await this.getUserByEmail(userData.email);
    }
    
    // Auto-approve founder
    const isFounder = FOUNDER_EMAILS.some(
      email => userData.email?.toLowerCase() === email.toLowerCase()
    );
    
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
      
      const [user] = await db
        .update(authUsers)
        .set(updateData)
        .where(eq(authUsers.id, existingUser.id))
        .returning();
      return user;
    } else {
      // New user - set initial status
      const [user] = await db
        .insert(authUsers)
        .values({
          ...userData,
          status: isFounder ? 'approved' : 'pending',
          isAdmin: isFounder,
        })
        .returning();
      return user;
    }
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
    const [created] = await db.insert(betaEvents).values(event).returning();
    return created;
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
}

export const authStorage = new AuthStorage();
