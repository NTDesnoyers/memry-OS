/**
 * Schema module - Drizzle ORM schema definitions and Zod validation types.
 * Shared between frontend and backend for type safety.
 */
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
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
});

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
});

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
