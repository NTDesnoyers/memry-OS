import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (for authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// People (Contacts) - Core entity
export const people = pgTable("people", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  category: text("category"),
  notes: text("notes"),
  fordFamily: text("ford_family"),
  fordOccupation: text("ford_occupation"),
  fordRecreation: text("ford_recreation"),
  fordDreams: text("ford_dreams"),
  lastContact: timestamp("last_contact"),
  isBuyer: boolean("is_buyer").default(false),
  buyerStatus: text("buyer_status"),
  buyerPriceMin: integer("buyer_price_min"),
  buyerPriceMax: integer("buyer_price_max"),
  buyerBeds: integer("buyer_beds"),
  buyerBaths: integer("buyer_baths"),
  buyerAreas: text("buyer_areas").array(),
  buyerPropertyTypes: text("buyer_property_types").array(),
  buyerMustHaves: text("buyer_must_haves").array(),
  buyerNotes: text("buyer_notes"),
  isRealtor: boolean("is_realtor").default(false),
  realtorBrokerage: text("realtor_brokerage"),
  receiveNewsletter: boolean("receive_newsletter").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPersonSchema = createInsertSchema(people).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Person = typeof people.$inferSelect;

// Business Settings (Goals & Fees)
export const businessSettings = pgTable("business_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  year: integer("year").notNull().default(2025),
  annualGCIGoal: integer("annual_gci_goal").default(200000),
  franchiseFeeFlat: integer("franchise_fee_flat").default(0),
  franchiseFeePercent: integer("franchise_fee_percent").default(0),
  franchiseFeeCap: integer("franchise_fee_cap").default(0),
  marketingFeeFlat: integer("marketing_fee_flat").default(0),
  marketingFeePercent: integer("marketing_fee_percent").default(0),
  marketingFeeCap: integer("marketing_fee_cap").default(0),
  officeCap: integer("office_cap").default(0),
  startingSplit: integer("starting_split").default(70),
  secondarySplit: integer("secondary_split").default(85),
  progressiveTiers: jsonb("progressive_tiers"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;
export type BusinessSettings = typeof businessSettings.$inferSelect;

// Deals
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id),
  title: text("title").notNull(),
  address: text("address"),
  type: text("type").notNull(),
  stage: text("stage").notNull(),
  side: text("side").default("buyer"),
  isReferral: boolean("is_referral").default(false),
  painPleasureRating: integer("pain_pleasure_rating").default(3),
  value: integer("value"),
  commissionPercent: integer("commission_percent").default(3),
  expectedCloseDate: timestamp("expected_close_date"),
  actualCloseDate: timestamp("actual_close_date"),
  actualGCI: integer("actual_gci"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;

// PIE Time Entries
export const pieEntries = pgTable("pie_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  pTime: integer("p_time").default(0),
  iTime: integer("i_time").default(0),
  eTime: integer("e_time").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPieEntrySchema = createInsertSchema(pieEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertPieEntry = z.infer<typeof insertPieEntrySchema>;
export type PieEntry = typeof pieEntries.$inferSelect;

// Tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id),
  dealId: varchar("deal_id").references(() => deals.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: text("priority"),
  status: text("status").notNull().default('pending'),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Meetings (Zoom, Google Meet, etc.)
export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id),
  title: text("title").notNull(),
  platform: text("platform"),
  startTime: timestamp("start_time"),
  duration: integer("duration"),
  transcript: text("transcript"),
  summary: text("summary"),
  actionItems: text("action_items").array(),
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

// Calls (Phone calls)
export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id),
  phoneNumber: text("phone_number"),
  direction: text("direction"),
  duration: integer("duration"),
  transcript: text("transcript"),
  summary: text("summary"),
  actionItems: text("action_items").array(),
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

// Weekly Reviews
export const weeklyReviews = pgTable("weekly_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekStartDate: timestamp("week_start_date").notNull(),
  accomplishments: text("accomplishments").array(),
  challenges: text("challenges").array(),
  goals: text("goals").array(),
  insights: text("insights"),
  gratitude: text("gratitude").array(),
  metrics: jsonb("metrics"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWeeklyReviewSchema = createInsertSchema(weeklyReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWeeklyReview = z.infer<typeof insertWeeklyReviewSchema>;
export type WeeklyReview = typeof weeklyReviews.$inferSelect;

// Notes (for voice dictation and general notes)
export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id),
  dealId: varchar("deal_id").references(() => deals.id),
  content: text("content").notNull(),
  type: text("type"),
  tags: text("tags").array(),
  imageUrls: text("image_urls").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

// Listings (Haves - properties you have available)
export const listings = pgTable("listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull(),
  price: integer("price"),
  beds: integer("beds"),
  baths: integer("baths"),
  sqft: integer("sqft"),
  propertyType: text("property_type"),
  areas: text("areas").array(),
  features: text("features").array(),
  description: text("description"),
  status: text("status").default("active"),
  listingType: text("listing_type"),
  mlsNumber: text("mls_number"),
  photoUrl: text("photo_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listings.$inferSelect;

// Email Campaigns (for tracking Haves & Wants newsletters)
export const emailCampaigns = pgTable("email_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(),
  htmlContent: text("html_content"),
  recipientCount: integer("recipient_count"),
  sentAt: timestamp("sent_at"),
  status: text("status").default("draft"),
  campaignType: text("campaign_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;

// Pricing Reviews (Visual Pricing / Focus1st style analysis)
export const pricingReviews = pgTable("pricing_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id),
  title: text("title").notNull(),
  neighborhood: text("neighborhood"),
  city: text("city"),
  subjectAddress: text("subject_address"),
  subjectDescription: text("subject_description"),
  mlsData: jsonb("mls_data"),
  calculatedMetrics: jsonb("calculated_metrics"),
  positioningRatings: jsonb("positioning_ratings"),
  notes: text("notes"),
  status: text("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPricingReviewSchema = createInsertSchema(pricingReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPricingReview = z.infer<typeof insertPricingReviewSchema>;
export type PricingReview = typeof pricingReviews.$inferSelect;

// MLS Property type for the imported data
export type MLSProperty = {
  mlsNumber: string;
  status: string;
  address: string;
  city?: string;
  subdivision?: string;
  acres?: number;
  aboveGradeSqft?: number;
  totalSqft?: number;
  beds?: number;
  baths?: number;
  yearBuilt?: number;
  style?: string;
  listPrice?: number;
  originalListPrice?: number;
  closePrice?: number;
  dom?: number;
  listDate?: string;
  closeDate?: string;
  statusChangeDate?: string;
  pricePerSqft?: number;
};

// Relations
export const peopleRelations = relations(people, ({ many }) => ({
  deals: many(deals),
  tasks: many(tasks),
  meetings: many(meetings),
  calls: many(calls),
  notes: many(notes),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  person: one(people, {
    fields: [deals.personId],
    references: [people.id],
  }),
  tasks: many(tasks),
  notes: many(notes),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  person: one(people, {
    fields: [tasks.personId],
    references: [people.id],
  }),
  deal: one(deals, {
    fields: [tasks.dealId],
    references: [deals.id],
  }),
}));

export const meetingsRelations = relations(meetings, ({ one }) => ({
  person: one(people, {
    fields: [meetings.personId],
    references: [people.id],
  }),
}));

export const callsRelations = relations(calls, ({ one }) => ({
  person: one(people, {
    fields: [calls.personId],
    references: [people.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  person: one(people, {
    fields: [notes.personId],
    references: [people.id],
  }),
  deal: one(deals, {
    fields: [notes.dealId],
    references: [deals.id],
  }),
}));
