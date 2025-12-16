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

// Deals
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personId: varchar("person_id").references(() => people.id),
  title: text("title").notNull(),
  address: text("address"),
  type: text("type").notNull(),
  stage: text("stage").notNull(),
  value: integer("value"),
  probability: integer("probability"),
  expectedCloseDate: timestamp("expected_close_date"),
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
