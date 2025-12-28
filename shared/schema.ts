/**
 * Schema module - Drizzle ORM schema definitions and Zod validation types.
 * Shared between frontend and backend for type safety.
 */
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/** Users table - Authentication credentials. */
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

/** Households - Groups people living at the same address for mailers. */
export const households = pgTable("households", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g. "Cohen & Davis Household" or auto-generated
  address: text("address"),
  primaryPersonId: varchar("primary_person_id"), // For mailers, which name to use
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertHouseholdSchema = createInsertSchema(households).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type Household = typeof households.$inferSelect;

/** People (Contacts) - Core entity with FORD notes, segment (A/B/C/D), buyer needs. */
export const people = pgTable("people", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nickname: text("nickname"),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  segment: text("segment"),
  address: text("address"),
  householdId: varchar("household_id"), // Links to households table
  notes: text("notes"),
  fordFamily: text("ford_family"),
  fordOccupation: text("ford_occupation"),
  fordRecreation: text("ford_recreation"),
  fordDreams: text("ford_dreams"),
  linkedinUrl: text("linkedin_url"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  twitterUrl: text("twitter_url"),
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
  // What this person needs (looking for plumber, contractor, buyer for home, etc.)
  needs: text("needs").array(),
  // What this person offers (their profession, services they provide)
  offers: text("offers").array(),
  // Profession/Industry for referral matching
  profession: text("profession"),
  // D segment tracking for "develop or delete" workflow
  segmentEnteredAt: timestamp("segment_entered_at"),
  contactAttempts: integer("contact_attempts").default(0),
  contactResponses: integer("contact_responses").default(0),
  reviewStatus: text("review_status"), // null, 'needs_review', 'keep', 'delete_pending'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("people_segment_idx").on(table.segment),
  index("people_last_contact_idx").on(table.lastContact),
]);

export const insertPersonSchema = createInsertSchema(people).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type Person = typeof people.$inferSelect;

/** Business Settings - Annual goals, fee structures, split tiers. */
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

/** Agent Profile - User's personal and business info (single-user system). */
export const agentProfile = pgTable("agent_profile", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().default("Agent Name"),
  email: text("email"),
  phone: text("phone"),
  agentId: text("agent_id"),
  licenseNumber: text("license_number"),
  licenseState: text("license_state"),
  brokerage: text("brokerage"),
  brokerageLogoUrl: text("brokerage_logo_url"),
  brokeragePrimaryColor: text("brokerage_primary_color"),
  teamName: text("team_name"),
  personalLogoUrl: text("personal_logo_url"),
  headshotUrl: text("headshot_url"),
  headshotPosition: text("headshot_position").default("center center"), // CSS object-position for cropping
  website: text("website"),
  socialLinkedIn: text("social_linkedin"),
  socialFacebook: text("social_facebook"),
  socialInstagram: text("social_instagram"),
  googleReviewUrl: text("google_review_url"),
  googleReviewQrUrl: text("google_review_qr_url"),
  tagline: text("tagline"),
  annualTransactionGoal: integer("annual_transaction_goal").default(24),
  annualGCIGoal: integer("annual_gci_goal").default(200000),
  wordOfYear: text("word_of_year"),
  affirmation: text("affirmation"),
  familyMission: text("family_mission"),
  businessMission: text("business_mission"),
  quarterlyFocus: text("quarterly_focus"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgentProfileSchema = createInsertSchema(agentProfile).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgentProfile = z.infer<typeof insertAgentProfileSchema>;
export type AgentProfile = typeof agentProfile.$inferSelect;

/** Deals - Pipeline management with stages: warm → hot → in_contract → closed. */
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
  listPrice: integer("list_price"),
  soldPrice: integer("sold_price"),
  source: text("source"),
  commissionPercent: integer("commission_percent").default(3),
  expectedCloseDate: timestamp("expected_close_date"),
  actualCloseDate: timestamp("actual_close_date"),
  actualGCI: integer("actual_gci"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("deals_person_id_idx").on(table.personId),
  index("deals_stage_idx").on(table.stage),
]);

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
  totalTime: integer("total_time").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPieEntrySchema = createInsertSchema(pieEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertPieEntry = z.infer<typeof insertPieEntrySchema>;
export type PieEntry = typeof pieEntries.$inferSelect;

/** Tasks - Follow-up actions, optionally linked to person/deal. Syncs to Todoist. */
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id),
  dealId: varchar("deal_id").references(() => deals.id),
  reviewId: varchar("review_id"),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: text("priority"),
  status: text("status").notNull().default('pending'),
  completed: boolean("completed").default(false).notNull(),
  todoistId: text("todoist_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("tasks_person_id_idx").on(table.personId),
  index("tasks_due_date_idx").on(table.dueDate),
  index("tasks_status_idx").on(table.status),
]);

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
}, (table) => [
  index("notes_person_id_idx").on(table.personId),
]);

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

// 8x8 Campaigns (8 touches in 8 weeks for D segment contacts)
export const eightByEightCampaigns = pgTable("eight_by_eight_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  currentStep: integer("current_step").default(1).notNull(), // 1-8
  completedSteps: integer("completed_steps").default(0).notNull(),
  status: text("status").default("active").notNull(), // active, completed, abandoned
  // Track each touch: type and completion date
  touches: jsonb("touches").$type<Array<{
    step: number;
    type: 'call' | 'text' | 'email' | 'mail' | 'in_person' | 'social';
    completedAt?: string;
    notes?: string;
  }>>(),
  outcome: text("outcome"), // 'promoted_to_a', 'promoted_to_b', 'promoted_to_c', 'deleted', 'meeting_booked'
  outcomeNotes: text("outcome_notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEightByEightCampaignSchema = createInsertSchema(eightByEightCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEightByEightCampaign = z.infer<typeof insertEightByEightCampaignSchema>;
export type EightByEightCampaign = typeof eightByEightCampaigns.$inferSelect;

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

// Life Event Alerts - tracking life changes that signal real estate needs
export const lifeEventAlerts = pgTable("life_event_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id),
  eventType: text("event_type").notNull(), // e.g., "new_baby", "job_change", "engagement"
  eventCategory: text("event_category").notNull(), // "family", "career", "life_transition", "property"
  confidence: text("confidence"), // "high", "medium", "low"
  sourceUrl: text("source_url"), // Link to the social post
  sourcePlatform: text("source_platform"), // "linkedin", "facebook", "instagram"
  rawContent: text("raw_content"), // The original post/content that triggered this
  summary: text("summary"), // AI-generated summary of what was detected
  suggestedOutreach: text("suggested_outreach"), // AI-generated outreach suggestion
  status: text("status").default("new"), // "new", "reviewed", "actioned", "dismissed"
  actionTaken: text("action_taken"), // Notes on what action was taken
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLifeEventAlertSchema = createInsertSchema(lifeEventAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLifeEventAlert = z.infer<typeof insertLifeEventAlertSchema>;
export type LifeEventAlert = typeof lifeEventAlerts.$inferSelect;

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
  finishedSqft?: number;
  frontage?: number;
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

// Real Estate Reviews (Annual Home Reviews)
export const realEstateReviews = pgTable("real_estate_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  propertyAddress: text("property_address").notNull(),
  neighborhood: text("neighborhood"),
  personId: varchar("person_id").references(() => people.id),
  clientType: text("client_type").default("past_client"),
  outputType: text("output_type").default("digital"),
  status: text("status").default("draft"),
  scheduledDate: timestamp("scheduled_date"),
  gammaLink: text("gamma_link"),
  loomLink: text("loom_link"),
  propertyData: jsonb("property_data"),
  financialData: jsonb("financial_data"),
  components: jsonb("components"),
  publicRecords: jsonb("public_records"),
  visualPricingId: varchar("visual_pricing_id").references(() => pricingReviews.id),
  marketData: jsonb("market_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRealEstateReviewSchema = createInsertSchema(realEstateReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRealEstateReview = z.infer<typeof insertRealEstateReviewSchema>;
export type RealEstateReview = typeof realEstateReviews.$inferSelect;

// Types for the JSONB fields
export type PropertyData = {
  beds?: number;
  baths?: number;
  sqft?: number;
  basement?: string;
  garage?: string;
  condition?: string;
  amenities?: string[];
  yearBuilt?: number;
};

export type FinancialData = {
  mortgageBalance?: number;
  interestRate?: number;
  purchasePrice?: number;
  estimatedValue?: number;
};

export type ComponentItem = {
  name: string;
  installationDate?: string;
  expectedLifespan?: number;
  estimatedReplacementCost?: number;
};

export type PublicRecordsData = {
  taxId?: string;
  assessedValueHistory?: { year: number; value: number }[];
  ownerOfRecord?: string;
  zoning?: string;
  lotSize?: string;
};

export type MarketDataSnapshot = {
  localTwoYearSnapshot?: string;
  countyStats?: string;
  regionalStats?: string;
  nationalStats?: string;
  notes?: string;
};

// Relations for Real Estate Reviews
export const realEstateReviewsRelations = relations(realEstateReviews, ({ one }) => ({
  person: one(people, {
    fields: [realEstateReviews.personId],
    references: [people.id],
  }),
  visualPricing: one(pricingReviews, {
    fields: [realEstateReviews.visualPricingId],
    references: [pricingReviews.id],
  }),
}));

/** Interactions - Unified log of calls, meetings, texts, emails. Stores transcripts for AI processing. */
export const interactions = pgTable("interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id),
  type: text("type").notNull(), // call, meeting, text, email, note
  source: text("source"), // fathom, granola, plaud, manual, phone, email
  title: text("title"),
  summary: text("summary"),
  transcript: text("transcript"),
  externalLink: text("external_link"), // Fathom link, etc.
  externalId: text("external_id"), // ID from external system for deduplication
  duration: integer("duration"), // minutes
  occurredAt: timestamp("occurred_at").notNull(),
  participants: text("participants").array(), // names of other people in the conversation
  tags: text("tags").array(),
  aiExtractedData: jsonb("ai_extracted_data"), // FORD notes, action items, etc.
  coachingAnalysis: jsonb("coaching_analysis"), // AI coaching feedback on conversation quality
  deletedAt: timestamp("deleted_at"), // soft delete - null means not deleted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("interactions_person_id_idx").on(table.personId),
  index("interactions_occurred_at_idx").on(table.occurredAt),
  index("interactions_type_idx").on(table.type),
]);

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Interaction = typeof interactions.$inferSelect;

// Relations for Interactions
export const interactionsRelations = relations(interactions, ({ one }) => ({
  person: one(people, {
    fields: [interactions.personId],
    references: [people.id],
  }),
}));

// AI Assistant Conversations - stores full message history as JSONB
export const aiConversations = pgTable("ai_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  messages: jsonb("messages").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
export type AiConversation = typeof aiConversations.$inferSelect;

/** Generated Drafts - AI-generated emails and handwritten notes using user's voice profile. */
export const generatedDrafts = pgTable("generated_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id),
  interactionId: varchar("interaction_id").references(() => interactions.id),
  type: text("type").notNull(), // email, handwritten_note, task, referral_intro
  title: text("title"),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, dismissed
  metadata: jsonb("metadata"), // Additional context (email subject, recipient, etc.)
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGeneratedDraftSchema = createInsertSchema(generatedDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGeneratedDraft = z.infer<typeof insertGeneratedDraftSchema>;
export type GeneratedDraft = typeof generatedDrafts.$inferSelect;

// Relations for Generated Drafts
export const generatedDraftsRelations = relations(generatedDrafts, ({ one }) => ({
  person: one(people, {
    fields: [generatedDrafts.personId],
    references: [people.id],
  }),
  interaction: one(interactions, {
    fields: [generatedDrafts.interactionId],
    references: [interactions.id],
  }),
}));

// Voice Profile - Stores learned communication patterns from Nathan's conversations
export const voiceProfile = pgTable("voice_profile", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // greetings, signoffs, phrases, tone_notes, expressions
  value: text("value").notNull(), // The actual phrase or pattern
  context: text("context"), // Where this was observed (email, phone call, meeting)
  frequency: integer("frequency").default(1), // How often this pattern appears
  source: text("source"), // Which interaction(s) this came from
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVoiceProfileSchema = createInsertSchema(voiceProfile).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVoiceProfile = z.infer<typeof insertVoiceProfileSchema>;
export type VoiceProfile = typeof voiceProfile.$inferSelect;

/** Listening Analysis - NVC + Question-Based Selling analysis of conversations. */
export const listeningAnalysis = pgTable("listening_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  interactionId: varchar("interaction_id").references(() => interactions.id),
  // Observation vs Interpretation (NVC lens)
  observationCount: integer("observation_count").default(0),
  interpretationCount: integer("interpretation_count").default(0),
  observationExamples: text("observation_examples").array(),
  interpretationExamples: text("interpretation_examples").array(),
  // Feeling Acknowledgment (NVC lens)
  feelingAcknowledgments: integer("feeling_acknowledgments").default(0),
  feelingExamples: text("feeling_examples").array(),
  emotionBeforeSolution: boolean("emotion_before_solution"),
  // Need Clarification (NVC lens)
  needClarifications: integer("need_clarifications").default(0),
  needExamples: text("need_examples").array(),
  assumedNeeds: integer("assumed_needs").default(0),
  // Request Shaping (NVC lens)
  requestConfirmations: integer("request_confirmations").default(0),
  requestExamples: text("request_examples").array(),
  // Question Classification
  exploratoryQuestions: integer("exploratory_questions").default(0),
  clarifyingQuestions: integer("clarifying_questions").default(0),
  feelingQuestions: integer("feeling_questions").default(0),
  needQuestions: integer("need_questions").default(0),
  solutionLeadingQuestions: integer("solution_leading_questions").default(0),
  closedQuestions: integer("closed_questions").default(0),
  questionExamples: jsonb("question_examples"), // { type: question }[]
  // Overall quality metrics
  conversationDepthScore: integer("conversation_depth_score"), // 1-10
  trustBuildingScore: integer("trust_building_score"), // 1-10
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertListeningAnalysisSchema = createInsertSchema(listeningAnalysis).omit({
  id: true,
  createdAt: true,
});

export type InsertListeningAnalysis = z.infer<typeof insertListeningAnalysisSchema>;
export type ListeningAnalysis = typeof listeningAnalysis.$inferSelect;

// Relations for Listening Analysis
export const listeningAnalysisRelations = relations(listeningAnalysis, ({ one }) => ({
  interaction: one(interactions, {
    fields: [listeningAnalysis.interactionId],
    references: [interactions.id],
  }),
}));

/** Coaching Insights - Pattern-based coaching suggestions derived from listening analysis. */
export const coachingInsights = pgTable("coaching_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // micro_shift, question_swap, pattern_observation
  category: text("category"), // emotional_pacing, curiosity, need_clarification, etc.
  insight: text("insight").notNull(), // The coaching suggestion
  originalBehavior: text("original_behavior"), // What the user did
  suggestedBehavior: text("suggested_behavior"), // What they could try
  supportingExamples: text("supporting_examples").array(), // Conversation excerpts
  interactionIds: text("interaction_ids").array(), // Which conversations informed this
  confidenceScore: integer("confidence_score"), // How confident in this pattern (1-100)
  status: text("status").notNull().default("active"), // active, dismissed, applied
  userFeedback: text("user_feedback"), // accurate, not_right, tell_me_more
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCoachingInsightSchema = createInsertSchema(coachingInsights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCoachingInsight = z.infer<typeof insertCoachingInsightSchema>;
export type CoachingInsight = typeof coachingInsights.$inferSelect;

/** Listening Patterns - Aggregate patterns across all conversations for trend analysis. */
export const listeningPatterns = pgTable("listening_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternType: text("pattern_type").notNull(), // observation_vs_interpretation, feeling_acknowledgment, etc.
  description: text("description").notNull(),
  frequency: integer("frequency").default(1),
  trend: text("trend"), // improving, stable, declining
  lastObserved: timestamp("last_observed"),
  examples: text("examples").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertListeningPatternSchema = createInsertSchema(listeningPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertListeningPattern = z.infer<typeof insertListeningPatternSchema>;
export type ListeningPattern = typeof listeningPatterns.$inferSelect;

/** Sync Logs - Tracks incoming data from local sync agents (Granola, Plaud, iMessage, WhatsApp). */
export const syncLogs = pgTable("sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(), // granola, plaud, imessage, whatsapp
  syncType: text("sync_type").notNull(), // full, incremental, single
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  itemsReceived: integer("items_received").default(0),
  itemsProcessed: integer("items_processed").default(0),
  itemsFailed: integer("items_failed").default(0),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Any additional sync metadata
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertSyncLogSchema = createInsertSchema(syncLogs).omit({
  id: true,
  startedAt: true,
});

export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;

/** Handwritten Note Uploads - Scanned notes for voice profile learning. */
export const handwrittenNoteUploads = pgTable("handwritten_note_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(),
  ocrText: text("ocr_text"),
  recipientName: text("recipient_name"), // First name extracted by OCR
  personId: varchar("person_id").references(() => people.id),
  status: text("status").notNull().default("pending_ocr"), // pending_ocr, pending_tag, complete
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertHandwrittenNoteUploadSchema = createInsertSchema(handwrittenNoteUploads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHandwrittenNoteUpload = z.infer<typeof insertHandwrittenNoteUploadSchema>;
export type HandwrittenNoteUpload = typeof handwrittenNoteUploads.$inferSelect;

// Relations for Handwritten Note Uploads
export const handwrittenNoteUploadsRelations = relations(handwrittenNoteUploads, ({ one }) => ({
  person: one(people, {
    fields: [handwrittenNoteUploads.personId],
    references: [people.id],
  }),
}));

// AI Extracted Data structure for type safety
export type AIExtractedData = {
  fordUpdates?: {
    family?: string;
    occupation?: string;
    recreation?: string;
    dreams?: string;
  };
  needs?: string[]; // Things this person is looking for
  offers?: string[]; // Services/skills this person provides
  actionItems?: string[]; // Tasks that came out of the conversation
  keyTopics?: string[]; // Main topics discussed
  sentiment?: "positive" | "neutral" | "negative";
  nextSteps?: string;
  referralOpportunities?: string[]; // Potential connections to make
  buyerCriteria?: {
    priceRange?: { min?: number; max?: number };
    beds?: number;
    baths?: number;
    areas?: string[];
    propertyTypes?: string[];
    mustHaves?: string[];
  };
  processingStatus?: "pending" | "completed" | "failed";
  processedAt?: string;
};

/** Content Topics - Recurring themes/pain points mined from conversations. */
export const contentTopics = pgTable("content_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // inspection, financing, negotiation, closing, etc.
  mentionCount: integer("mention_count").default(1).notNull(),
  lastMentionedAt: timestamp("last_mentioned_at").defaultNow(),
  status: text("status").default("active"), // active, archived, content_created
  sampleQuotes: text("sample_quotes").array(), // Example quotes from conversations
  relatedInteractionIds: text("related_interaction_ids").array(), // IDs of conversations mentioning this
  aiSuggestions: jsonb("ai_suggestions").$type<{
    blogPostIdeas?: string[];
    videoTopics?: string[];
    emailTemplates?: string[];
    socialPosts?: string[];
    faqQuestions?: string[];
  }>(),
  knowledgeLevel: text("knowledge_level"), // null, 'expert', 'learning', 'need_process'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContentTopicSchema = createInsertSchema(contentTopics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContentTopic = z.infer<typeof insertContentTopicSchema>;
export type ContentTopic = typeof contentTopics.$inferSelect;

/** Content Ideas - Specific content pieces to create, tied to topics. */
export const contentIdeas = pgTable("content_ideas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id").references(() => contentTopics.id),
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type").notNull(), // blog, video_short, video_long, podcast, email_newsletter, social, faq
  status: text("status").default("idea"), // idea, outlined, drafted, published, archived
  outline: text("outline"),
  draft: text("draft"),
  finalContent: text("final_content"),
  publishedUrl: text("published_url"),
  publishedAt: timestamp("published_at"),
  priority: integer("priority").default(0), // Higher = more urgent
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContentIdeaSchema = createInsertSchema(contentIdeas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContentIdea = z.infer<typeof insertContentIdeaSchema>;
export type ContentIdea = typeof contentIdeas.$inferSelect;

/** Content Calendar - Scheduled content for publishing. */
export const contentCalendar = pgTable("content_calendar", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentIdeaId: varchar("content_idea_id").references(() => contentIdeas.id),
  title: text("title").notNull(),
  contentType: text("content_type").notNull(), // blog, video_short, video_long, podcast, email_newsletter, social
  channel: text("channel"), // youtube, instagram, linkedin, email, website
  scheduledDate: timestamp("scheduled_date"),
  status: text("status").default("planned"), // planned, in_progress, ready, published
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContentCalendarSchema = createInsertSchema(contentCalendar).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContentCalendar = z.infer<typeof insertContentCalendarSchema>;
export type ContentCalendarItem = typeof contentCalendar.$inferSelect;

// Relations for Content Intelligence
export const contentTopicsRelations = relations(contentTopics, ({ many }) => ({
  ideas: many(contentIdeas),
}));

export const contentIdeasRelations = relations(contentIdeas, ({ one, many }) => ({
  topic: one(contentTopics, {
    fields: [contentIdeas.topicId],
    references: [contentTopics.id],
  }),
  calendarItems: many(contentCalendar),
}));

export const contentCalendarRelations = relations(contentCalendar, ({ one }) => ({
  contentIdea: one(contentIdeas, {
    fields: [contentCalendar.contentIdeaId],
    references: [contentIdeas.id],
  }),
}));

/** Dashboard Widgets - User's customizable dashboard widget layout. */
export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  widgetType: text("widget_type").notNull(), // gci_ytd, closed_units, ford_tracker, ai_status, todoist, etc.
  title: text("title").notNull(),
  position: integer("position").notNull().default(0), // Order in the grid
  gridColumn: integer("grid_column").default(1), // Column span (1 or 2)
  gridRow: integer("grid_row").default(1), // Row span
  isVisible: boolean("is_visible").default(true),
  config: jsonb("config").$type<Record<string, unknown>>(), // Widget-specific settings
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDashboardWidgetSchema = createInsertSchema(dashboardWidgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDashboardWidget = z.infer<typeof insertDashboardWidgetSchema>;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;

/** Lead Sources - Where leads originate from. */
export const LeadSource = {
  WEBSITE: 'website',
  REFERRAL: 'referral',
  OPEN_HOUSE: 'open_house',
  COLD_CALL: 'cold_call',
  SOCIAL_MEDIA: 'social_media',
  ZILLOW: 'zillow',
  REALTOR_COM: 'realtor_com',
  SPHERE: 'sphere',
  SIGN_CALL: 'sign_call',
  MANUAL: 'manual',
  OTHER: 'other',
} as const;

export type LeadSourceType = typeof LeadSource[keyof typeof LeadSource];

/** Lead Status - Lifecycle stages for leads. */
export const LeadStatus = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  NURTURING: 'nurturing',
  CONVERTED: 'converted',
  LOST: 'lost',
  DUPLICATE: 'duplicate',
} as const;

export type LeadStatusType = typeof LeadStatus[keyof typeof LeadStatus];

/** Leads - Top-of-funnel lead tracking before conversion to contacts. */
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  source: text("source").notNull().default('manual'),
  sourceDetails: text("source_details"),
  status: text("status").notNull().default('new'),
  qualificationScore: integer("qualification_score").default(0),
  notes: text("notes"),
  interestedIn: text("interested_in"),
  budget: text("budget"),
  timeline: text("timeline"),
  areas: text("areas").array(),
  personId: varchar("person_id").references(() => people.id),
  assignedTo: text("assigned_to"),
  firstContactAt: timestamp("first_contact_at"),
  lastContactAt: timestamp("last_contact_at"),
  convertedAt: timestamp("converted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("leads_status_idx").on(table.status),
  index("leads_source_idx").on(table.source),
  index("leads_created_at_idx").on(table.createdAt),
]);

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

/** Dormant Opportunity Status - Lifecycle for revival opportunities. */
export const DormantOpportunityStatus = {
  PENDING: 'pending',       // Awaiting user review
  APPROVED: 'approved',     // User approved, ready for campaign
  DISMISSED: 'dismissed',   // User dismissed this opportunity
  IN_CAMPAIGN: 'in_campaign', // Currently in active outreach campaign
  CONVERTED: 'converted',   // Successfully re-engaged
  EXPIRED: 'expired',       // Too old, no longer relevant
} as const;

export type DormantOpportunityStatusType = typeof DormantOpportunityStatus[keyof typeof DormantOpportunityStatus];

/** Dormant Opportunities - Old leads/contacts identified for revival. */
export const dormantOpportunities = pgTable("dormant_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id),
  leadId: varchar("lead_id").references(() => leads.id),
  status: text("status").notNull().default('pending'),
  dormancyScore: integer("dormancy_score").default(0), // Higher = more promising
  daysSinceContact: integer("days_since_contact"),
  leadSource: text("lead_source"), // 'open_house', 'buyer_inquiry', 'seller_inquiry', etc.
  lastEmailDate: timestamp("last_email_date"),
  lastEmailSubject: text("last_email_subject"),
  emailThreadCount: integer("email_thread_count").default(0),
  discoveredVia: text("discovered_via").notNull(), // 'gmail_scan', 'contact_analysis', 'imessage_sync'
  revivalReason: text("revival_reason"), // AI-generated explanation of why worth reviving
  suggestedApproach: text("suggested_approach"), // AI-suggested first message/campaign type
  campaignId: varchar("campaign_id"), // Link to email campaign if started
  reviewedAt: timestamp("reviewed_at"),
  dismissedReason: text("dismissed_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("dormant_opportunities_status_idx").on(table.status),
  index("dormant_opportunities_score_idx").on(table.dormancyScore),
  index("dormant_opportunities_person_idx").on(table.personId),
]);

export const insertDormantOpportunitySchema = createInsertSchema(dormantOpportunities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDormantOpportunity = z.infer<typeof insertDormantOpportunitySchema>;
export type DormantOpportunity = typeof dormantOpportunities.$inferSelect;

/** Event Types - Central orchestration event type definitions. */
export const EventCategory = {
  LEAD: 'lead',
  RELATIONSHIP: 'relationship',
  TRANSACTION: 'transaction',
  COMMUNICATION: 'communication',
  INTELLIGENCE: 'intelligence',
} as const;

export const EventType = {
  // Lead Events
  LEAD_CREATED: 'lead.created',
  LEAD_ENRICHED: 'lead.enriched',
  LEAD_QUALIFIED: 'lead.qualified',
  LEAD_ASSIGNED: 'lead.assigned',
  // Relationship Events
  CONTACT_DUE: 'contact.due',
  CONTACT_MADE: 'contact.made',
  FORD_UPDATED: 'ford.updated',
  SEGMENT_CHANGED: 'segment.changed',
  // Transaction Events
  DEAL_CREATED: 'deal.created',
  DEAL_STAGE_CHANGED: 'deal.stage_changed',
  DEADLINE_APPROACHING: 'deadline.approaching',
  CONTRACT_RATIFIED: 'contract.ratified',
  DEAL_CLOSED: 'deal.closed',
  // Communication Events
  TRANSCRIPT_READY: 'transcript.ready',
  EMAIL_RECEIVED: 'email.received',
  SMS_RECEIVED: 'sms.received',
  MEETING_SCHEDULED: 'meeting.scheduled',
  // Intelligence Events
  LIFE_EVENT_DETECTED: 'life_event.detected',
  COACHING_INSIGHT: 'coaching.insight',
  DRAFT_GENERATED: 'draft.generated',
  ANNIVERSARY_APPROACHING: 'anniversary.approaching',
  RELATIONSHIP_SCORE_CHANGED: 'relationship.score_changed',
  // Revival Events
  DORMANT_OPPORTUNITY_DETECTED: 'dormant.opportunity_detected',
  REVIVAL_CAMPAIGN_STARTED: 'revival.campaign_started',
  REVIVAL_RESPONSE_RECEIVED: 'revival.response_received',
} as const;

export type EventCategoryType = typeof EventCategory[keyof typeof EventCategory];
export type EventTypeValue = typeof EventType[keyof typeof EventType];

/** System Events - Central event log for orchestration layer. */
export const systemEvents = pgTable("system_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // e.g., 'lead.created', 'deal.stage_changed'
  eventCategory: text("event_category").notNull(), // 'lead', 'relationship', 'transaction', 'communication', 'intelligence'
  personId: varchar("person_id").references(() => people.id),
  dealId: varchar("deal_id").references(() => deals.id),
  sourceEntity: text("source_entity"), // 'interaction', 'deal', 'person', 'life_event_alert', etc.
  sourceEntityId: varchar("source_entity_id"), // ID of the entity that triggered this event
  payload: jsonb("payload").$type<Record<string, unknown>>(), // Event-specific data
  metadata: jsonb("metadata").$type<{
    triggeredBy?: string; // 'user', 'system', 'agent', 'webhook'
    agentName?: string; // Which agent (if any) triggered this
    sourceAction?: string; // What action created this event
  }>(),
  processedAt: timestamp("processed_at"), // When agents finished processing
  processedBy: text("processed_by").array(), // Which agents processed this event
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSystemEventSchema = createInsertSchema(systemEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertSystemEvent = z.infer<typeof insertSystemEventSchema>;
export type SystemEvent = typeof systemEvents.$inferSelect;

/** Agent Names - Named agents in the orchestration layer. */
export const AgentName = {
  LEAD_INTAKE: 'LeadIntakeAgent',
  NURTURE: 'NurtureAgent',
  OPS_TRANSACTION: 'OpsTransactionAgent',
  DATA_CONTEXT: 'DataContextAgent',
  MARKETING: 'MarketingAgent',
  LIFE_EVENT: 'LifeEventAgent',
  WORKFLOW_COACH: 'WorkflowCoachAgent',
} as const;

export type AgentNameType = typeof AgentName[keyof typeof AgentName];

/** Agent Action Status - Tracks proposed and executed agent actions. */
export const AgentActionStatus = {
  PROPOSED: 'proposed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXECUTED: 'executed',
  FAILED: 'failed',
} as const;

export type AgentActionStatusType = typeof AgentActionStatus[keyof typeof AgentActionStatus];

/** Agent Actions - Actions proposed or taken by agents (with approval workflow). */
export const agentActions = pgTable("agent_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => systemEvents.id), // The event that triggered this action
  agentName: text("agent_name").notNull(), // Which agent proposed this action
  actionType: text("action_type").notNull(), // 'send_email', 'create_task', 'update_record', etc.
  riskLevel: text("risk_level").notNull().default('low'), // 'low', 'medium', 'high'
  status: text("status").notNull().default('proposed'), // 'proposed', 'approved', 'rejected', 'executed', 'failed'
  personId: varchar("person_id").references(() => people.id),
  dealId: varchar("deal_id").references(() => deals.id),
  targetEntity: text("target_entity"), // 'email', 'task', 'sms', 'deal', 'person'
  targetEntityId: varchar("target_entity_id"), // ID of created/modified entity after execution
  proposedContent: jsonb("proposed_content").$type<Record<string, unknown>>(), // The action details
  reasoning: text("reasoning"), // Agent's explanation for why this action
  approvedBy: text("approved_by"), // 'user' or 'auto' (for low-risk actions)
  approvedAt: timestamp("approved_at"),
  executedAt: timestamp("executed_at"),
  errorMessage: text("error_message"), // If execution failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgentActionSchema = createInsertSchema(agentActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgentAction = z.infer<typeof insertAgentActionSchema>;
export type AgentAction = typeof agentActions.$inferSelect;

/** Agent Subscriptions - Which agents subscribe to which event types. */
export const agentSubscriptions = pgTable("agent_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentName: text("agent_name").notNull(),
  eventType: text("event_type").notNull(), // The event type this agent subscribes to
  priority: integer("priority").default(0), // Higher priority agents process first
  isActive: boolean("is_active").default(true),
  config: jsonb("config").$type<Record<string, unknown>>(), // Agent-specific config for this event
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgentSubscriptionSchema = createInsertSchema(agentSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertAgentSubscription = z.infer<typeof insertAgentSubscriptionSchema>;
export type AgentSubscription = typeof agentSubscriptions.$inferSelect;

// Relations for Event System
export const systemEventsRelations = relations(systemEvents, ({ one, many }) => ({
  person: one(people, {
    fields: [systemEvents.personId],
    references: [people.id],
  }),
  deal: one(deals, {
    fields: [systemEvents.dealId],
    references: [deals.id],
  }),
  actions: many(agentActions),
}));

export const agentActionsRelations = relations(agentActions, ({ one }) => ({
  event: one(systemEvents, {
    fields: [agentActions.eventId],
    references: [systemEvents.id],
  }),
  person: one(people, {
    fields: [agentActions.personId],
    references: [people.id],
  }),
  deal: one(deals, {
    fields: [agentActions.dealId],
    references: [deals.id],
  }),
}));

/** Observer Suggestion Types */
export const ObserverSuggestionIntent = {
  DELEGATE: 'delegate',
  AUTOMATE: 'automate',
  SHORTCUT: 'shortcut',
  INSIGHT: 'insight',
} as const;

export type ObserverSuggestionIntentType = typeof ObserverSuggestionIntent[keyof typeof ObserverSuggestionIntent];

export const ObserverSuggestionStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  SNOOZED: 'snoozed',
  DISMISSED: 'dismissed',
  EXPIRED: 'expired',
} as const;

export type ObserverSuggestionStatusType = typeof ObserverSuggestionStatus[keyof typeof ObserverSuggestionStatus];

/** Observer Suggestions - Proactive suggestions from the AI observer */
export const observerSuggestions = pgTable("observer_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentName: text("agent_name").notNull(),
  intent: text("intent").notNull(), // 'delegate', 'automate', 'shortcut', 'insight'
  status: text("status").notNull().default('pending'),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reasoning: text("reasoning"), // "Because..." explanation for transparency (Heuristic 4)
  evidence: jsonb("evidence").$type<{ type: string; summary: string; date?: string }[]>(), // Supporting evidence snippets
  confidence: integer("confidence").notNull().default(50), // 0-100 confidence score
  contextRoute: text("context_route"), // The route where this suggestion was generated
  contextEntityType: text("context_entity_type"), // 'person', 'lead', 'deal', etc.
  contextEntityId: varchar("context_entity_id"),
  personId: varchar("person_id").references(() => people.id),
  dealId: varchar("deal_id").references(() => deals.id),
  leadId: varchar("lead_id").references(() => leads.id),
  actionPayload: jsonb("action_payload").$type<Record<string, unknown>>(), // Data needed to execute
  patternId: text("pattern_id"), // Identifies recurring patterns for learning
  snoozeUntil: timestamp("snooze_until"),
  acceptedAt: timestamp("accepted_at"),
  dismissedAt: timestamp("dismissed_at"),
  feedbackNote: text("feedback_note"), // User's feedback when teaching
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // When the suggestion becomes irrelevant
});

export const insertObserverSuggestionSchema = createInsertSchema(observerSuggestions).omit({
  id: true,
  createdAt: true,
});

export type InsertObserverSuggestion = z.infer<typeof insertObserverSuggestionSchema>;
export type ObserverSuggestion = typeof observerSuggestions.$inferSelect;

/** Observer Patterns - Learned patterns from user behavior */
export const observerPatterns = pgTable("observer_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternType: text("pattern_type").notNull(), // 'action_sequence', 'timing', 'preference'
  description: text("description").notNull(),
  triggerConditions: jsonb("trigger_conditions").$type<Record<string, unknown>>().notNull(),
  suggestedAction: jsonb("suggested_action").$type<Record<string, unknown>>().notNull(),
  occurrenceCount: integer("occurrence_count").default(1),
  lastTriggeredAt: timestamp("last_triggered_at"),
  isEnabled: boolean("is_enabled").default(true),
  userFeedbackScore: integer("user_feedback_score").default(0), // Positive = helpful, negative = annoying
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertObserverPatternSchema = createInsertSchema(observerPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertObserverPattern = z.infer<typeof insertObserverPatternSchema>;
export type ObserverPattern = typeof observerPatterns.$inferSelect;

export const observerSuggestionsRelations = relations(observerSuggestions, ({ one }) => ({
  person: one(people, {
    fields: [observerSuggestions.personId],
    references: [people.id],
  }),
  deal: one(deals, {
    fields: [observerSuggestions.dealId],
    references: [deals.id],
  }),
  lead: one(leads, {
    fields: [observerSuggestions.leadId],
    references: [leads.id],
  }),
}));

/** CRM Integrations - Configuration for external CRM connections */
export const crmIntegrations = pgTable("crm_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(), // 'cloze', 'follow_up_boss', 'liondesk', 'zapier', etc.
  displayName: text("display_name").notNull(),
  isActive: boolean("is_active").default(false),
  isPrimary: boolean("is_primary").default(false), // Only one can be primary
  config: jsonb("config").$type<{
    apiKey?: string;
    apiUrl?: string;
    webhookUrl?: string;
    systemKey?: string; // For Follow Up Boss
    refreshToken?: string; // For OAuth-based integrations
    accessToken?: string;
    tokenExpiresAt?: string;
    customFields?: Record<string, string>; // Map Flow OS fields to CRM fields
  }>(),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"), // 'success', 'failed', 'partial'
  lastSyncError: text("last_sync_error"),
  syncContactsEnabled: boolean("sync_contacts_enabled").default(true),
  syncNotesEnabled: boolean("sync_notes_enabled").default(true),
  syncTasksEnabled: boolean("sync_tasks_enabled").default(true),
  syncDealsEnabled: boolean("sync_deals_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCrmIntegrationSchema = createInsertSchema(crmIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCrmIntegration = z.infer<typeof insertCrmIntegrationSchema>;
export type CrmIntegration = typeof crmIntegrations.$inferSelect;

/** CRM Sync Queue - Queue for outbound sync operations */
export const crmSyncQueue = pgTable("crm_sync_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationId: varchar("integration_id").references(() => crmIntegrations.id).notNull(),
  entityType: text("entity_type").notNull(), // 'contact', 'note', 'task', 'interaction'
  entityId: varchar("entity_id").notNull(), // ID of the local entity
  operation: text("operation").notNull(), // 'create', 'update', 'delete'
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed', 'retry'
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  lastError: text("last_error"),
  externalId: varchar("external_id"), // ID returned from CRM after successful sync
  scheduledFor: timestamp("scheduled_for").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCrmSyncQueueSchema = createInsertSchema(crmSyncQueue).omit({
  id: true,
  createdAt: true,
});

export type InsertCrmSyncQueue = z.infer<typeof insertCrmSyncQueueSchema>;
export type CrmSyncQueue = typeof crmSyncQueue.$inferSelect;

/** CRM Field Mappings - External ID mappings for synced entities */
export const crmFieldMappings = pgTable("crm_field_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationId: varchar("integration_id").references(() => crmIntegrations.id).notNull(),
  localEntityType: text("local_entity_type").notNull(), // 'person', 'interaction', 'task', 'deal'
  localEntityId: varchar("local_entity_id").notNull(),
  externalId: varchar("external_id").notNull(), // ID in the external CRM
  externalData: jsonb("external_data").$type<Record<string, unknown>>(), // Cache of external fields
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCrmFieldMappingSchema = createInsertSchema(crmFieldMappings).omit({
  id: true,
  createdAt: true,
});

export type InsertCrmFieldMapping = z.infer<typeof insertCrmFieldMappingSchema>;
export type CrmFieldMapping = typeof crmFieldMappings.$inferSelect;

/** Capture Tool Integrations - Plaud, Granola, Beeper, Fathom configs */
export const captureIntegrations = pgTable("capture_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(), // 'plaud', 'granola', 'beeper', 'fathom', 'gmail', 'google_calendar'
  displayName: text("display_name").notNull(),
  isActive: boolean("is_active").default(false),
  config: jsonb("config").$type<{
    apiKey?: string;
    webhookUrl?: string; // For receiving data from Zapier
    webhookSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: string;
    beeperDesktopPort?: number; // For Beeper Desktop API
    granolaFolder?: string; // Specific Granola folder to watch
  }>(),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"),
  lastSyncError: text("last_sync_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCaptureIntegrationSchema = createInsertSchema(captureIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCaptureIntegration = z.infer<typeof insertCaptureIntegrationSchema>;
export type CaptureIntegration = typeof captureIntegrations.$inferSelect;

// Webhook payload validation schemas
export const granolaWebhookSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(255),
  notes: z.string().optional(),
  transcript: z.string().optional(),
  enhanced_notes: z.string().optional(),
  date: z.string().datetime().optional(),
  attendees: z.array(z.string()).optional(),
}).strict();

export const plaudWebhookSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(255),
  transcript: z.string().optional(),
  summary: z.string().optional(),
  duration: z.number().min(0).optional(),
  date: z.string().datetime().optional(),
  participants: z.array(z.string()).optional(),
  recording_url: z.string().url().optional(),
}).strict();

export const captureWebhookSchema = z.object({
  source: z.string().min(1).max(50),
  type: z.enum(['call', 'meeting', 'note', 'email', 'text']).optional(),
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  transcript: z.string().optional(),
  date: z.string().datetime().optional(),
  duration: z.number().min(0).optional(),
  participants: z.array(z.string()).optional(),
  external_id: z.string().optional(),
  external_url: z.string().url().optional(),
}).strict();

// CRM Sync Queue Relations
export const crmSyncQueueRelations = relations(crmSyncQueue, ({ one }) => ({
  integration: one(crmIntegrations, {
    fields: [crmSyncQueue.integrationId],
    references: [crmIntegrations.id],
  }),
}));

export const crmFieldMappingsRelations = relations(crmFieldMappings, ({ one }) => ({
  integration: one(crmIntegrations, {
    fields: [crmFieldMappings.integrationId],
    references: [crmIntegrations.id],
  }),
}));

/** Beta Users - Tracks beta program participants */
export const betaUsers = pgTable("beta_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  brokerage: text("brokerage"),
  isNinjaCertified: boolean("is_ninja_certified").default(false),
  status: text("status").default("pending"), // pending, active, churned
  onboardedAt: timestamp("onboarded_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBetaUserSchema = createInsertSchema(betaUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBetaUser = z.infer<typeof insertBetaUserSchema>;
export type BetaUser = typeof betaUsers.$inferSelect;

/** Beta Intake - Captures tool preferences from intake form */
export const betaIntake = pgTable("beta_intake", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  betaUserId: varchar("beta_user_id").notNull().unique().references(() => betaUsers.id),
  meetingTools: text("meeting_tools").array(), // fathom, otter, fireflies, zoom, meet, teams, granola
  callTools: text("call_tools").array(), // ringcentral, callrail, dialpad, fub_dialer, plaud
  messagingTools: text("messaging_tools").array(), // imessage, whatsapp, messenger, instagram_dm, sms
  emailTools: text("email_tools").array(), // gmail, outlook
  crmTools: text("crm_tools").array(), // follow_up_boss, cloze, kvcore, boomtown, chime
  otherTools: text("other_tools"), // Free text for tools we didn't list
  priorities: text("priorities").array(), // What they most want to capture: meetings, calls, texts, emails
  painPoints: text("pain_points"), // What's not working for them today
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertBetaIntakeSchema = createInsertSchema(betaIntake).omit({
  id: true,
  submittedAt: true,
});

export type InsertBetaIntake = z.infer<typeof insertBetaIntakeSchema>;
export type BetaIntake = typeof betaIntake.$inferSelect;

/** User Connectors - Maps each beta user to their configured capture sources */
export const userConnectors = pgTable("user_connectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  betaUserId: varchar("beta_user_id").notNull().references(() => betaUsers.id),
  provider: text("provider").notNull(), // fathom, plaud, granola, beeper, gmail, etc.
  category: text("category").notNull(), // meeting, call, messaging, email
  status: text("status").default("pending"), // pending, needs_config, connected, error
  config: jsonb("config").$type<{
    apiKey?: string;
    webhookSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: string;
    customSettings?: Record<string, any>;
  }>(),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"),
  lastSyncError: text("last_sync_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserConnectorSchema = createInsertSchema(userConnectors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserConnector = z.infer<typeof insertUserConnectorSchema>;
export type UserConnector = typeof userConnectors.$inferSelect;

/** Beta User Relations */
export const betaUsersRelations = relations(betaUsers, ({ one, many }) => ({
  intake: one(betaIntake, {
    fields: [betaUsers.id],
    references: [betaIntake.betaUserId],
  }),
  connectors: many(userConnectors),
}));

export const betaIntakeRelations = relations(betaIntake, ({ one }) => ({
  betaUser: one(betaUsers, {
    fields: [betaIntake.betaUserId],
    references: [betaUsers.id],
  }),
}));

export const userConnectorsRelations = relations(userConnectors, ({ one }) => ({
  betaUser: one(betaUsers, {
    fields: [userConnectors.betaUserId],
    references: [betaUsers.id],
  }),
}));

/** AI Actions - Audit trail for AI proposals and verifier results (Verify → Automate pattern) */
export const aiActions = pgTable("ai_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionType: text("action_type").notNull(), // create_task, log_interaction, generate_summary, etc.
  proposedBy: text("proposed_by").notNull().default("ai"), // ai, user, system
  input: jsonb("input"), // The input that was proposed
  verifierName: text("verifier_name"), // Which verifier was used
  verifierPassed: boolean("verifier_passed"),
  verifierErrors: text("verifier_errors").array(),
  verifierWarnings: text("verifier_warnings").array(),
  verifierScore: integer("verifier_score"), // 0-100 confidence
  outcome: text("outcome"), // executed, rejected, escalated, modified
  resultData: jsonb("result_data"), // What was actually created/modified
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ai_actions_type_idx").on(table.actionType),
  index("ai_actions_outcome_idx").on(table.outcome),
  index("ai_actions_created_idx").on(table.createdAt),
]);

export const insertAiActionSchema = createInsertSchema(aiActions).omit({
  id: true,
  createdAt: true,
});

export type InsertAiAction = z.infer<typeof insertAiActionSchema>;
export type AiAction = typeof aiActions.$inferSelect;

/** Saved Content - Articles, posts, links saved for later reading and daily digest */
export const savedContent = pgTable("saved_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  title: text("title"),
  author: text("author"),
  siteName: text("site_name"),
  content: text("content"), // Extracted article text
  summary: text("summary"), // AI-generated summary
  keyPoints: text("key_points").array(), // AI-extracted key takeaways
  tags: text("tags").array(), // Auto-generated or user-added tags
  imageUrl: text("image_url"), // Featured image
  status: text("status").default("unread"), // unread, read, archived
  readAt: timestamp("read_at"),
  digestIncludedAt: timestamp("digest_included_at"), // When it was included in a digest
  linkedPersonId: varchar("linked_person_id"), // If linked to a contact for sharing
  notes: text("notes"), // User's personal notes
  source: text("source"), // email, extension, manual, share
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("saved_content_status_idx").on(table.status),
  index("saved_content_created_idx").on(table.createdAt),
]);

export const insertSavedContentSchema = createInsertSchema(savedContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedContent = z.infer<typeof insertSavedContentSchema>;
export type SavedContent = typeof savedContent.$inferSelect;

/** Daily Digests - Generated daily summaries of saved content */
export const dailyDigests = pgTable("daily_digests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  digestDate: timestamp("digest_date").notNull(),
  itemCount: integer("item_count").default(0),
  summaryHtml: text("summary_html"), // Rendered digest content
  contentIds: text("content_ids").array(), // IDs of savedContent included
  shareSuggestions: jsonb("share_suggestions").$type<Array<{
    contentId: string;
    personId: string;
    personName: string;
    reason: string;
    score: number;
  }>>(),
  emailSentAt: timestamp("email_sent_at"),
  viewedAt: timestamp("viewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("daily_digests_date_idx").on(table.digestDate),
]);

export const insertDailyDigestSchema = createInsertSchema(dailyDigests).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyDigest = z.infer<typeof insertDailyDigestSchema>;
export type DailyDigest = typeof dailyDigests.$inferSelect;

/** Saved Content Relations */
export const savedContentRelations = relations(savedContent, ({ one }) => ({
  linkedPerson: one(people, {
    fields: [savedContent.linkedPersonId],
    references: [people.id],
  }),
}));

/** User Core Profile - Guiding principles, mission, values for AI Chief of Staff personalization */
export const userCoreProfile = pgTable("user_core_profile", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  betaUserId: varchar("beta_user_id").notNull().unique().references(() => betaUsers.id),
  mtp: text("mtp"), // Master Transformative Purpose
  missionStatement: text("mission_statement"),
  philosophy: text("philosophy"), // Business approach/philosophy
  decisionFramework: text("decision_framework"), // How they make decisions
  coreValues: text("core_values").array(), // Ordered list of core values
  yearsExperience: integer("years_experience"),
  teamStructure: text("team_structure"), // solo, team_lead, team_member, partnership
  annualGoalTransactions: integer("annual_goal_transactions"),
  annualGoalGci: integer("annual_goal_gci"),
  specializations: text("specializations").array(), // luxury, first_time, investment, relocation, commercial
  focusAreas: text("focus_areas").array(), // Geographic focus (neighborhoods, cities)
  familySummary: text("family_summary"), // Personal context for FORD
  hobbies: text("hobbies").array(),
  communityInvolvement: text("community_involvement"),
  intakeCompletedAt: timestamp("intake_completed_at"),
  intakeStep: integer("intake_step").default(0), // Track progress: 0=not started, 1=principles, 2=professional, 3=personal
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserCoreProfileSchema = createInsertSchema(userCoreProfile).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserCoreProfile = z.infer<typeof insertUserCoreProfileSchema>;
export type UserCoreProfile = typeof userCoreProfile.$inferSelect;

/** User Core Profile Relations */
export const userCoreProfileRelations = relations(userCoreProfile, ({ one }) => ({
  betaUser: one(betaUsers, {
    fields: [userCoreProfile.betaUserId],
    references: [betaUsers.id],
  }),
}));

/** Beta Feedback - User feedback submissions for bug reports, ideas, and praise */
export const betaFeedback = pgTable("beta_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // bug, idea, praise
  message: text("message").notNull(),
  page: text("page"), // URL path where feedback was submitted
  userAgent: text("user_agent"),
  status: text("status").notNull().default("new"), // new, reviewed, resolved, archived
  resolution: text("resolution"), // How/if the feedback was addressed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBetaFeedbackSchema = createInsertSchema(betaFeedback).omit({
  id: true,
  createdAt: true,
});

export type InsertBetaFeedback = z.infer<typeof insertBetaFeedbackSchema>;
export type BetaFeedback = typeof betaFeedback.$inferSelect;

/** Social Media Connections - OAuth tokens for Meta/Instagram, Twitter, LinkedIn, etc. */
export const socialConnections = pgTable("social_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform").notNull(), // meta, twitter, linkedin
  accessToken: text("access_token").notNull(),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshToken: text("refresh_token"),
  platformUserId: text("platform_user_id"), // Meta user ID
  platformPageId: text("platform_page_id"), // Facebook Page ID  
  instagramAccountId: text("instagram_account_id"), // Instagram Business Account ID
  accountName: text("account_name"), // Display name for UI
  scopes: text("scopes").array(), // Granted permissions
  metadata: jsonb("metadata"), // Platform-specific data
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSocialConnectionSchema = createInsertSchema(socialConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSocialConnection = z.infer<typeof insertSocialConnectionSchema>;
export type SocialConnection = typeof socialConnections.$inferSelect;

/** Scheduled Social Posts - Posts queued for publishing */
export const socialPosts = pgTable("social_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").references(() => socialConnections.id),
  platform: text("platform").notNull(), // instagram, facebook
  postType: text("post_type").notNull().default("feed"), // feed, story, reel
  content: text("content").notNull(), // Caption/text
  mediaUrls: text("media_urls").array(), // Image/video URLs
  hashtags: text("hashtags").array(),
  status: text("status").notNull().default("draft"), // draft, scheduled, publishing, published, failed
  scheduledFor: timestamp("scheduled_for"),
  publishedAt: timestamp("published_at"),
  platformPostId: text("platform_post_id"), // ID from Meta after publishing
  platformPostUrl: text("platform_post_url"), // Permalink
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSocialPostSchema = createInsertSchema(socialPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type SocialPost = typeof socialPosts.$inferSelect;
