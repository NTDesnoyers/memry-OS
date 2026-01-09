import { authUsers, type AuthUser, type UpsertAuthUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq, desc, ne } from "drizzle-orm";

// Founder email - auto-approved and admin
const FOUNDER_EMAIL = "nathan@desnoyersproperties.com";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<AuthUser | undefined>;
  getUserByEmail(email: string): Promise<AuthUser | undefined>;
  upsertUser(user: UpsertAuthUser): Promise<AuthUser>;
  getAllUsers(): Promise<AuthUser[]>;
  getPendingUsers(): Promise<AuthUser[]>;
  updateUserStatus(id: string, status: 'pending' | 'approved' | 'denied'): Promise<AuthUser | undefined>;
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
    // Check if user already exists to preserve status/isAdmin
    const existingUser = await this.getUser(userData.id!);
    
    // Auto-approve founder
    const isFounder = userData.email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
    
    if (existingUser) {
      // User exists - update profile info but preserve status/isAdmin
      const [user] = await db
        .update(authUsers)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(authUsers.id, userData.id!))
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
}

export const authStorage = new AuthStorage();
