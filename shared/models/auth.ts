import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Auth user storage table for Replit Auth.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
// Beta access: status controls whether user can access the app
// - 'approved': Full access
// - 'pending': Awaiting approval (default for new signups)
// - 'denied': Access denied
// Subscription status for billing:
// - 'none': No subscription yet
// - 'trialing': In trial period
// - 'active': Paid and active
// - 'past_due': Payment failed, grace period
// - 'canceled': Subscription canceled
export const authUsers = pgTable("auth_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, approved, denied
  isAdmin: boolean("is_admin").default(false).notNull(), // true for founder/admin
  stripeCustomerId: varchar("stripe_customer_id"),
  subscriptionStatus: varchar("subscription_status", { length: 20 }).default("none").notNull(), // none, trialing, active, past_due, canceled
  subscriptionId: varchar("subscription_id"),
  currentPeriodEnd: timestamp("current_period_end"),
  trialEnd: timestamp("trial_end"),
  canceledAt: timestamp("canceled_at"),
  signupSource: varchar("signup_source", { length: 20 }).default("organic"), // invited, organic
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Beta analytics events table
export const betaEvents = pgTable("beta_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // app_opened, feature_opened, conversation_logged, followup_created, weekly_review_viewed
  properties: jsonb("properties").$type<Record<string, unknown>>(), // Additional event properties
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_beta_events_user").on(table.userId),
  index("idx_beta_events_type").on(table.eventType),
  index("idx_beta_events_created").on(table.createdAt),
]);

export type BetaEvent = typeof betaEvents.$inferSelect;
export type InsertBetaEvent = typeof betaEvents.$inferInsert;

export type UpsertAuthUser = typeof authUsers.$inferInsert;
export type AuthUser = typeof authUsers.$inferSelect;
export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';
