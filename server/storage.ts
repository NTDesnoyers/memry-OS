/**
 * Storage module - Database access layer using Drizzle ORM.
 * All CRUD operations go through IStorage interface for testability.
 */
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
  type GeneratedDraft, type InsertGeneratedDraft,
  type VoiceProfile, type InsertVoiceProfile,
  type SyncLog, type InsertSyncLog,
  users, people, deals, tasks, meetings, calls, weeklyReviews, notes, listings, emailCampaigns, pricingReviews, businessSettings, pieEntries, agentProfile, realEstateReviews, interactions, aiConversations, households, generatedDrafts, voiceProfile, syncLogs
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, isNotNull, or, sql, gte, lte, lt } from "drizzle-orm";

/** Storage interface - abstracts database operations for all entities. */
export interface IStorage {
  // Users
  /** Get user by ID. Returns undefined if not found. */
  getUser(id: string): Promise<User | undefined>;
  /** Get user by username. Returns undefined if not found. */
  getUserByUsername(username: string): Promise<User | undefined>;
  /** Create new user. Returns created user with generated ID. */
  createUser(user: InsertUser): Promise<User>;
  
  // People (Contacts)
  /** Get all people/contacts. */
  getAllPeople(): Promise<Person[]>;
  /** Get person by ID. Returns undefined if not found. */
  getPerson(id: string): Promise<Person | undefined>;
  /** Create new person. Returns created person with generated ID. */
  createPerson(person: InsertPerson): Promise<Person>;
  /** Update person fields. Returns updated person or undefined if not found. */
  updatePerson(id: string, person: Partial<InsertPerson>): Promise<Person | undefined>;
  /** Delete person by ID. */
  deletePerson(id: string): Promise<void>;
  
  // Deals - Pipeline management (warm → hot → in_contract → closed)
  /** Get all deals. */
  getAllDeals(): Promise<Deal[]>;
  /** Get deal by ID. */
  getDeal(id: string): Promise<Deal | undefined>;
  /** Create deal linked to a person. */
  createDeal(deal: InsertDeal): Promise<Deal>;
  /** Update deal fields (including stage transitions). */
  updateDeal(id: string, deal: Partial<InsertDeal>): Promise<Deal | undefined>;
  /** Delete deal by ID. */
  deleteDeal(id: string): Promise<void>;
  
  // Tasks - Follow-up actions (syncs to Todoist)
  /** Get all tasks. */
  getAllTasks(): Promise<Task[]>;
  /** Get task by ID. */
  getTask(id: string): Promise<Task | undefined>;
  /** Create task, optionally linked to a person. */
  createTask(task: InsertTask): Promise<Task>;
  /** Update task fields (including marking complete). */
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  /** Delete task by ID. */
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
  
  // Buyer queries - For Haves & Wants matching
  /** Get all people marked as buyers. */
  getBuyers(): Promise<Person[]>;
  /** Get realtors who opted into newsletter. */
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
  
  // Interactions - Calls, meetings, texts, emails with transcripts
  /** Get all non-deleted interactions. */
  getAllInteractions(): Promise<Interaction[]>;
  /** Get soft-deleted interactions (for recovery). */
  getDeletedInteractions(): Promise<Interaction[]>;
  /** Get all interactions for a specific person. */
  getInteractionsByPerson(personId: string): Promise<Interaction[]>;
  /** Get interaction by ID. */
  getInteraction(id: string): Promise<Interaction | undefined>;
  /** Get interaction by external source ID (for deduplication). */
  getInteractionByExternalId(externalId: string): Promise<Interaction | undefined>;
  /** Create interaction. Auto-updates person's lastContact if linked. */
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  /** Update interaction fields. */
  updateInteraction(id: string, interaction: Partial<InsertInteraction>): Promise<Interaction | undefined>;
  /** Soft-delete interaction (sets deletedAt, recoverable). */
  softDeleteInteraction(id: string): Promise<Interaction | undefined>;
  /** Restore soft-deleted interaction. */
  restoreInteraction(id: string): Promise<Interaction | undefined>;
  /** Permanently delete interaction (no recovery). */
  permanentlyDeleteInteraction(id: string): Promise<void>;
  /** Delete interactions soft-deleted more than N days ago. Returns count deleted. */
  cleanupOldDeletedInteractions(daysOld: number): Promise<number>;
  /** Alias for permanentlyDeleteInteraction. */
  deleteInteraction(id: string): Promise<void>;
  
  // AI Conversations
  getAllAiConversations(): Promise<AiConversation[]>;
  getAiConversation(id: string): Promise<AiConversation | undefined>;
  createAiConversation(conversation: InsertAiConversation): Promise<AiConversation>;
  updateAiConversation(id: string, conversation: Partial<InsertAiConversation>): Promise<AiConversation | undefined>;
  deleteAiConversation(id: string): Promise<void>;
  
  // Generated Drafts - AI-generated emails and handwritten notes
  /** Get all generated drafts. */
  getAllGeneratedDrafts(): Promise<GeneratedDraft[]>;
  /** Get drafts for a specific person. */
  getGeneratedDraftsByPerson(personId: string): Promise<GeneratedDraft[]>;
  /** Get drafts by status (pending/approved/sent). */
  getGeneratedDraftsByStatus(status: string): Promise<GeneratedDraft[]>;
  /** Get draft by ID. */
  getGeneratedDraft(id: string): Promise<GeneratedDraft | undefined>;
  /** Create draft (typically from AI processing). */
  createGeneratedDraft(draft: InsertGeneratedDraft): Promise<GeneratedDraft>;
  /** Update draft (edit content, change status). */
  updateGeneratedDraft(id: string, draft: Partial<InsertGeneratedDraft>): Promise<GeneratedDraft | undefined>;
  /** Delete draft by ID. */
  deleteGeneratedDraft(id: string): Promise<void>;
  
  // Households
  getAllHouseholds(): Promise<Household[]>;
  getHousehold(id: string): Promise<Household | undefined>;
  createHousehold(household: InsertHousehold): Promise<Household>;
  updateHousehold(id: string, household: Partial<InsertHousehold>): Promise<Household | undefined>;
  deleteHousehold(id: string): Promise<void>;
  getHouseholdMembers(householdId: string): Promise<Person[]>;
  addPersonToHousehold(personId: string, householdId: string): Promise<Person | undefined>;
  removePersonFromHousehold(personId: string): Promise<Person | undefined>;
  
  // Voice Profile
  getAllVoiceProfiles(): Promise<VoiceProfile[]>;
  getVoiceProfilesByCategory(category: string): Promise<VoiceProfile[]>;
  createVoiceProfile(profile: InsertVoiceProfile): Promise<VoiceProfile>;
  updateVoiceProfile(id: string, profile: Partial<InsertVoiceProfile>): Promise<VoiceProfile | undefined>;
  deleteVoiceProfile(id: string): Promise<void>;
  upsertVoicePattern(category: string, value: string, context?: string, source?: string): Promise<VoiceProfile>;
  
  // Sync Logs
  getAllSyncLogs(): Promise<SyncLog[]>;
  getSyncLogsBySource(source: string): Promise<SyncLog[]>;
  getSyncLog(id: string): Promise<SyncLog | undefined>;
  createSyncLog(log: InsertSyncLog): Promise<SyncLog>;
  updateSyncLog(id: string, log: Partial<InsertSyncLog>): Promise<SyncLog | undefined>;
  
  // People search by phone/email for matching
  getPersonByPhone(phone: string): Promise<Person | undefined>;
  getPersonByEmail(email: string): Promise<Person | undefined>;
  searchPeopleByName(name: string): Promise<Person[]>;
  
  // Contact Due Calculator
  /** Get contacts due for follow-up based on segment and hot/warm status. */
  getContactsDueForFollowUp(): Promise<ContactDueResult[]>;
}

/** Result of contact due calculation with reason and days overdue. */
export type ContactDueResult = {
  person: Person;
  dueReason: 'hot' | 'warm' | 'segment_a' | 'segment_b' | 'segment_c' | 'segment_d';
  daysSinceContact: number;
  daysOverdue: number;
  frequencyDays: number;
};

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
    return await db.select().from(interactions)
      .where(isNull(interactions.deletedAt))
      .orderBy(desc(interactions.occurredAt));
  }
  
  async getDeletedInteractions(): Promise<Interaction[]> {
    return await db.select().from(interactions)
      .where(isNotNull(interactions.deletedAt))
      .orderBy(desc(interactions.deletedAt));
  }
  
  async getInteractionsByPerson(personId: string): Promise<Interaction[]> {
    return await db.select().from(interactions)
      .where(and(eq(interactions.personId, personId), isNull(interactions.deletedAt)))
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
  
  async softDeleteInteraction(id: string): Promise<Interaction | undefined> {
    const [updated] = await db
      .update(interactions)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(interactions.id, id))
      .returning();
    return updated || undefined;
  }
  
  async restoreInteraction(id: string): Promise<Interaction | undefined> {
    const [updated] = await db
      .update(interactions)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(interactions.id, id))
      .returning();
    return updated || undefined;
  }
  
  async permanentlyDeleteInteraction(id: string): Promise<void> {
    await db.delete(interactions).where(eq(interactions.id, id));
  }
  
  async cleanupOldDeletedInteractions(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const result = await db.delete(interactions)
      .where(and(isNotNull(interactions.deletedAt), lt(interactions.deletedAt, cutoffDate)))
      .returning();
    return result.length;
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
  
  // Generated Drafts
  async getAllGeneratedDrafts(): Promise<GeneratedDraft[]> {
    return await db.select().from(generatedDrafts).orderBy(desc(generatedDrafts.createdAt));
  }
  
  async getGeneratedDraftsByPerson(personId: string): Promise<GeneratedDraft[]> {
    return await db.select().from(generatedDrafts)
      .where(eq(generatedDrafts.personId, personId))
      .orderBy(desc(generatedDrafts.createdAt));
  }
  
  async getGeneratedDraftsByStatus(status: string): Promise<GeneratedDraft[]> {
    return await db.select().from(generatedDrafts)
      .where(eq(generatedDrafts.status, status))
      .orderBy(desc(generatedDrafts.createdAt));
  }
  
  async getGeneratedDraft(id: string): Promise<GeneratedDraft | undefined> {
    const [draft] = await db.select().from(generatedDrafts).where(eq(generatedDrafts.id, id));
    return draft || undefined;
  }
  
  async createGeneratedDraft(insertDraft: InsertGeneratedDraft): Promise<GeneratedDraft> {
    const [draft] = await db
      .insert(generatedDrafts)
      .values({ ...insertDraft, updatedAt: new Date() })
      .returning();
    return draft;
  }
  
  async updateGeneratedDraft(id: string, draft: Partial<InsertGeneratedDraft>): Promise<GeneratedDraft | undefined> {
    const [updated] = await db
      .update(generatedDrafts)
      .set({ ...draft, updatedAt: new Date() })
      .where(eq(generatedDrafts.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteGeneratedDraft(id: string): Promise<void> {
    await db.delete(generatedDrafts).where(eq(generatedDrafts.id, id));
  }
  
  // Voice Profile
  async getAllVoiceProfiles(): Promise<VoiceProfile[]> {
    return await db.select().from(voiceProfile).orderBy(desc(voiceProfile.frequency));
  }
  
  async getVoiceProfilesByCategory(category: string): Promise<VoiceProfile[]> {
    return await db.select().from(voiceProfile)
      .where(eq(voiceProfile.category, category))
      .orderBy(desc(voiceProfile.frequency));
  }
  
  async createVoiceProfile(insertProfile: InsertVoiceProfile): Promise<VoiceProfile> {
    const [profile] = await db
      .insert(voiceProfile)
      .values({ ...insertProfile, updatedAt: new Date() })
      .returning();
    return profile;
  }
  
  async updateVoiceProfile(id: string, profile: Partial<InsertVoiceProfile>): Promise<VoiceProfile | undefined> {
    const [updated] = await db
      .update(voiceProfile)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(voiceProfile.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteVoiceProfile(id: string): Promise<void> {
    await db.delete(voiceProfile).where(eq(voiceProfile.id, id));
  }
  
  async upsertVoicePattern(category: string, value: string, context?: string, source?: string): Promise<VoiceProfile> {
    // Check if this pattern already exists
    const [existing] = await db.select().from(voiceProfile)
      .where(and(eq(voiceProfile.category, category), eq(voiceProfile.value, value)));
    
    if (existing) {
      // Increment frequency
      const [updated] = await db
        .update(voiceProfile)
        .set({ 
          frequency: (existing.frequency || 1) + 1,
          updatedAt: new Date()
        })
        .where(eq(voiceProfile.id, existing.id))
        .returning();
      return updated;
    }
    
    // Create new pattern
    const [created] = await db
      .insert(voiceProfile)
      .values({ category, value, context, source, frequency: 1, updatedAt: new Date() })
      .returning();
    return created;
  }
  
  // Sync Logs
  async getAllSyncLogs(): Promise<SyncLog[]> {
    return await db.select().from(syncLogs).orderBy(desc(syncLogs.startedAt));
  }
  
  async getSyncLogsBySource(source: string): Promise<SyncLog[]> {
    return await db.select().from(syncLogs)
      .where(eq(syncLogs.source, source))
      .orderBy(desc(syncLogs.startedAt));
  }
  
  async getSyncLog(id: string): Promise<SyncLog | undefined> {
    const [log] = await db.select().from(syncLogs).where(eq(syncLogs.id, id));
    return log || undefined;
  }
  
  async createSyncLog(insertLog: InsertSyncLog): Promise<SyncLog> {
    const [log] = await db
      .insert(syncLogs)
      .values(insertLog)
      .returning();
    return log;
  }
  
  async updateSyncLog(id: string, log: Partial<InsertSyncLog>): Promise<SyncLog | undefined> {
    const [updated] = await db
      .update(syncLogs)
      .set(log)
      .where(eq(syncLogs.id, id))
      .returning();
    return updated || undefined;
  }
  
  // People search by phone/email for matching
  async getPersonByPhone(phone: string): Promise<Person | undefined> {
    // Normalize phone for matching (strip non-digits)
    const normalized = phone.replace(/\D/g, '');
    const allPeople = await db.select().from(people);
    const match = allPeople.find(p => {
      if (!p.phone) return false;
      const pNormalized = p.phone.replace(/\D/g, '');
      return pNormalized === normalized || pNormalized.endsWith(normalized) || normalized.endsWith(pNormalized);
    });
    return match || undefined;
  }
  
  async getPersonByEmail(email: string): Promise<Person | undefined> {
    const [person] = await db.select().from(people)
      .where(eq(sql`LOWER(${people.email})`, email.toLowerCase()));
    return person || undefined;
  }
  
  async searchPeopleByName(name: string): Promise<Person[]> {
    const lowerName = name.toLowerCase();
    return await db.select().from(people)
      .where(sql`LOWER(${people.name}) LIKE ${'%' + lowerName + '%'}`);
  }
  
  async getContactsDueForFollowUp(): Promise<ContactDueResult[]> {
    const FREQUENCY = {
      hot: 7,        // weekly
      warm: 30,      // monthly
      segment_a: 30, // monthly
      segment_b: 60, // every 2 months
      segment_c: 90, // quarterly
      segment_d: 90, // quarterly (develop or delete)
    };
    
    const allPeople = await db.select().from(people);
    const allDeals = await db.select().from(deals);
    
    // Build map of personId -> highest priority deal stage
    const personDealStage = new Map<string, 'hot' | 'warm'>();
    for (const deal of allDeals) {
      if (!deal.personId) continue;
      const stage = deal.stage?.toLowerCase();
      if (stage === 'hot') {
        personDealStage.set(deal.personId, 'hot');
      } else if (stage === 'warm' && personDealStage.get(deal.personId) !== 'hot') {
        personDealStage.set(deal.personId, 'warm');
      }
    }
    
    const now = new Date();
    const results: ContactDueResult[] = [];
    
    for (const person of allPeople) {
      // Determine contact frequency based on priority: hot > warm > segment
      let dueReason: ContactDueResult['dueReason'] | null = null;
      let frequencyDays = 0;
      
      const dealStage = personDealStage.get(person.id);
      if (dealStage === 'hot') {
        dueReason = 'hot';
        frequencyDays = FREQUENCY.hot;
      } else if (dealStage === 'warm') {
        dueReason = 'warm';
        frequencyDays = FREQUENCY.warm;
      } else {
        // Use segment (handles formats like "A", "A - Advocate", etc.)
        const segment = person.segment?.toUpperCase().charAt(0);
        if (segment === 'A') {
          dueReason = 'segment_a';
          frequencyDays = FREQUENCY.segment_a;
        } else if (segment === 'B') {
          dueReason = 'segment_b';
          frequencyDays = FREQUENCY.segment_b;
        } else if (segment === 'C') {
          dueReason = 'segment_c';
          frequencyDays = FREQUENCY.segment_c;
        } else if (segment === 'D') {
          dueReason = 'segment_d';
          frequencyDays = FREQUENCY.segment_d;
        }
      }
      
      if (!dueReason) continue;
      
      // Calculate days since last contact
      const lastContact = person.lastContact ? new Date(person.lastContact) : null;
      const daysSinceContact = lastContact 
        ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
        : 999; // Never contacted = very overdue
      
      const daysOverdue = daysSinceContact - frequencyDays;
      
      if (daysOverdue > 0) {
        results.push({
          person,
          dueReason,
          daysSinceContact,
          daysOverdue,
          frequencyDays,
        });
      }
    }
    
    // Sort by most overdue first
    results.sort((a, b) => b.daysOverdue - a.daysOverdue);
    
    return results;
  }
}

export const storage = new DatabaseStorage();
