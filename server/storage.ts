import { 
  type User, type InsertUser,
  type Person, type InsertPerson,
  type Deal, type InsertDeal,
  type Task, type InsertTask,
  type Meeting, type InsertMeeting,
  type Call, type InsertCall,
  type WeeklyReview, type InsertWeeklyReview,
  type Note, type InsertNote,
  type Listing, type InsertListing,
  type EmailCampaign, type InsertEmailCampaign,
  type PricingReview, type InsertPricingReview,
  type BusinessSettings, type InsertBusinessSettings,
  type PieEntry, type InsertPieEntry,
  type AgentProfile, type InsertAgentProfile,
  type RealEstateReview, type InsertRealEstateReview,
  type Interaction, type InsertInteraction,
  type AiConversation, type InsertAiConversation,
  type Household, type InsertHousehold,
  users, people, deals, tasks, meetings, calls, weeklyReviews, notes, listings, emailCampaigns, pricingReviews, businessSettings, pieEntries, agentProfile, realEstateReviews, interactions, aiConversations, households
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, or, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // People
  getAllPeople(): Promise<Person[]>;
  getPerson(id: string): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(id: string, person: Partial<InsertPerson>): Promise<Person | undefined>;
  deletePerson(id: string): Promise<void>;
  
  // Deals
  getAllDeals(): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: string, deal: Partial<InsertDeal>): Promise<Deal | undefined>;
  deleteDeal(id: string): Promise<void>;
  
  // Tasks
  getAllTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  
  // Meetings
  getAllMeetings(): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: string): Promise<void>;
  
  // Calls
  getAllCalls(): Promise<Call[]>;
  getCall(id: string): Promise<Call | undefined>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: string, call: Partial<InsertCall>): Promise<Call | undefined>;
  deleteCall(id: string): Promise<void>;
  
  // Weekly Reviews
  getAllWeeklyReviews(): Promise<WeeklyReview[]>;
  getWeeklyReview(id: string): Promise<WeeklyReview | undefined>;
  createWeeklyReview(review: InsertWeeklyReview): Promise<WeeklyReview>;
  updateWeeklyReview(id: string, review: Partial<InsertWeeklyReview>): Promise<WeeklyReview | undefined>;
  deleteWeeklyReview(id: string): Promise<void>;
  
  // Notes
  getAllNotes(): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: string): Promise<void>;
  
  // Listings (Haves)
  getAllListings(): Promise<Listing[]>;
  getActiveListings(): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: string, listing: Partial<InsertListing>): Promise<Listing | undefined>;
  deleteListing(id: string): Promise<void>;
  
  // Email Campaigns
  getAllEmailCampaigns(): Promise<EmailCampaign[]>;
  getEmailCampaign(id: string): Promise<EmailCampaign | undefined>;
  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  updateEmailCampaign(id: string, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined>;
  deleteEmailCampaign(id: string): Promise<void>;
  
  // Buyer queries
  getBuyers(): Promise<Person[]>;
  getRealtorsForNewsletter(): Promise<Person[]>;
  
  // Pricing Reviews
  getAllPricingReviews(): Promise<PricingReview[]>;
  getPricingReview(id: string): Promise<PricingReview | undefined>;
  createPricingReview(review: InsertPricingReview): Promise<PricingReview>;
  updatePricingReview(id: string, review: Partial<InsertPricingReview>): Promise<PricingReview | undefined>;
  deletePricingReview(id: string): Promise<void>;
  
  // Business Settings
  getBusinessSettings(year: number): Promise<BusinessSettings | undefined>;
  upsertBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings>;
  
  // PIE Entries
  getAllPieEntries(): Promise<PieEntry[]>;
  getPieEntriesByDateRange(startDate: Date, endDate: Date): Promise<PieEntry[]>;
  createPieEntry(entry: InsertPieEntry): Promise<PieEntry>;
  updatePieEntry(id: string, entry: Partial<InsertPieEntry>): Promise<PieEntry | undefined>;
  deletePieEntry(id: string): Promise<void>;
  
  // Agent Profile
  getAgentProfile(): Promise<AgentProfile | undefined>;
  upsertAgentProfile(profile: InsertAgentProfile): Promise<AgentProfile>;
  
  // Real Estate Reviews
  getAllRealEstateReviews(): Promise<RealEstateReview[]>;
  getRealEstateReviewsByStatus(status: string): Promise<RealEstateReview[]>;
  getRealEstateReview(id: string): Promise<RealEstateReview | undefined>;
  createRealEstateReview(review: InsertRealEstateReview): Promise<RealEstateReview>;
  updateRealEstateReview(id: string, review: Partial<InsertRealEstateReview>): Promise<RealEstateReview | undefined>;
  deleteRealEstateReview(id: string): Promise<void>;
  getTasksByReviewId(reviewId: string): Promise<Task[]>;
  
  // Interactions
  getAllInteractions(): Promise<Interaction[]>;
  getInteractionsByPerson(personId: string): Promise<Interaction[]>;
  getInteraction(id: string): Promise<Interaction | undefined>;
  getInteractionByExternalId(externalId: string): Promise<Interaction | undefined>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  updateInteraction(id: string, interaction: Partial<InsertInteraction>): Promise<Interaction | undefined>;
  deleteInteraction(id: string): Promise<void>;
  
  // AI Conversations
  getAllAiConversations(): Promise<AiConversation[]>;
  getAiConversation(id: string): Promise<AiConversation | undefined>;
  createAiConversation(conversation: InsertAiConversation): Promise<AiConversation>;
  updateAiConversation(id: string, conversation: Partial<InsertAiConversation>): Promise<AiConversation | undefined>;
  deleteAiConversation(id: string): Promise<void>;
  
  // Households
  getAllHouseholds(): Promise<Household[]>;
  getHousehold(id: string): Promise<Household | undefined>;
  createHousehold(household: InsertHousehold): Promise<Household>;
  updateHousehold(id: string, household: Partial<InsertHousehold>): Promise<Household | undefined>;
  deleteHousehold(id: string): Promise<void>;
  getHouseholdMembers(householdId: string): Promise<Person[]>;
  addPersonToHousehold(personId: string, householdId: string): Promise<Person | undefined>;
  removePersonFromHousehold(personId: string): Promise<Person | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // People
  async getAllPeople(): Promise<Person[]> {
    return await db.select().from(people).orderBy(desc(people.createdAt));
  }
  
  async getPerson(id: string): Promise<Person | undefined> {
    const [person] = await db.select().from(people).where(eq(people.id, id));
    return person || undefined;
  }
  
  async createPerson(insertPerson: InsertPerson): Promise<Person> {
    const [person] = await db
      .insert(people)
      .values({ ...insertPerson, updatedAt: new Date() })
      .returning();
    return person;
  }
  
  async updatePerson(id: string, person: Partial<InsertPerson>): Promise<Person | undefined> {
    const [updated] = await db
      .update(people)
      .set({ ...person, updatedAt: new Date() })
      .where(eq(people.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deletePerson(id: string): Promise<void> {
    // Delete related deals first to avoid foreign key constraint
    await db.delete(deals).where(eq(deals.personId, id));
    // Delete the person
    await db.delete(people).where(eq(people.id, id));
  }
  
  // Deals
  async getAllDeals(): Promise<Deal[]> {
    return await db.select().from(deals).orderBy(desc(deals.createdAt));
  }
  
  async getDeal(id: string): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal || undefined;
  }
  
  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    const [deal] = await db
      .insert(deals)
      .values({ ...insertDeal, updatedAt: new Date() })
      .returning();
    return deal;
  }
  
  async updateDeal(id: string, deal: Partial<InsertDeal>): Promise<Deal | undefined> {
    const [updated] = await db
      .update(deals)
      .set({ ...deal, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteDeal(id: string): Promise<void> {
    await db.delete(deals).where(eq(deals.id, id));
  }
  
  // Tasks
  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }
  
  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }
  
  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({ ...insertTask, updatedAt: new Date() })
      .returning();
    return task;
  }
  
  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }
  
  // Meetings
  async getAllMeetings(): Promise<Meeting[]> {
    return await db.select().from(meetings).orderBy(desc(meetings.createdAt));
  }
  
  async getMeeting(id: string): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting || undefined;
  }
  
  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const [meeting] = await db
      .insert(meetings)
      .values({ ...insertMeeting, updatedAt: new Date() })
      .returning();
    return meeting;
  }
  
  async updateMeeting(id: string, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const [updated] = await db
      .update(meetings)
      .set({ ...meeting, updatedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteMeeting(id: string): Promise<void> {
    await db.delete(meetings).where(eq(meetings.id, id));
  }
  
  // Calls
  async getAllCalls(): Promise<Call[]> {
    return await db.select().from(calls).orderBy(desc(calls.createdAt));
  }
  
  async getCall(id: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call || undefined;
  }
  
  async createCall(insertCall: InsertCall): Promise<Call> {
    const [call] = await db
      .insert(calls)
      .values({ ...insertCall, updatedAt: new Date() })
      .returning();
    return call;
  }
  
  async updateCall(id: string, call: Partial<InsertCall>): Promise<Call | undefined> {
    const [updated] = await db
      .update(calls)
      .set({ ...call, updatedAt: new Date() })
      .where(eq(calls.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteCall(id: string): Promise<void> {
    await db.delete(calls).where(eq(calls.id, id));
  }
  
  // Weekly Reviews
  async getAllWeeklyReviews(): Promise<WeeklyReview[]> {
    return await db.select().from(weeklyReviews).orderBy(desc(weeklyReviews.weekStartDate));
  }
  
  async getWeeklyReview(id: string): Promise<WeeklyReview | undefined> {
    const [review] = await db.select().from(weeklyReviews).where(eq(weeklyReviews.id, id));
    return review || undefined;
  }
  
  async createWeeklyReview(insertReview: InsertWeeklyReview): Promise<WeeklyReview> {
    const [review] = await db
      .insert(weeklyReviews)
      .values({ ...insertReview, updatedAt: new Date() })
      .returning();
    return review;
  }
  
  async updateWeeklyReview(id: string, review: Partial<InsertWeeklyReview>): Promise<WeeklyReview | undefined> {
    const [updated] = await db
      .update(weeklyReviews)
      .set({ ...review, updatedAt: new Date() })
      .where(eq(weeklyReviews.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteWeeklyReview(id: string): Promise<void> {
    await db.delete(weeklyReviews).where(eq(weeklyReviews.id, id));
  }
  
  // Notes
  async getAllNotes(): Promise<Note[]> {
    return await db.select().from(notes).orderBy(desc(notes.createdAt));
  }
  
  async getNote(id: string): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note || undefined;
  }
  
  async createNote(insertNote: InsertNote): Promise<Note> {
    const [note] = await db
      .insert(notes)
      .values({ ...insertNote, updatedAt: new Date() })
      .returning();
    return note;
  }
  
  async updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined> {
    const [updated] = await db
      .update(notes)
      .set({ ...note, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }
  
  // Listings (Haves)
  async getAllListings(): Promise<Listing[]> {
    return await db.select().from(listings).orderBy(desc(listings.createdAt));
  }
  
  async getActiveListings(): Promise<Listing[]> {
    return await db.select().from(listings).where(eq(listings.isActive, true)).orderBy(desc(listings.createdAt));
  }
  
  async getListing(id: string): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing || undefined;
  }
  
  async createListing(insertListing: InsertListing): Promise<Listing> {
    const [listing] = await db
      .insert(listings)
      .values({ ...insertListing, updatedAt: new Date() })
      .returning();
    return listing;
  }
  
  async updateListing(id: string, listing: Partial<InsertListing>): Promise<Listing | undefined> {
    const [updated] = await db
      .update(listings)
      .set({ ...listing, updatedAt: new Date() })
      .where(eq(listings.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteListing(id: string): Promise<void> {
    await db.delete(listings).where(eq(listings.id, id));
  }
  
  // Email Campaigns
  async getAllEmailCampaigns(): Promise<EmailCampaign[]> {
    return await db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt));
  }
  
  async getEmailCampaign(id: string): Promise<EmailCampaign | undefined> {
    const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id));
    return campaign || undefined;
  }
  
  async createEmailCampaign(insertCampaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const [campaign] = await db
      .insert(emailCampaigns)
      .values({ ...insertCampaign, updatedAt: new Date() })
      .returning();
    return campaign;
  }
  
  async updateEmailCampaign(id: string, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined> {
    const [updated] = await db
      .update(emailCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(emailCampaigns.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteEmailCampaign(id: string): Promise<void> {
    await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
  }
  
  // Buyer queries
  async getBuyers(): Promise<Person[]> {
    return await db.select().from(people).where(eq(people.isBuyer, true)).orderBy(desc(people.createdAt));
  }
  
  async getRealtorsForNewsletter(): Promise<Person[]> {
    return await db.select().from(people).where(and(eq(people.isRealtor, true), eq(people.receiveNewsletter, true))).orderBy(people.name);
  }
  
  // Pricing Reviews
  async getAllPricingReviews(): Promise<PricingReview[]> {
    return await db.select().from(pricingReviews).orderBy(desc(pricingReviews.createdAt));
  }
  
  async getPricingReview(id: string): Promise<PricingReview | undefined> {
    const [review] = await db.select().from(pricingReviews).where(eq(pricingReviews.id, id));
    return review || undefined;
  }
  
  async createPricingReview(insertReview: InsertPricingReview): Promise<PricingReview> {
    const [review] = await db
      .insert(pricingReviews)
      .values({ ...insertReview, updatedAt: new Date() })
      .returning();
    return review;
  }
  
  async updatePricingReview(id: string, review: Partial<InsertPricingReview>): Promise<PricingReview | undefined> {
    const [updated] = await db
      .update(pricingReviews)
      .set({ ...review, updatedAt: new Date() })
      .where(eq(pricingReviews.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deletePricingReview(id: string): Promise<void> {
    await db.delete(pricingReviews).where(eq(pricingReviews.id, id));
  }
  
  // Business Settings
  async getBusinessSettings(year: number): Promise<BusinessSettings | undefined> {
    const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.year, year));
    return settings || undefined;
  }
  
  async upsertBusinessSettings(insertSettings: InsertBusinessSettings): Promise<BusinessSettings> {
    const existing = await this.getBusinessSettings(insertSettings.year || 2025);
    if (existing) {
      const [updated] = await db
        .update(businessSettings)
        .set({ ...insertSettings, updatedAt: new Date() })
        .where(eq(businessSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [settings] = await db
      .insert(businessSettings)
      .values({ ...insertSettings, updatedAt: new Date() })
      .returning();
    return settings;
  }
  
  // PIE Entries
  async getAllPieEntries(): Promise<PieEntry[]> {
    return await db.select().from(pieEntries).orderBy(desc(pieEntries.date));
  }
  
  async getPieEntriesByDateRange(startDate: Date, endDate: Date): Promise<PieEntry[]> {
    return await db.select().from(pieEntries)
      .where(and(
        gte(pieEntries.date, startDate),
        lte(pieEntries.date, endDate)
      ))
      .orderBy(pieEntries.date);
  }
  
  async createPieEntry(insertEntry: InsertPieEntry): Promise<PieEntry> {
    const [entry] = await db
      .insert(pieEntries)
      .values(insertEntry)
      .returning();
    return entry;
  }
  
  async updatePieEntry(id: string, entry: Partial<InsertPieEntry>): Promise<PieEntry | undefined> {
    const [updated] = await db
      .update(pieEntries)
      .set(entry)
      .where(eq(pieEntries.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deletePieEntry(id: string): Promise<void> {
    await db.delete(pieEntries).where(eq(pieEntries.id, id));
  }
  
  // Agent Profile
  async getAgentProfile(): Promise<AgentProfile | undefined> {
    const [profile] = await db.select().from(agentProfile).limit(1);
    return profile || undefined;
  }
  
  async upsertAgentProfile(insertProfile: InsertAgentProfile): Promise<AgentProfile> {
    const existing = await this.getAgentProfile();
    if (existing) {
      const [updated] = await db
        .update(agentProfile)
        .set({ ...insertProfile, updatedAt: new Date() })
        .where(eq(agentProfile.id, existing.id))
        .returning();
      return updated;
    }
    const [profile] = await db
      .insert(agentProfile)
      .values({ ...insertProfile, updatedAt: new Date() })
      .returning();
    return profile;
  }
  
  // Real Estate Reviews
  async getAllRealEstateReviews(): Promise<RealEstateReview[]> {
    return await db.select().from(realEstateReviews).orderBy(desc(realEstateReviews.createdAt));
  }
  
  async getRealEstateReviewsByStatus(status: string): Promise<RealEstateReview[]> {
    return await db.select().from(realEstateReviews)
      .where(eq(realEstateReviews.status, status))
      .orderBy(desc(realEstateReviews.createdAt));
  }
  
  async getRealEstateReview(id: string): Promise<RealEstateReview | undefined> {
    const [review] = await db.select().from(realEstateReviews).where(eq(realEstateReviews.id, id));
    return review || undefined;
  }
  
  async createRealEstateReview(insertReview: InsertRealEstateReview): Promise<RealEstateReview> {
    const [review] = await db
      .insert(realEstateReviews)
      .values(insertReview)
      .returning();
    return review;
  }
  
  async updateRealEstateReview(id: string, review: Partial<InsertRealEstateReview>): Promise<RealEstateReview | undefined> {
    const [updated] = await db
      .update(realEstateReviews)
      .set({ ...review, updatedAt: new Date() })
      .where(eq(realEstateReviews.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteRealEstateReview(id: string): Promise<void> {
    await db.delete(realEstateReviews).where(eq(realEstateReviews.id, id));
  }
  
  async getTasksByReviewId(reviewId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.reviewId, reviewId))
      .orderBy(tasks.createdAt);
  }
  
  // Interactions
  async getAllInteractions(): Promise<Interaction[]> {
    return await db.select().from(interactions).orderBy(desc(interactions.occurredAt));
  }
  
  async getInteractionsByPerson(personId: string): Promise<Interaction[]> {
    return await db.select().from(interactions)
      .where(eq(interactions.personId, personId))
      .orderBy(desc(interactions.occurredAt));
  }
  
  async getInteraction(id: string): Promise<Interaction | undefined> {
    const [interaction] = await db.select().from(interactions).where(eq(interactions.id, id));
    return interaction || undefined;
  }
  
  async getInteractionByExternalId(externalId: string): Promise<Interaction | undefined> {
    const [interaction] = await db.select().from(interactions).where(eq(interactions.externalId, externalId));
    return interaction || undefined;
  }
  
  async createInteraction(insertInteraction: InsertInteraction): Promise<Interaction> {
    const [interaction] = await db
      .insert(interactions)
      .values({ ...insertInteraction, updatedAt: new Date() })
      .returning();
    return interaction;
  }
  
  async updateInteraction(id: string, interaction: Partial<InsertInteraction>): Promise<Interaction | undefined> {
    const [updated] = await db
      .update(interactions)
      .set({ ...interaction, updatedAt: new Date() })
      .where(eq(interactions.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteInteraction(id: string): Promise<void> {
    await db.delete(interactions).where(eq(interactions.id, id));
  }
  
  // AI Conversations
  async getAllAiConversations(): Promise<AiConversation[]> {
    return await db.select().from(aiConversations).orderBy(desc(aiConversations.updatedAt));
  }
  
  async getAiConversation(id: string): Promise<AiConversation | undefined> {
    const [conversation] = await db.select().from(aiConversations).where(eq(aiConversations.id, id));
    return conversation || undefined;
  }
  
  async createAiConversation(insertConversation: InsertAiConversation): Promise<AiConversation> {
    const [conversation] = await db
      .insert(aiConversations)
      .values({ ...insertConversation, updatedAt: new Date() })
      .returning();
    return conversation;
  }
  
  async updateAiConversation(id: string, conversation: Partial<InsertAiConversation>): Promise<AiConversation | undefined> {
    const [updated] = await db
      .update(aiConversations)
      .set({ ...conversation, updatedAt: new Date() })
      .where(eq(aiConversations.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteAiConversation(id: string): Promise<void> {
    await db.delete(aiConversations).where(eq(aiConversations.id, id));
  }
  
  // Households
  async getAllHouseholds(): Promise<Household[]> {
    return await db.select().from(households).orderBy(desc(households.createdAt));
  }
  
  async getHousehold(id: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.id, id));
    return household || undefined;
  }
  
  async createHousehold(insertHousehold: InsertHousehold): Promise<Household> {
    const [household] = await db
      .insert(households)
      .values({ ...insertHousehold, updatedAt: new Date() })
      .returning();
    return household;
  }
  
  async updateHousehold(id: string, household: Partial<InsertHousehold>): Promise<Household | undefined> {
    const [updated] = await db
      .update(households)
      .set({ ...household, updatedAt: new Date() })
      .where(eq(households.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteHousehold(id: string): Promise<void> {
    // Remove household reference from all members first
    await db.update(people).set({ householdId: null }).where(eq(people.householdId, id));
    await db.delete(households).where(eq(households.id, id));
  }
  
  async getHouseholdMembers(householdId: string): Promise<Person[]> {
    return await db.select().from(people).where(eq(people.householdId, householdId));
  }
  
  async addPersonToHousehold(personId: string, householdId: string): Promise<Person | undefined> {
    const [updated] = await db
      .update(people)
      .set({ householdId, updatedAt: new Date() })
      .where(eq(people.id, personId))
      .returning();
    return updated || undefined;
  }
  
  async removePersonFromHousehold(personId: string): Promise<Person | undefined> {
    const [updated] = await db
      .update(people)
      .set({ householdId: null, updatedAt: new Date() })
      .where(eq(people.id, personId))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
