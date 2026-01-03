/**
 * Storage module - Database access layer using Drizzle ORM.
 * All CRUD operations go through IStorage interface for testability.
 */

/** 
 * Multi-tenancy: TenantContext carries the authenticated user's ID.
 * In founder mode (single-user), userId is undefined and we fall back to FOUNDER_USER_ID.
 */
export type TenantContext = {
  userId?: string;
};

/** 
 * Founder's user ID - existing data with null userId belongs to founder.
 * Set this to the founder's Replit auth ID after first login.
 */
export const FOUNDER_USER_ID = process.env.FOUNDER_USER_ID || null;

/**
 * Get effective userId for queries: use context userId, or fall back to founder.
 * Returns undefined if no userId and no founder ID is set (founder mode, all data visible).
 */
export function getEffectiveUserId(ctx?: TenantContext): string | undefined {
  if (ctx?.userId) return ctx.userId;
  return FOUNDER_USER_ID || undefined;
}

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
  type EightByEightCampaign, type InsertEightByEightCampaign,
  type PricingReview, type InsertPricingReview,
  type BusinessSettings, type InsertBusinessSettings,
  type PieEntry, type InsertPieEntry,
  type AgentProfile, type InsertAgentProfile,
  type RealEstateReview, type InsertRealEstateReview,
  type Interaction, type InsertInteraction,
  type InteractionParticipant, type InsertInteractionParticipant,
  type AiConversation, type InsertAiConversation,
  type Household, type InsertHousehold,
  type GeneratedDraft, type InsertGeneratedDraft,
  type VoiceProfile, type InsertVoiceProfile,
  type SyncLog, type InsertSyncLog,
  type HandwrittenNoteUpload, type InsertHandwrittenNoteUpload,
  type ContentTopic, type InsertContentTopic,
  type ContentIdea, type InsertContentIdea,
  type ContentCalendarItem, type InsertContentCalendar,
  type ListeningAnalysis, type InsertListeningAnalysis,
  type CoachingInsight, type InsertCoachingInsight,
  type ListeningPattern, type InsertListeningPattern,
  type DashboardWidget, type InsertDashboardWidget,
  type LifeEventAlert, type InsertLifeEventAlert,
  type SystemEvent, type InsertSystemEvent,
  type AgentAction, type InsertAgentAction,
  type AgentSubscription, type InsertAgentSubscription,
  type Lead, type InsertLead,
  type ObserverSuggestion, type InsertObserverSuggestion,
  type ObserverPattern, type InsertObserverPattern,
  type AiAction, type InsertAiAction,
  type SavedContent, type InsertSavedContent,
  type DailyDigest, type InsertDailyDigest,
  type UserCoreProfile, type InsertUserCoreProfile,
  type DormantOpportunity, type InsertDormantOpportunity,
  type SocialConnection, type InsertSocialConnection,
  type SocialPost, type InsertSocialPost,
  type ContextNode, type InsertContextNode,
  type ContextEdge, type InsertContextEdge,
  type DecisionTrace, type InsertDecisionTrace,
  users, people, deals, tasks, meetings, calls, weeklyReviews, notes, listings, emailCampaigns, eightByEightCampaigns, pricingReviews, businessSettings, pieEntries, agentProfile, realEstateReviews, interactions, interactionParticipants, aiConversations, households, generatedDrafts, voiceProfile, syncLogs, handwrittenNoteUploads, contentTopics, contentIdeas, contentCalendar, listeningAnalysis, coachingInsights, listeningPatterns, dashboardWidgets, lifeEventAlerts, systemEvents, agentActions, agentSubscriptions, leads, observerSuggestions, observerPatterns, aiActions, savedContent, dailyDigests, userCoreProfile, dormantOpportunities, socialConnections, socialPosts, contextNodes, contextEdges, decisionTraces
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
  
  // People (Contacts) - Multi-tenant: filtered by userId
  /** Get all people/contacts for the authenticated user. */
  getAllPeople(ctx?: TenantContext): Promise<Person[]>;
  /** Get person by ID (only if owned by user). */
  getPerson(id: string, ctx?: TenantContext): Promise<Person | undefined>;
  /** Create new person for the authenticated user. */
  createPerson(person: InsertPerson, ctx?: TenantContext): Promise<Person>;
  /** Update person fields (only if owned by user). */
  updatePerson(id: string, person: Partial<InsertPerson>, ctx?: TenantContext): Promise<Person | undefined>;
  /** Delete person by ID (only if owned by user). */
  deletePerson(id: string, ctx?: TenantContext): Promise<void>;
  
  // Deals - Pipeline management (warm → hot → in_contract → closed)
  /** Get all deals for the authenticated user. */
  getAllDeals(ctx?: TenantContext): Promise<Deal[]>;
  /** Get deal by ID (only if owned by user). */
  getDeal(id: string, ctx?: TenantContext): Promise<Deal | undefined>;
  /** Create deal for the authenticated user. */
  createDeal(deal: InsertDeal, ctx?: TenantContext): Promise<Deal>;
  /** Update deal fields (only if owned by user). */
  updateDeal(id: string, deal: Partial<InsertDeal>, ctx?: TenantContext): Promise<Deal | undefined>;
  /** Delete deal by ID (only if owned by user). */
  deleteDeal(id: string, ctx?: TenantContext): Promise<void>;
  
  // Tasks - Follow-up actions (syncs to Todoist)
  /** Get all tasks for the authenticated user. */
  getAllTasks(ctx?: TenantContext): Promise<Task[]>;
  /** Get task by ID (only if owned by user). */
  getTask(id: string, ctx?: TenantContext): Promise<Task | undefined>;
  /** Create task for the authenticated user. */
  createTask(task: InsertTask, ctx?: TenantContext): Promise<Task>;
  /** Update task fields (only if owned by user). */
  updateTask(id: string, task: Partial<InsertTask>, ctx?: TenantContext): Promise<Task | undefined>;
  /** Delete task by ID (only if owned by user). */
  deleteTask(id: string, ctx?: TenantContext): Promise<void>;
  
  // Meetings - Multi-tenant
  getAllMeetings(ctx?: TenantContext): Promise<Meeting[]>;
  getMeeting(id: string, ctx?: TenantContext): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting, ctx?: TenantContext): Promise<Meeting>;
  updateMeeting(id: string, meeting: Partial<InsertMeeting>, ctx?: TenantContext): Promise<Meeting | undefined>;
  deleteMeeting(id: string, ctx?: TenantContext): Promise<void>;
  
  // Calls - Multi-tenant
  getAllCalls(ctx?: TenantContext): Promise<Call[]>;
  getCall(id: string, ctx?: TenantContext): Promise<Call | undefined>;
  createCall(call: InsertCall, ctx?: TenantContext): Promise<Call>;
  updateCall(id: string, call: Partial<InsertCall>, ctx?: TenantContext): Promise<Call | undefined>;
  deleteCall(id: string, ctx?: TenantContext): Promise<void>;
  
  // Weekly Reviews - Multi-tenant
  getAllWeeklyReviews(ctx?: TenantContext): Promise<WeeklyReview[]>;
  getWeeklyReview(id: string, ctx?: TenantContext): Promise<WeeklyReview | undefined>;
  createWeeklyReview(review: InsertWeeklyReview, ctx?: TenantContext): Promise<WeeklyReview>;
  updateWeeklyReview(id: string, review: Partial<InsertWeeklyReview>, ctx?: TenantContext): Promise<WeeklyReview | undefined>;
  deleteWeeklyReview(id: string, ctx?: TenantContext): Promise<void>;
  
  // Notes - Multi-tenant
  getAllNotes(ctx?: TenantContext): Promise<Note[]>;
  getNote(id: string, ctx?: TenantContext): Promise<Note | undefined>;
  createNote(note: InsertNote, ctx?: TenantContext): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>, ctx?: TenantContext): Promise<Note | undefined>;
  deleteNote(id: string, ctx?: TenantContext): Promise<void>;
  
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
  
  // Interactions - Multi-tenant: Calls, meetings, texts, emails with transcripts
  /** Get all non-deleted interactions for authenticated user. */
  getAllInteractions(ctx?: TenantContext): Promise<Interaction[]>;
  /** Get soft-deleted interactions (for recovery). */
  getDeletedInteractions(ctx?: TenantContext): Promise<Interaction[]>;
  /** Get all interactions for a specific person. */
  getInteractionsByPerson(personId: string, ctx?: TenantContext): Promise<Interaction[]>;
  /** Get interaction by ID (only if owned by user). */
  getInteraction(id: string, ctx?: TenantContext): Promise<Interaction | undefined>;
  /** Get interaction by external source ID (for deduplication). */
  getInteractionByExternalId(externalId: string, ctx?: TenantContext): Promise<Interaction | undefined>;
  /** Create interaction for authenticated user. */
  createInteraction(interaction: InsertInteraction, ctx?: TenantContext): Promise<Interaction>;
  /** Update interaction fields (only if owned by user). */
  updateInteraction(id: string, interaction: Partial<InsertInteraction>, ctx?: TenantContext): Promise<Interaction | undefined>;
  /** Soft-delete interaction (sets deletedAt, recoverable). */
  softDeleteInteraction(id: string, ctx?: TenantContext): Promise<Interaction | undefined>;
  /** Restore soft-deleted interaction. */
  restoreInteraction(id: string, ctx?: TenantContext): Promise<Interaction | undefined>;
  /** Permanently delete interaction (no recovery). */
  permanentlyDeleteInteraction(id: string, ctx?: TenantContext): Promise<void>;
  /** Delete interactions soft-deleted more than N days ago. Returns count deleted. */
  cleanupOldDeletedInteractions(daysOld: number, ctx?: TenantContext): Promise<number>;
  /** Alias for permanentlyDeleteInteraction. */
  deleteInteraction(id: string, ctx?: TenantContext): Promise<void>;
  /** Get latest interaction date per person (for dormancy detection). */
  getLatestInteractionDates(ctx?: TenantContext): Promise<Map<string, Date>>;
  
  // Interaction Participants - Multi-person event tracking
  /** Get all participants for an interaction. */
  getInteractionParticipants(interactionId: string): Promise<InteractionParticipant[]>;
  /** Get all interactions a person participated in (via join table). */
  getInteractionsByParticipant(personId: string): Promise<Interaction[]>;
  /** Add participant to interaction. */
  addInteractionParticipant(participant: InsertInteractionParticipant): Promise<InteractionParticipant>;
  /** Remove participant from interaction. */
  removeInteractionParticipant(interactionId: string, personId: string): Promise<void>;
  /** Update participant role. */
  updateInteractionParticipant(id: string, data: Partial<InsertInteractionParticipant>): Promise<InteractionParticipant | undefined>;
  /** Get interactions with their participants loaded. */
  getAllInteractionsWithParticipants(): Promise<(Interaction & { participantsList: (InteractionParticipant & { person?: Person })[] })[]>;
  
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
  createGeneratedDraft(draft: InsertGeneratedDraft, ctx?: TenantContext): Promise<GeneratedDraft>;
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
  getAllVoiceProfiles(ctx?: TenantContext): Promise<VoiceProfile[]>;
  getVoiceProfilesByCategory(category: string, ctx?: TenantContext): Promise<VoiceProfile[]>;
  createVoiceProfile(profile: InsertVoiceProfile, ctx?: TenantContext): Promise<VoiceProfile>;
  updateVoiceProfile(id: string, profile: Partial<InsertVoiceProfile>, ctx?: TenantContext): Promise<VoiceProfile | undefined>;
  deleteVoiceProfile(id: string, ctx?: TenantContext): Promise<void>;
  upsertVoicePattern(category: string, value: string, context?: string, source?: string, ctx?: TenantContext): Promise<VoiceProfile>;
  
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
  
  // 8x8 Campaigns
  getAll8x8Campaigns(): Promise<EightByEightCampaign[]>;
  get8x8Campaign(id: string): Promise<EightByEightCampaign | undefined>;
  get8x8CampaignByPerson(personId: string): Promise<EightByEightCampaign | undefined>;
  create8x8Campaign(campaign: InsertEightByEightCampaign): Promise<EightByEightCampaign>;
  update8x8Campaign(id: string, campaign: Partial<InsertEightByEightCampaign>): Promise<EightByEightCampaign | undefined>;
  delete8x8Campaign(id: string): Promise<void>;
  
  // D Contact Review
  /** Get D contacts that have been in segment for 6+ months without promotion */
  getStaleDContacts(): Promise<Person[]>;
  /** Get D contacts with low engagement (3+ attempts, 0 responses) */
  getLowEngagementDContacts(): Promise<Person[]>;
  /** Get all D contacts needing review (stale or low engagement) */
  getDContactsNeedingReview(): Promise<DContactReviewResult[]>;
  /** Flag a contact for review */
  flagContactForReview(personId: string, status: string): Promise<Person | undefined>;
  
  // Handwritten Note Uploads
  getAllHandwrittenNoteUploads(): Promise<HandwrittenNoteUpload[]>;
  getHandwrittenNoteUploadsByStatus(status: string): Promise<HandwrittenNoteUpload[]>;
  getHandwrittenNoteUpload(id: string): Promise<HandwrittenNoteUpload | undefined>;
  createHandwrittenNoteUpload(upload: InsertHandwrittenNoteUpload): Promise<HandwrittenNoteUpload>;
  updateHandwrittenNoteUpload(id: string, upload: Partial<InsertHandwrittenNoteUpload>): Promise<HandwrittenNoteUpload | undefined>;
  deleteHandwrittenNoteUpload(id: string): Promise<void>;
  
  // Content Topics - Recurring themes from conversations
  getAllContentTopics(ctx?: TenantContext): Promise<ContentTopic[]>;
  getActiveContentTopics(ctx?: TenantContext): Promise<ContentTopic[]>;
  getContentTopic(id: string, ctx?: TenantContext): Promise<ContentTopic | undefined>;
  createContentTopic(topic: InsertContentTopic, ctx?: TenantContext): Promise<ContentTopic>;
  updateContentTopic(id: string, topic: Partial<InsertContentTopic>, ctx?: TenantContext): Promise<ContentTopic | undefined>;
  deleteContentTopic(id: string, ctx?: TenantContext): Promise<void>;
  incrementTopicMention(id: string, quote?: string, interactionId?: string, ctx?: TenantContext): Promise<ContentTopic | undefined>;
  
  // Content Ideas - Specific content pieces to create
  getAllContentIdeas(ctx?: TenantContext): Promise<ContentIdea[]>;
  getContentIdeasByTopic(topicId: string, ctx?: TenantContext): Promise<ContentIdea[]>;
  getContentIdeasByStatus(status: string, ctx?: TenantContext): Promise<ContentIdea[]>;
  getContentIdea(id: string, ctx?: TenantContext): Promise<ContentIdea | undefined>;
  createContentIdea(idea: InsertContentIdea, ctx?: TenantContext): Promise<ContentIdea>;
  updateContentIdea(id: string, idea: Partial<InsertContentIdea>, ctx?: TenantContext): Promise<ContentIdea | undefined>;
  deleteContentIdea(id: string, ctx?: TenantContext): Promise<void>;
  
  // Content Calendar - Scheduled publishing
  getAllContentCalendarItems(): Promise<ContentCalendarItem[]>;
  getContentCalendarByDateRange(start: Date, end: Date): Promise<ContentCalendarItem[]>;
  getContentCalendarItem(id: string): Promise<ContentCalendarItem | undefined>;
  createContentCalendarItem(item: InsertContentCalendar): Promise<ContentCalendarItem>;
  updateContentCalendarItem(id: string, item: Partial<InsertContentCalendar>): Promise<ContentCalendarItem | undefined>;
  deleteContentCalendarItem(id: string): Promise<void>;
  
  // Listening Analysis - NVC + Question-Based Selling
  getAllListeningAnalysis(): Promise<ListeningAnalysis[]>;
  getListeningAnalysisByInteraction(interactionId: string): Promise<ListeningAnalysis | undefined>;
  createListeningAnalysis(analysis: InsertListeningAnalysis): Promise<ListeningAnalysis>;
  getInteractionsWithTranscripts(): Promise<Interaction[]>;
  
  // Coaching Insights
  getAllCoachingInsights(): Promise<CoachingInsight[]>;
  getActiveCoachingInsights(): Promise<CoachingInsight[]>;
  getCoachingInsight(id: string): Promise<CoachingInsight | undefined>;
  createCoachingInsight(insight: InsertCoachingInsight): Promise<CoachingInsight>;
  updateCoachingInsight(id: string, insight: Partial<InsertCoachingInsight>): Promise<CoachingInsight | undefined>;
  deleteCoachingInsight(id: string): Promise<void>;
  
  // Listening Patterns
  getAllListeningPatterns(): Promise<ListeningPattern[]>;
  getListeningPattern(id: string): Promise<ListeningPattern | undefined>;
  createListeningPattern(pattern: InsertListeningPattern): Promise<ListeningPattern>;
  updateListeningPattern(id: string, pattern: Partial<InsertListeningPattern>): Promise<ListeningPattern | undefined>;
  
  // Dashboard Widgets
  getAllDashboardWidgets(): Promise<DashboardWidget[]>;
  getDashboardWidget(id: string): Promise<DashboardWidget | undefined>;
  createDashboardWidget(widget: InsertDashboardWidget): Promise<DashboardWidget>;
  updateDashboardWidget(id: string, widget: Partial<InsertDashboardWidget>): Promise<DashboardWidget | undefined>;
  deleteDashboardWidget(id: string): Promise<void>;
  updateDashboardWidgetPositions(widgets: { id: string; position: number }[]): Promise<void>;
  
  // Life Event Alerts
  getAllLifeEventAlerts(): Promise<LifeEventAlert[]>;
  getLifeEventAlert(id: string): Promise<LifeEventAlert | undefined>;
  getLifeEventAlertsByPerson(personId: string): Promise<LifeEventAlert[]>;
  createLifeEventAlert(alert: InsertLifeEventAlert): Promise<LifeEventAlert>;
  updateLifeEventAlert(id: string, alert: Partial<InsertLifeEventAlert>): Promise<LifeEventAlert | undefined>;
  deleteLifeEventAlert(id: string): Promise<void>;
  
  // Unified Person Context
  getPersonFullContext(personId: string): Promise<PersonFullContext | undefined>;
  
  // Leads - Top of funnel
  getAllLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  getLeadsBySource(source: string): Promise<Lead[]>;
  getNewLeads(): Promise<Lead[]>;
  findDuplicateLead(email?: string, phone?: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<void>;
  convertLeadToPerson(leadId: string): Promise<{ lead: Lead; person: Person } | undefined>;
  
  // System Events - Event Bus
  getAllSystemEvents(limit?: number): Promise<SystemEvent[]>;
  getSystemEvent(id: string): Promise<SystemEvent | undefined>;
  getSystemEventsByType(eventType: string, limit?: number): Promise<SystemEvent[]>;
  getSystemEventsByCategory(category: string, limit?: number): Promise<SystemEvent[]>;
  getSystemEventsByPerson(personId: string, limit?: number): Promise<SystemEvent[]>;
  getUnprocessedEvents(): Promise<SystemEvent[]>;
  createSystemEvent(event: InsertSystemEvent): Promise<SystemEvent>;
  markEventProcessed(id: string, processedBy: string[]): Promise<SystemEvent | undefined>;
  
  // Agent Actions - Approval Workflow
  getAllAgentActions(limit?: number): Promise<AgentAction[]>;
  getAgentAction(id: string): Promise<AgentAction | undefined>;
  getAgentActionsByStatus(status: string, limit?: number): Promise<AgentAction[]>;
  getAgentActionsByAgent(agentName: string, limit?: number): Promise<AgentAction[]>;
  getPendingApprovals(): Promise<AgentAction[]>;
  createAgentAction(action: InsertAgentAction): Promise<AgentAction>;
  updateAgentAction(id: string, action: Partial<InsertAgentAction>): Promise<AgentAction | undefined>;
  approveAgentAction(id: string, approvedBy: string): Promise<AgentAction | undefined>;
  rejectAgentAction(id: string): Promise<AgentAction | undefined>;
  markAgentActionExecuted(id: string, targetEntityId?: string): Promise<AgentAction | undefined>;
  markAgentActionFailed(id: string, errorMessage: string): Promise<AgentAction | undefined>;
  
  // Agent Subscriptions
  getAllAgentSubscriptions(): Promise<AgentSubscription[]>;
  getActiveSubscriptionsForEvent(eventType: string): Promise<AgentSubscription[]>;
  createAgentSubscription(subscription: InsertAgentSubscription): Promise<AgentSubscription>;
  updateAgentSubscription(id: string, subscription: Partial<InsertAgentSubscription>): Promise<AgentSubscription | undefined>;
  deleteAgentSubscription(id: string): Promise<void>;
  
  // Observer Suggestions - AI Chief of Staff proactive suggestions
  getAllObserverSuggestions(limit?: number): Promise<ObserverSuggestion[]>;
  getPendingObserverSuggestions(): Promise<ObserverSuggestion[]>;
  getObserverSuggestion(id: string): Promise<ObserverSuggestion | undefined>;
  createObserverSuggestion(suggestion: InsertObserverSuggestion): Promise<ObserverSuggestion>;
  updateObserverSuggestion(id: string, suggestion: Partial<InsertObserverSuggestion>): Promise<ObserverSuggestion | undefined>;
  acceptObserverSuggestion(id: string): Promise<ObserverSuggestion | undefined>;
  snoozeObserverSuggestion(id: string, until: Date): Promise<ObserverSuggestion | undefined>;
  dismissObserverSuggestion(id: string, feedbackNote?: string): Promise<ObserverSuggestion | undefined>;
  expireOldSuggestions(): Promise<number>;
  
  // Observer Patterns - Learned behavior patterns
  getAllObserverPatterns(): Promise<ObserverPattern[]>;
  getEnabledObserverPatterns(): Promise<ObserverPattern[]>;
  getObserverPattern(id: string): Promise<ObserverPattern | undefined>;
  createObserverPattern(pattern: InsertObserverPattern): Promise<ObserverPattern>;
  updateObserverPattern(id: string, pattern: Partial<InsertObserverPattern>): Promise<ObserverPattern | undefined>;
  incrementPatternOccurrence(id: string): Promise<ObserverPattern | undefined>;
  updatePatternFeedback(id: string, delta: number): Promise<ObserverPattern | undefined>;
  
  // AI Actions - Verify → Automate audit trail
  getAllAiActions(limit?: number): Promise<AiAction[]>;
  getAiAction(id: string): Promise<AiAction | undefined>;
  getAiActionsByType(actionType: string, limit?: number): Promise<AiAction[]>;
  createAiAction(action: InsertAiAction): Promise<AiAction>;
  updateAiAction(id: string, action: Partial<InsertAiAction>): Promise<AiAction | undefined>;
  
  // Saved Content - Insight Inbox
  getAllSavedContent(limit?: number): Promise<SavedContent[]>;
  getUnreadSavedContent(): Promise<SavedContent[]>;
  getSavedContent(id: string): Promise<SavedContent | undefined>;
  getSavedContentByUrl(url: string): Promise<SavedContent | undefined>;
  createSavedContent(content: InsertSavedContent): Promise<SavedContent>;
  updateSavedContent(id: string, content: Partial<InsertSavedContent>): Promise<SavedContent | undefined>;
  markContentRead(id: string): Promise<SavedContent | undefined>;
  archiveContent(id: string): Promise<SavedContent | undefined>;
  deleteSavedContent(id: string): Promise<void>;
  
  // Daily Digests
  getAllDailyDigests(limit?: number): Promise<DailyDigest[]>;
  getDailyDigest(id: string): Promise<DailyDigest | undefined>;
  getTodaysDigest(): Promise<DailyDigest | undefined>;
  createDailyDigest(digest: InsertDailyDigest): Promise<DailyDigest>;
  updateDailyDigest(id: string, digest: Partial<InsertDailyDigest>): Promise<DailyDigest | undefined>;
  
  // User Core Profile - Guiding Principles & Personalization
  getUserCoreProfile(betaUserId: string): Promise<UserCoreProfile | undefined>;
  getUserCoreProfileById(id: string): Promise<UserCoreProfile | undefined>;
  createUserCoreProfile(profile: InsertUserCoreProfile): Promise<UserCoreProfile>;
  updateUserCoreProfile(betaUserId: string, profile: Partial<InsertUserCoreProfile>): Promise<UserCoreProfile | undefined>;
  upsertUserCoreProfile(profile: InsertUserCoreProfile): Promise<UserCoreProfile>;
  
  // Dormant Opportunities - Revival lead finder
  getAllDormantOpportunities(limit?: number): Promise<DormantOpportunity[]>;
  getPendingDormantOpportunities(): Promise<DormantOpportunity[]>;
  getDormantOpportunity(id: string): Promise<DormantOpportunity | undefined>;
  getDormantOpportunityByPersonId(personId: string): Promise<DormantOpportunity | undefined>;
  createDormantOpportunity(opportunity: InsertDormantOpportunity): Promise<DormantOpportunity>;
  updateDormantOpportunity(id: string, opportunity: Partial<InsertDormantOpportunity>): Promise<DormantOpportunity | undefined>;
  approveDormantOpportunity(id: string): Promise<DormantOpportunity | undefined>;
  dismissDormantOpportunity(id: string, reason?: string): Promise<DormantOpportunity | undefined>;
  deleteDormantOpportunity(id: string): Promise<void>;
  
  // Social Media Connections
  getAllSocialConnections(): Promise<SocialConnection[]>;
  getSocialConnection(id: string): Promise<SocialConnection | undefined>;
  getActiveSocialConnection(platform: string): Promise<SocialConnection | undefined>;
  createSocialConnection(connection: InsertSocialConnection): Promise<SocialConnection>;
  updateSocialConnection(id: string, connection: Partial<InsertSocialConnection>): Promise<SocialConnection | undefined>;
  deleteSocialConnection(id: string): Promise<void>;
  
  // Social Posts
  getAllSocialPosts(limit?: number): Promise<SocialPost[]>;
  getSocialPost(id: string): Promise<SocialPost | undefined>;
  getScheduledSocialPosts(): Promise<SocialPost[]>;
  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  updateSocialPost(id: string, post: Partial<InsertSocialPost>): Promise<SocialPost | undefined>;
  deleteSocialPost(id: string): Promise<void>;
  
  // Context Graph - Decision Traces & World Model
  createContextNode(node: InsertContextNode): Promise<ContextNode>;
  getContextNode(id: string): Promise<ContextNode | undefined>;
  getContextNodeByEntity(entityType: string, entityId: string): Promise<ContextNode | undefined>;
  createContextEdge(edge: InsertContextEdge): Promise<ContextEdge>;
  getContextEdgesFrom(nodeId: string): Promise<ContextEdge[]>;
  getContextEdgesTo(nodeId: string): Promise<ContextEdge[]>;
  createDecisionTrace(trace: InsertDecisionTrace): Promise<DecisionTrace>;
  getDecisionTrace(id: string): Promise<DecisionTrace | undefined>;
  getDecisionTracesForEntity(entityType: string, entityId: string, limit?: number): Promise<DecisionTrace[]>;
  getRecentDecisionTraces(limit?: number): Promise<DecisionTrace[]>;
}

/** Full context for a person - unified data layer response */
export type PersonFullContext = {
  person: Person;
  deals: Deal[];
  interactions: Interaction[];
  notes: Note[];
  lifeEventAlerts: LifeEventAlert[];
  generatedDrafts: GeneratedDraft[];
  relationshipScore: number;
  lastTouchpoint: Date | null;
  daysSinceContact: number | null;
  fordCompleteness: number;
  suggestedNextAction: string | null;
};

/** Result of contact due calculation with reason and days overdue. */
export type ContactDueResult = {
  person: Person;
  dueReason: 'hot' | 'warm' | 'segment_a' | 'segment_b' | 'segment_c' | 'segment_d';
  daysSinceContact: number;
  daysOverdue: number;
  frequencyDays: number;
};

/** Result of D contact review analysis */
export type DContactReviewResult = {
  person: Person;
  reason: 'stale' | 'low_engagement' | 'campaign_completed';
  monthsInSegment: number;
  contactAttempts: number;
  contactResponses: number;
  activeCampaign?: EightByEightCampaign;
};

export class DatabaseStorage implements IStorage {
  /**
   * Build tenant filter condition for queries.
   * Returns condition that matches: userId = ctx.userId OR (userId IS NULL AND ctx is founder mode)
   */
  private getTenantFilter(table: { userId: any }, ctx?: TenantContext) {
    const userId = getEffectiveUserId(ctx);
    if (!userId) {
      // Founder mode: no userId set, see all data (including null userId)
      return undefined;
    }
    // Multi-tenant: match userId OR null (legacy founder data)
    return or(eq(table.userId, userId), isNull(table.userId));
  }

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
  
  // People - Multi-tenant
  async getAllPeople(ctx?: TenantContext): Promise<Person[]> {
    const filter = this.getTenantFilter(people, ctx);
    if (filter) {
      return await db.select().from(people).where(filter).orderBy(desc(people.createdAt));
    }
    return await db.select().from(people).orderBy(desc(people.createdAt));
  }
  
  async getPerson(id: string, ctx?: TenantContext): Promise<Person | undefined> {
    const filter = this.getTenantFilter(people, ctx);
    const conditions = filter ? and(eq(people.id, id), filter) : eq(people.id, id);
    const [person] = await db.select().from(people).where(conditions);
    return person || undefined;
  }
  
  async createPerson(insertPerson: InsertPerson, ctx?: TenantContext): Promise<Person> {
    const userId = getEffectiveUserId(ctx);
    const [person] = await db
      .insert(people)
      .values({ ...insertPerson, userId, updatedAt: new Date() })
      .returning();
    return person;
  }
  
  async updatePerson(id: string, person: Partial<InsertPerson>, ctx?: TenantContext): Promise<Person | undefined> {
    const filter = this.getTenantFilter(people, ctx);
    const conditions = filter ? and(eq(people.id, id), filter) : eq(people.id, id);
    const [updated] = await db
      .update(people)
      .set({ ...person, updatedAt: new Date() })
      .where(conditions)
      .returning();
    return updated || undefined;
  }
  
  async deletePerson(id: string, ctx?: TenantContext): Promise<void> {
    // Verify ownership first
    const person = await this.getPerson(id, ctx);
    if (!person) return;
    
    // Delete all related data first to avoid foreign key constraints
    await db.delete(agentActions).where(eq(agentActions.personId, id));
    await db.delete(generatedDrafts).where(eq(generatedDrafts.personId, id));
    await db.delete(observerSuggestions).where(eq(observerSuggestions.personId, id));
    await db.delete(lifeEventAlerts).where(eq(lifeEventAlerts.personId, id));
    await db.delete(dormantOpportunities).where(eq(dormantOpportunities.personId, id));
    await db.delete(notes).where(eq(notes.personId, id));
    await db.delete(calls).where(eq(calls.personId, id));
    await db.delete(meetings).where(eq(meetings.personId, id));
    await db.delete(tasks).where(eq(tasks.personId, id));
    await db.delete(interactions).where(eq(interactions.personId, id));
    await db.delete(deals).where(eq(deals.personId, id));
    await db.delete(people).where(eq(people.id, id));
  }
  
  // Deals - Multi-tenant
  async getAllDeals(ctx?: TenantContext): Promise<Deal[]> {
    const filter = this.getTenantFilter(deals, ctx);
    if (filter) {
      return await db.select().from(deals).where(filter).orderBy(desc(deals.createdAt));
    }
    return await db.select().from(deals).orderBy(desc(deals.createdAt));
  }
  
  async getDeal(id: string, ctx?: TenantContext): Promise<Deal | undefined> {
    const filter = this.getTenantFilter(deals, ctx);
    const conditions = filter ? and(eq(deals.id, id), filter) : eq(deals.id, id);
    const [deal] = await db.select().from(deals).where(conditions);
    return deal || undefined;
  }
  
  async createDeal(insertDeal: InsertDeal, ctx?: TenantContext): Promise<Deal> {
    const userId = getEffectiveUserId(ctx);
    const [deal] = await db
      .insert(deals)
      .values({ ...insertDeal, userId, updatedAt: new Date() })
      .returning();
    return deal;
  }
  
  async updateDeal(id: string, deal: Partial<InsertDeal>, ctx?: TenantContext): Promise<Deal | undefined> {
    const filter = this.getTenantFilter(deals, ctx);
    const conditions = filter ? and(eq(deals.id, id), filter) : eq(deals.id, id);
    const [updated] = await db
      .update(deals)
      .set({ ...deal, updatedAt: new Date() })
      .where(conditions)
      .returning();
    return updated || undefined;
  }
  
  async deleteDeal(id: string, ctx?: TenantContext): Promise<void> {
    const filter = this.getTenantFilter(deals, ctx);
    const conditions = filter ? and(eq(deals.id, id), filter) : eq(deals.id, id);
    await db.delete(deals).where(conditions);
  }
  
  // Tasks - Multi-tenant
  async getAllTasks(ctx?: TenantContext): Promise<Task[]> {
    const filter = this.getTenantFilter(tasks, ctx);
    if (filter) {
      return await db.select().from(tasks).where(filter).orderBy(desc(tasks.createdAt));
    }
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }
  
  async getTask(id: string, ctx?: TenantContext): Promise<Task | undefined> {
    const filter = this.getTenantFilter(tasks, ctx);
    const conditions = filter ? and(eq(tasks.id, id), filter) : eq(tasks.id, id);
    const [task] = await db.select().from(tasks).where(conditions);
    return task || undefined;
  }
  
  async createTask(insertTask: InsertTask, ctx?: TenantContext): Promise<Task> {
    const userId = getEffectiveUserId(ctx);
    const [task] = await db
      .insert(tasks)
      .values({ ...insertTask, userId, updatedAt: new Date() })
      .returning();
    return task;
  }
  
  async updateTask(id: string, task: Partial<InsertTask>, ctx?: TenantContext): Promise<Task | undefined> {
    const filter = this.getTenantFilter(tasks, ctx);
    const conditions = filter ? and(eq(tasks.id, id), filter) : eq(tasks.id, id);
    const [updated] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(conditions)
      .returning();
    return updated || undefined;
  }
  
  async deleteTask(id: string, ctx?: TenantContext): Promise<void> {
    const filter = this.getTenantFilter(tasks, ctx);
    const conditions = filter ? and(eq(tasks.id, id), filter) : eq(tasks.id, id);
    await db.delete(tasks).where(conditions);
  }
  
  // Meetings - Multi-tenant
  async getAllMeetings(ctx?: TenantContext): Promise<Meeting[]> {
    const filter = this.getTenantFilter(meetings, ctx);
    if (filter) {
      return await db.select().from(meetings).where(filter).orderBy(desc(meetings.createdAt));
    }
    return await db.select().from(meetings).orderBy(desc(meetings.createdAt));
  }
  
  async getMeeting(id: string, ctx?: TenantContext): Promise<Meeting | undefined> {
    const filter = this.getTenantFilter(meetings, ctx);
    const conditions = filter ? and(eq(meetings.id, id), filter) : eq(meetings.id, id);
    const [meeting] = await db.select().from(meetings).where(conditions);
    return meeting || undefined;
  }
  
  async createMeeting(insertMeeting: InsertMeeting, ctx?: TenantContext): Promise<Meeting> {
    const userId = getEffectiveUserId(ctx);
    const [meeting] = await db
      .insert(meetings)
      .values({ ...insertMeeting, userId, updatedAt: new Date() })
      .returning();
    return meeting;
  }
  
  async updateMeeting(id: string, meeting: Partial<InsertMeeting>, ctx?: TenantContext): Promise<Meeting | undefined> {
    const filter = this.getTenantFilter(meetings, ctx);
    const conditions = filter ? and(eq(meetings.id, id), filter) : eq(meetings.id, id);
    const [updated] = await db
      .update(meetings)
      .set({ ...meeting, updatedAt: new Date() })
      .where(conditions)
      .returning();
    return updated || undefined;
  }
  
  async deleteMeeting(id: string, ctx?: TenantContext): Promise<void> {
    const filter = this.getTenantFilter(meetings, ctx);
    const conditions = filter ? and(eq(meetings.id, id), filter) : eq(meetings.id, id);
    await db.delete(meetings).where(conditions);
  }
  
  // Calls - Multi-tenant
  async getAllCalls(ctx?: TenantContext): Promise<Call[]> {
    const filter = this.getTenantFilter(calls, ctx);
    if (filter) {
      return await db.select().from(calls).where(filter).orderBy(desc(calls.createdAt));
    }
    return await db.select().from(calls).orderBy(desc(calls.createdAt));
  }
  
  async getCall(id: string, ctx?: TenantContext): Promise<Call | undefined> {
    const filter = this.getTenantFilter(calls, ctx);
    const conditions = filter ? and(eq(calls.id, id), filter) : eq(calls.id, id);
    const [call] = await db.select().from(calls).where(conditions);
    return call || undefined;
  }
  
  async createCall(insertCall: InsertCall, ctx?: TenantContext): Promise<Call> {
    const userId = getEffectiveUserId(ctx);
    const [call] = await db
      .insert(calls)
      .values({ ...insertCall, userId, updatedAt: new Date() })
      .returning();
    return call;
  }
  
  async updateCall(id: string, call: Partial<InsertCall>, ctx?: TenantContext): Promise<Call | undefined> {
    const filter = this.getTenantFilter(calls, ctx);
    const conditions = filter ? and(eq(calls.id, id), filter) : eq(calls.id, id);
    const [updated] = await db
      .update(calls)
      .set({ ...call, updatedAt: new Date() })
      .where(conditions)
      .returning();
    return updated || undefined;
  }
  
  async deleteCall(id: string, ctx?: TenantContext): Promise<void> {
    const filter = this.getTenantFilter(calls, ctx);
    const conditions = filter ? and(eq(calls.id, id), filter) : eq(calls.id, id);
    await db.delete(calls).where(conditions);
  }
  
  // Weekly Reviews - Multi-tenant
  async getAllWeeklyReviews(ctx?: TenantContext): Promise<WeeklyReview[]> {
    const filter = this.getTenantFilter(weeklyReviews, ctx);
    if (filter) {
      return await db.select().from(weeklyReviews).where(filter).orderBy(desc(weeklyReviews.weekStartDate));
    }
    return await db.select().from(weeklyReviews).orderBy(desc(weeklyReviews.weekStartDate));
  }
  
  async getWeeklyReview(id: string, ctx?: TenantContext): Promise<WeeklyReview | undefined> {
    const filter = this.getTenantFilter(weeklyReviews, ctx);
    const conditions = filter ? and(eq(weeklyReviews.id, id), filter) : eq(weeklyReviews.id, id);
    const [review] = await db.select().from(weeklyReviews).where(conditions);
    return review || undefined;
  }
  
  async createWeeklyReview(insertReview: InsertWeeklyReview, ctx?: TenantContext): Promise<WeeklyReview> {
    const userId = getEffectiveUserId(ctx);
    const [review] = await db
      .insert(weeklyReviews)
      .values({ ...insertReview, userId, updatedAt: new Date() })
      .returning();
    return review;
  }
  
  async updateWeeklyReview(id: string, review: Partial<InsertWeeklyReview>, ctx?: TenantContext): Promise<WeeklyReview | undefined> {
    const filter = this.getTenantFilter(weeklyReviews, ctx);
    const conditions = filter ? and(eq(weeklyReviews.id, id), filter) : eq(weeklyReviews.id, id);
    const [updated] = await db
      .update(weeklyReviews)
      .set({ ...review, updatedAt: new Date() })
      .where(conditions)
      .returning();
    return updated || undefined;
  }
  
  async deleteWeeklyReview(id: string, ctx?: TenantContext): Promise<void> {
    const filter = this.getTenantFilter(weeklyReviews, ctx);
    const conditions = filter ? and(eq(weeklyReviews.id, id), filter) : eq(weeklyReviews.id, id);
    await db.delete(weeklyReviews).where(conditions);
  }
  
  // Notes - Multi-tenant
  async getAllNotes(ctx?: TenantContext): Promise<Note[]> {
    const filter = this.getTenantFilter(notes, ctx);
    if (filter) {
      return await db.select().from(notes).where(filter).orderBy(desc(notes.createdAt));
    }
    return await db.select().from(notes).orderBy(desc(notes.createdAt));
  }
  
  async getNote(id: string, ctx?: TenantContext): Promise<Note | undefined> {
    const filter = this.getTenantFilter(notes, ctx);
    const conditions = filter ? and(eq(notes.id, id), filter) : eq(notes.id, id);
    const [note] = await db.select().from(notes).where(conditions);
    return note || undefined;
  }
  
  async createNote(insertNote: InsertNote, ctx?: TenantContext): Promise<Note> {
    const userId = getEffectiveUserId(ctx);
    const [note] = await db
      .insert(notes)
      .values({ ...insertNote, userId, updatedAt: new Date() })
      .returning();
    return note;
  }
  
  async updateNote(id: string, note: Partial<InsertNote>, ctx?: TenantContext): Promise<Note | undefined> {
    const filter = this.getTenantFilter(notes, ctx);
    const conditions = filter ? and(eq(notes.id, id), filter) : eq(notes.id, id);
    const [updated] = await db
      .update(notes)
      .set({ ...note, updatedAt: new Date() })
      .where(conditions)
      .returning();
    return updated || undefined;
  }
  
  async deleteNote(id: string, ctx?: TenantContext): Promise<void> {
    const filter = this.getTenantFilter(notes, ctx);
    const conditions = filter ? and(eq(notes.id, id), filter) : eq(notes.id, id);
    await db.delete(notes).where(conditions);
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
  
  // Interactions - Multi-tenant
  async getAllInteractions(ctx?: TenantContext): Promise<Interaction[]> {
    const filter = this.getTenantFilter(interactions, ctx);
    const baseCondition = isNull(interactions.deletedAt);
    const conditions = filter ? and(baseCondition, filter) : baseCondition;
    return await db.select().from(interactions)
      .where(conditions)
      .orderBy(desc(interactions.occurredAt));
  }
  
  async getDeletedInteractions(ctx?: TenantContext): Promise<Interaction[]> {
    const filter = this.getTenantFilter(interactions, ctx);
    const baseCondition = isNotNull(interactions.deletedAt);
    const conditions = filter ? and(baseCondition, filter) : baseCondition;
    return await db.select().from(interactions)
      .where(conditions)
      .orderBy(desc(interactions.deletedAt));
  }
  
  async getInteractionsByPerson(personId: string, ctx?: TenantContext): Promise<Interaction[]> {
    const filter = this.getTenantFilter(interactions, ctx);
    const baseCondition = and(eq(interactions.personId, personId), isNull(interactions.deletedAt));
    const conditions = filter ? and(baseCondition, filter) : baseCondition;
    return await db.select().from(interactions)
      .where(conditions)
      .orderBy(desc(interactions.occurredAt));
  }
  
  async getInteraction(id: string, ctx?: TenantContext): Promise<Interaction | undefined> {
    const filter = this.getTenantFilter(interactions, ctx);
    const conditions = filter ? and(eq(interactions.id, id), filter) : eq(interactions.id, id);
    const [interaction] = await db.select().from(interactions).where(conditions);
    return interaction || undefined;
  }
  
  async getInteractionByExternalId(externalId: string, ctx?: TenantContext): Promise<Interaction | undefined> {
    const filter = this.getTenantFilter(interactions, ctx);
    const conditions = filter ? and(eq(interactions.externalId, externalId), filter) : eq(interactions.externalId, externalId);
    const [interaction] = await db.select().from(interactions).where(conditions);
    return interaction || undefined;
  }
  
  async createInteraction(insertInteraction: InsertInteraction, ctx?: TenantContext): Promise<Interaction> {
    const userId = getEffectiveUserId(ctx);
    const [interaction] = await db
      .insert(interactions)
      .values({ ...insertInteraction, userId, updatedAt: new Date() })
      .returning();
    return interaction;
  }
  
  async updateInteraction(id: string, interaction: Partial<InsertInteraction>, ctx?: TenantContext): Promise<Interaction | undefined> {
    const filter = this.getTenantFilter(interactions, ctx);
    const conditions = filter ? and(eq(interactions.id, id), filter) : eq(interactions.id, id);
    const [updated] = await db
      .update(interactions)
      .set({ ...interaction, updatedAt: new Date() })
      .where(conditions)
      .returning();
    return updated || undefined;
  }
  
  async softDeleteInteraction(id: string, ctx?: TenantContext): Promise<Interaction | undefined> {
    const filter = this.getTenantFilter(interactions, ctx);
    const conditions = filter ? and(eq(interactions.id, id), filter) : eq(interactions.id, id);
    const [updated] = await db
      .update(interactions)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(conditions)
      .returning();
    return updated || undefined;
  }
  
  async restoreInteraction(id: string, ctx?: TenantContext): Promise<Interaction | undefined> {
    const filter = this.getTenantFilter(interactions, ctx);
    const conditions = filter ? and(eq(interactions.id, id), filter) : eq(interactions.id, id);
    const [updated] = await db
      .update(interactions)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(conditions)
      .returning();
    return updated || undefined;
  }
  
  async permanentlyDeleteInteraction(id: string, ctx?: TenantContext): Promise<void> {
    const filter = this.getTenantFilter(interactions, ctx);
    const conditions = filter ? and(eq(interactions.id, id), filter) : eq(interactions.id, id);
    await db.delete(interactions).where(conditions);
  }
  
  async cleanupOldDeletedInteractions(daysOld: number, ctx?: TenantContext): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const filter = this.getTenantFilter(interactions, ctx);
    const baseCondition = and(isNotNull(interactions.deletedAt), lt(interactions.deletedAt, cutoffDate));
    const conditions = filter ? and(baseCondition, filter) : baseCondition;
    const result = await db.delete(interactions)
      .where(conditions)
      .returning();
    return result.length;
  }
  
  async deleteInteraction(id: string, ctx?: TenantContext): Promise<void> {
    const filter = this.getTenantFilter(interactions, ctx);
    const conditions = filter ? and(eq(interactions.id, id), filter) : eq(interactions.id, id);
    await db.delete(interactions).where(conditions);
  }
  
  async getLatestInteractionDates(ctx?: TenantContext): Promise<Map<string, Date>> {
    const filter = this.getTenantFilter(interactions, ctx);
    const baseCondition = and(
      isNotNull(interactions.personId),
      isNull(interactions.deletedAt)
    );
    const conditions = filter ? and(baseCondition, filter) : baseCondition;
    const results = await db
      .select({
        personId: interactions.personId,
        latestDate: sql<string>`MAX(${interactions.occurredAt})`,
      })
      .from(interactions)
      .where(conditions)
      .groupBy(interactions.personId);
    
    const dateMap = new Map<string, Date>();
    for (const row of results) {
      if (row.personId && row.latestDate) {
        dateMap.set(row.personId, new Date(row.latestDate));
      }
    }
    return dateMap;
  }
  
  // Interaction Participants - Multi-person event tracking
  async getInteractionParticipants(interactionId: string): Promise<InteractionParticipant[]> {
    return await db
      .select()
      .from(interactionParticipants)
      .where(eq(interactionParticipants.interactionId, interactionId));
  }
  
  async getInteractionsByParticipant(personId: string): Promise<Interaction[]> {
    const participantRows = await db
      .select({ interactionId: interactionParticipants.interactionId })
      .from(interactionParticipants)
      .where(eq(interactionParticipants.personId, personId));
    
    const interactionIds = participantRows.map(r => r.interactionId);
    if (interactionIds.length === 0) return [];
    
    return await db
      .select()
      .from(interactions)
      .where(and(
        sql`${interactions.id} IN (${sql.join(interactionIds.map(id => sql`${id}`), sql`, `)})`,
        isNull(interactions.deletedAt)
      ))
      .orderBy(desc(interactions.occurredAt));
  }
  
  async addInteractionParticipant(participant: InsertInteractionParticipant): Promise<InteractionParticipant> {
    const [created] = await db.insert(interactionParticipants).values(participant).returning();
    return created;
  }
  
  async removeInteractionParticipant(interactionId: string, personId: string): Promise<void> {
    await db.delete(interactionParticipants).where(
      and(
        eq(interactionParticipants.interactionId, interactionId),
        eq(interactionParticipants.personId, personId)
      )
    );
  }
  
  async updateInteractionParticipant(id: string, data: Partial<InsertInteractionParticipant>): Promise<InteractionParticipant | undefined> {
    const [updated] = await db
      .update(interactionParticipants)
      .set(data)
      .where(eq(interactionParticipants.id, id))
      .returning();
    return updated || undefined;
  }
  
  async getAllInteractionsWithParticipants(): Promise<(Interaction & { participantsList: (InteractionParticipant & { person?: Person })[] })[]> {
    const allInteractions = await db
      .select()
      .from(interactions)
      .where(isNull(interactions.deletedAt))
      .orderBy(desc(interactions.occurredAt));
    
    const allParticipants = await db
      .select()
      .from(interactionParticipants);
    
    const allPeople = await db.select().from(people);
    const peopleMap = new Map(allPeople.map(p => [p.id, p]));
    
    const participantsByInteraction = new Map<string, (InteractionParticipant & { person?: Person })[]>();
    for (const p of allParticipants) {
      const list = participantsByInteraction.get(p.interactionId) || [];
      list.push({ ...p, person: peopleMap.get(p.personId) });
      participantsByInteraction.set(p.interactionId, list);
    }
    
    return allInteractions.map(i => ({
      ...i,
      participantsList: participantsByInteraction.get(i.id) || []
    }));
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
  
  async createGeneratedDraft(insertDraft: InsertGeneratedDraft, ctx?: TenantContext): Promise<GeneratedDraft> {
    const userId = getEffectiveUserId(ctx);
    const [draft] = await db
      .insert(generatedDrafts)
      .values({ ...insertDraft, userId, updatedAt: new Date() })
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
  async getAllVoiceProfiles(ctx?: TenantContext): Promise<VoiceProfile[]> {
    const userId = getEffectiveUserId(ctx);
    return await db.select().from(voiceProfile)
      .where(eq(voiceProfile.userId, userId))
      .orderBy(desc(voiceProfile.frequency));
  }
  
  async getVoiceProfilesByCategory(category: string, ctx?: TenantContext): Promise<VoiceProfile[]> {
    const userId = getEffectiveUserId(ctx);
    return await db.select().from(voiceProfile)
      .where(and(eq(voiceProfile.category, category), eq(voiceProfile.userId, userId)))
      .orderBy(desc(voiceProfile.frequency));
  }
  
  async createVoiceProfile(insertProfile: InsertVoiceProfile, ctx?: TenantContext): Promise<VoiceProfile> {
    const userId = getEffectiveUserId(ctx);
    const [profile] = await db
      .insert(voiceProfile)
      .values({ ...insertProfile, userId, updatedAt: new Date() })
      .returning();
    return profile;
  }
  
  async updateVoiceProfile(id: string, profile: Partial<InsertVoiceProfile>, ctx?: TenantContext): Promise<VoiceProfile | undefined> {
    const userId = getEffectiveUserId(ctx);
    const [updated] = await db
      .update(voiceProfile)
      .set({ ...profile, updatedAt: new Date() })
      .where(and(eq(voiceProfile.id, id), eq(voiceProfile.userId, userId)))
      .returning();
    return updated || undefined;
  }
  
  async deleteVoiceProfile(id: string, ctx?: TenantContext): Promise<void> {
    const userId = getEffectiveUserId(ctx);
    await db.delete(voiceProfile).where(and(eq(voiceProfile.id, id), eq(voiceProfile.userId, userId)));
  }
  
  async upsertVoicePattern(category: string, value: string, context?: string, source?: string, ctx?: TenantContext): Promise<VoiceProfile> {
    const userId = getEffectiveUserId(ctx);
    // Check if this pattern already exists for this user
    const [existing] = await db.select().from(voiceProfile)
      .where(and(eq(voiceProfile.category, category), eq(voiceProfile.value, value), eq(voiceProfile.userId, userId)));
    
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
      .values({ category, value, context, source, userId, frequency: 1, updatedAt: new Date() })
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
  
  // 8x8 Campaigns
  async getAll8x8Campaigns(): Promise<EightByEightCampaign[]> {
    return await db.select().from(eightByEightCampaigns).orderBy(desc(eightByEightCampaigns.createdAt));
  }
  
  async get8x8Campaign(id: string): Promise<EightByEightCampaign | undefined> {
    const [campaign] = await db.select().from(eightByEightCampaigns).where(eq(eightByEightCampaigns.id, id));
    return campaign || undefined;
  }
  
  async get8x8CampaignByPerson(personId: string): Promise<EightByEightCampaign | undefined> {
    const [campaign] = await db.select().from(eightByEightCampaigns)
      .where(and(
        eq(eightByEightCampaigns.personId, personId),
        eq(eightByEightCampaigns.status, 'active')
      ));
    return campaign || undefined;
  }
  
  async create8x8Campaign(campaign: InsertEightByEightCampaign): Promise<EightByEightCampaign> {
    const [created] = await db.insert(eightByEightCampaigns).values(campaign).returning();
    return created;
  }
  
  async update8x8Campaign(id: string, campaign: Partial<InsertEightByEightCampaign>): Promise<EightByEightCampaign | undefined> {
    const [updated] = await db.update(eightByEightCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(eightByEightCampaigns.id, id))
      .returning();
    return updated || undefined;
  }
  
  async delete8x8Campaign(id: string): Promise<void> {
    await db.delete(eightByEightCampaigns).where(eq(eightByEightCampaigns.id, id));
  }
  
  // D Contact Review
  async getStaleDContacts(): Promise<Person[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const allDContacts = await db.select().from(people)
      .where(sql`UPPER(SUBSTRING(${people.segment}, 1, 1)) = 'D'`);
    
    // Filter to those in segment for 6+ months
    return allDContacts.filter(p => {
      if (!p.segmentEnteredAt) {
        // If no entry date, use createdAt as fallback
        return p.createdAt < sixMonthsAgo;
      }
      return new Date(p.segmentEnteredAt) < sixMonthsAgo;
    });
  }
  
  async getLowEngagementDContacts(): Promise<Person[]> {
    return await db.select().from(people)
      .where(and(
        sql`UPPER(SUBSTRING(${people.segment}, 1, 1)) = 'D'`,
        gte(people.contactAttempts, 3),
        eq(people.contactResponses, 0)
      ));
  }
  
  async getDContactsNeedingReview(): Promise<DContactReviewResult[]> {
    const results: DContactReviewResult[] = [];
    const now = new Date();
    
    // Get all D contacts
    const allDContacts = await db.select().from(people)
      .where(sql`UPPER(SUBSTRING(${people.segment}, 1, 1)) = 'D'`);
    
    // Get completed 8x8 campaigns
    const completedCampaigns = await db.select().from(eightByEightCampaigns)
      .where(eq(eightByEightCampaigns.status, 'completed'));
    const completedPersonIds = new Set(completedCampaigns.map(c => c.personId));
    
    // Get active campaigns for reference
    const activeCampaigns = await db.select().from(eightByEightCampaigns)
      .where(eq(eightByEightCampaigns.status, 'active'));
    const activeCampaignMap = new Map(activeCampaigns.map(c => [c.personId, c]));
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    for (const person of allDContacts) {
      const enteredAt = person.segmentEnteredAt ? new Date(person.segmentEnteredAt) : person.createdAt;
      const monthsInSegment = Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      // Check for completed campaign
      if (completedPersonIds.has(person.id)) {
        results.push({
          person,
          reason: 'campaign_completed',
          monthsInSegment,
          contactAttempts: person.contactAttempts || 0,
          contactResponses: person.contactResponses || 0,
          activeCampaign: undefined,
        });
        continue;
      }
      
      // Check for low engagement
      if ((person.contactAttempts || 0) >= 3 && (person.contactResponses || 0) === 0) {
        results.push({
          person,
          reason: 'low_engagement',
          monthsInSegment,
          contactAttempts: person.contactAttempts || 0,
          contactResponses: person.contactResponses || 0,
          activeCampaign: activeCampaignMap.get(person.id),
        });
        continue;
      }
      
      // Check for stale (6+ months)
      if (enteredAt < sixMonthsAgo) {
        results.push({
          person,
          reason: 'stale',
          monthsInSegment,
          contactAttempts: person.contactAttempts || 0,
          contactResponses: person.contactResponses || 0,
          activeCampaign: activeCampaignMap.get(person.id),
        });
      }
    }
    
    // Sort by months in segment descending
    results.sort((a, b) => b.monthsInSegment - a.monthsInSegment);
    
    return results;
  }
  
  async flagContactForReview(personId: string, status: string): Promise<Person | undefined> {
    const [updated] = await db.update(people)
      .set({ reviewStatus: status, updatedAt: new Date() })
      .where(eq(people.id, personId))
      .returning();
    return updated || undefined;
  }
  
  // Handwritten Note Uploads
  async getAllHandwrittenNoteUploads(): Promise<HandwrittenNoteUpload[]> {
    return await db.select().from(handwrittenNoteUploads).orderBy(desc(handwrittenNoteUploads.createdAt));
  }
  
  async getHandwrittenNoteUploadsByStatus(status: string): Promise<HandwrittenNoteUpload[]> {
    return await db.select().from(handwrittenNoteUploads)
      .where(eq(handwrittenNoteUploads.status, status))
      .orderBy(desc(handwrittenNoteUploads.createdAt));
  }
  
  async getHandwrittenNoteUpload(id: string): Promise<HandwrittenNoteUpload | undefined> {
    const [upload] = await db.select().from(handwrittenNoteUploads).where(eq(handwrittenNoteUploads.id, id));
    return upload || undefined;
  }
  
  async createHandwrittenNoteUpload(upload: InsertHandwrittenNoteUpload): Promise<HandwrittenNoteUpload> {
    const [created] = await db.insert(handwrittenNoteUploads).values(upload).returning();
    return created;
  }
  
  async updateHandwrittenNoteUpload(id: string, upload: Partial<InsertHandwrittenNoteUpload>): Promise<HandwrittenNoteUpload | undefined> {
    const [updated] = await db.update(handwrittenNoteUploads)
      .set({ ...upload, updatedAt: new Date() })
      .where(eq(handwrittenNoteUploads.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteHandwrittenNoteUpload(id: string): Promise<void> {
    await db.delete(handwrittenNoteUploads).where(eq(handwrittenNoteUploads.id, id));
  }
  
  // Content Topics
  async getAllContentTopics(ctx?: TenantContext): Promise<ContentTopic[]> {
    const userId = getEffectiveUserId(ctx);
    if (userId) {
      return await db.select().from(contentTopics)
        .where(eq(contentTopics.userId, userId))
        .orderBy(desc(contentTopics.mentionCount));
    }
    return await db.select().from(contentTopics).orderBy(desc(contentTopics.mentionCount));
  }
  
  async getActiveContentTopics(ctx?: TenantContext): Promise<ContentTopic[]> {
    const userId = getEffectiveUserId(ctx);
    if (userId) {
      return await db.select().from(contentTopics)
        .where(and(eq(contentTopics.userId, userId), eq(contentTopics.status, 'active')))
        .orderBy(desc(contentTopics.mentionCount));
    }
    return await db.select().from(contentTopics)
      .where(eq(contentTopics.status, 'active'))
      .orderBy(desc(contentTopics.mentionCount));
  }
  
  async getContentTopic(id: string, ctx?: TenantContext): Promise<ContentTopic | undefined> {
    const [topic] = await db.select().from(contentTopics).where(eq(contentTopics.id, id));
    return topic || undefined;
  }
  
  async createContentTopic(topic: InsertContentTopic, ctx?: TenantContext): Promise<ContentTopic> {
    const userId = getEffectiveUserId(ctx);
    const [created] = await db.insert(contentTopics).values({ ...topic, userId }).returning();
    return created;
  }
  
  async updateContentTopic(id: string, topic: Partial<InsertContentTopic>, ctx?: TenantContext): Promise<ContentTopic | undefined> {
    const [updated] = await db.update(contentTopics)
      .set({ ...topic, updatedAt: new Date() })
      .where(eq(contentTopics.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteContentTopic(id: string, ctx?: TenantContext): Promise<void> {
    await db.delete(contentTopics).where(eq(contentTopics.id, id));
  }
  
  async incrementTopicMention(id: string, quote?: string, interactionId?: string, ctx?: TenantContext): Promise<ContentTopic | undefined> {
    const existing = await this.getContentTopic(id, ctx);
    if (!existing) return undefined;
    
    const updates: Partial<ContentTopic> = {
      mentionCount: (existing.mentionCount || 0) + 1,
      lastMentionedAt: new Date(),
    };
    
    if (quote) {
      const quotes = existing.sampleQuotes || [];
      if (quotes.length < 10) {
        updates.sampleQuotes = [...quotes, quote];
      }
    }
    
    if (interactionId) {
      const ids = existing.relatedInteractionIds || [];
      if (!ids.includes(interactionId)) {
        updates.relatedInteractionIds = [...ids, interactionId];
      }
    }
    
    const [updated] = await db.update(contentTopics)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentTopics.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Content Ideas
  async getAllContentIdeas(ctx?: TenantContext): Promise<ContentIdea[]> {
    const userId = getEffectiveUserId(ctx);
    return await db.select().from(contentIdeas)
      .where(eq(contentIdeas.userId, userId))
      .orderBy(desc(contentIdeas.priority), desc(contentIdeas.createdAt));
  }
  
  async getContentIdeasByTopic(topicId: string, ctx?: TenantContext): Promise<ContentIdea[]> {
    const userId = getEffectiveUserId(ctx);
    return await db.select().from(contentIdeas)
      .where(and(eq(contentIdeas.topicId, topicId), eq(contentIdeas.userId, userId)))
      .orderBy(desc(contentIdeas.priority));
  }
  
  async getContentIdeasByStatus(status: string, ctx?: TenantContext): Promise<ContentIdea[]> {
    const userId = getEffectiveUserId(ctx);
    return await db.select().from(contentIdeas)
      .where(and(eq(contentIdeas.status, status), eq(contentIdeas.userId, userId)))
      .orderBy(desc(contentIdeas.priority));
  }
  
  async getContentIdea(id: string, ctx?: TenantContext): Promise<ContentIdea | undefined> {
    const userId = getEffectiveUserId(ctx);
    const [idea] = await db.select().from(contentIdeas)
      .where(and(eq(contentIdeas.id, id), eq(contentIdeas.userId, userId)));
    return idea || undefined;
  }
  
  async createContentIdea(idea: InsertContentIdea, ctx?: TenantContext): Promise<ContentIdea> {
    const userId = getEffectiveUserId(ctx);
    const [created] = await db.insert(contentIdeas).values({ ...idea, userId }).returning();
    return created;
  }
  
  async updateContentIdea(id: string, idea: Partial<InsertContentIdea>, ctx?: TenantContext): Promise<ContentIdea | undefined> {
    const userId = getEffectiveUserId(ctx);
    const [updated] = await db.update(contentIdeas)
      .set({ ...idea, updatedAt: new Date() })
      .where(and(eq(contentIdeas.id, id), eq(contentIdeas.userId, userId)))
      .returning();
    return updated || undefined;
  }
  
  async deleteContentIdea(id: string, ctx?: TenantContext): Promise<void> {
    const userId = getEffectiveUserId(ctx);
    await db.delete(contentIdeas).where(and(eq(contentIdeas.id, id), eq(contentIdeas.userId, userId)));
  }
  
  // Content Calendar
  async getAllContentCalendarItems(): Promise<ContentCalendarItem[]> {
    return await db.select().from(contentCalendar).orderBy(contentCalendar.scheduledDate);
  }
  
  async getContentCalendarByDateRange(start: Date, end: Date): Promise<ContentCalendarItem[]> {
    return await db.select().from(contentCalendar)
      .where(and(
        gte(contentCalendar.scheduledDate, start),
        lte(contentCalendar.scheduledDate, end)
      ))
      .orderBy(contentCalendar.scheduledDate);
  }
  
  async getContentCalendarItem(id: string): Promise<ContentCalendarItem | undefined> {
    const [item] = await db.select().from(contentCalendar).where(eq(contentCalendar.id, id));
    return item || undefined;
  }
  
  async createContentCalendarItem(item: InsertContentCalendar): Promise<ContentCalendarItem> {
    const [created] = await db.insert(contentCalendar).values(item).returning();
    return created;
  }
  
  async updateContentCalendarItem(id: string, item: Partial<InsertContentCalendar>): Promise<ContentCalendarItem | undefined> {
    const [updated] = await db.update(contentCalendar)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(contentCalendar.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteContentCalendarItem(id: string): Promise<void> {
    await db.delete(contentCalendar).where(eq(contentCalendar.id, id));
  }
  
  // Listening Analysis - NVC + Question-Based Selling
  async getAllListeningAnalysis(): Promise<ListeningAnalysis[]> {
    return await db.select().from(listeningAnalysis).orderBy(desc(listeningAnalysis.createdAt));
  }
  
  async getListeningAnalysisByInteraction(interactionId: string): Promise<ListeningAnalysis | undefined> {
    const [analysis] = await db.select().from(listeningAnalysis)
      .where(eq(listeningAnalysis.interactionId, interactionId));
    return analysis || undefined;
  }
  
  async createListeningAnalysis(analysis: InsertListeningAnalysis): Promise<ListeningAnalysis> {
    const [created] = await db.insert(listeningAnalysis).values(analysis).returning();
    return created;
  }
  
  async getInteractionsWithTranscripts(): Promise<Interaction[]> {
    return await db.select().from(interactions)
      .where(and(
        isNotNull(interactions.transcript),
        isNull(interactions.deletedAt)
      ))
      .orderBy(desc(interactions.occurredAt));
  }
  
  // Coaching Insights
  async getAllCoachingInsights(): Promise<CoachingInsight[]> {
    return await db.select().from(coachingInsights).orderBy(desc(coachingInsights.createdAt));
  }
  
  async getActiveCoachingInsights(): Promise<CoachingInsight[]> {
    return await db.select().from(coachingInsights)
      .where(eq(coachingInsights.status, "active"))
      .orderBy(desc(coachingInsights.confidenceScore));
  }
  
  async getCoachingInsight(id: string): Promise<CoachingInsight | undefined> {
    const [insight] = await db.select().from(coachingInsights).where(eq(coachingInsights.id, id));
    return insight || undefined;
  }
  
  async createCoachingInsight(insight: InsertCoachingInsight): Promise<CoachingInsight> {
    const [created] = await db.insert(coachingInsights).values(insight).returning();
    return created;
  }
  
  async updateCoachingInsight(id: string, insight: Partial<InsertCoachingInsight>): Promise<CoachingInsight | undefined> {
    const [updated] = await db.update(coachingInsights)
      .set({ ...insight, updatedAt: new Date() })
      .where(eq(coachingInsights.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteCoachingInsight(id: string): Promise<void> {
    await db.delete(coachingInsights).where(eq(coachingInsights.id, id));
  }
  
  // Listening Patterns
  async getAllListeningPatterns(): Promise<ListeningPattern[]> {
    return await db.select().from(listeningPatterns).orderBy(desc(listeningPatterns.frequency));
  }
  
  async getListeningPattern(id: string): Promise<ListeningPattern | undefined> {
    const [pattern] = await db.select().from(listeningPatterns).where(eq(listeningPatterns.id, id));
    return pattern || undefined;
  }
  
  async createListeningPattern(pattern: InsertListeningPattern): Promise<ListeningPattern> {
    const [created] = await db.insert(listeningPatterns).values(pattern).returning();
    return created;
  }
  
  async updateListeningPattern(id: string, pattern: Partial<InsertListeningPattern>): Promise<ListeningPattern | undefined> {
    const [updated] = await db.update(listeningPatterns)
      .set({ ...pattern, updatedAt: new Date() })
      .where(eq(listeningPatterns.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Dashboard Widgets
  async getAllDashboardWidgets(): Promise<DashboardWidget[]> {
    return await db.select().from(dashboardWidgets)
      .where(eq(dashboardWidgets.isVisible, true))
      .orderBy(dashboardWidgets.position);
  }
  
  async getDashboardWidget(id: string): Promise<DashboardWidget | undefined> {
    const [widget] = await db.select().from(dashboardWidgets).where(eq(dashboardWidgets.id, id));
    return widget || undefined;
  }
  
  async createDashboardWidget(widget: InsertDashboardWidget): Promise<DashboardWidget> {
    const [created] = await db.insert(dashboardWidgets).values(widget).returning();
    return created;
  }
  
  async updateDashboardWidget(id: string, widget: Partial<InsertDashboardWidget>): Promise<DashboardWidget | undefined> {
    const [updated] = await db.update(dashboardWidgets)
      .set({ ...widget, updatedAt: new Date() })
      .where(eq(dashboardWidgets.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteDashboardWidget(id: string): Promise<void> {
    await db.delete(dashboardWidgets).where(eq(dashboardWidgets.id, id));
  }
  
  async updateDashboardWidgetPositions(widgets: { id: string; position: number }[]): Promise<void> {
    for (const { id, position } of widgets) {
      await db.update(dashboardWidgets)
        .set({ position, updatedAt: new Date() })
        .where(eq(dashboardWidgets.id, id));
    }
  }
  
  // Life Event Alerts
  async getAllLifeEventAlerts(): Promise<LifeEventAlert[]> {
    return await db.select().from(lifeEventAlerts).orderBy(desc(lifeEventAlerts.detectedAt));
  }
  
  async getLifeEventAlert(id: string): Promise<LifeEventAlert | undefined> {
    const [alert] = await db.select().from(lifeEventAlerts).where(eq(lifeEventAlerts.id, id));
    return alert || undefined;
  }
  
  async getLifeEventAlertsByPerson(personId: string): Promise<LifeEventAlert[]> {
    return await db.select().from(lifeEventAlerts)
      .where(eq(lifeEventAlerts.personId, personId))
      .orderBy(desc(lifeEventAlerts.detectedAt));
  }
  
  async createLifeEventAlert(alert: InsertLifeEventAlert): Promise<LifeEventAlert> {
    const [created] = await db.insert(lifeEventAlerts).values(alert).returning();
    return created;
  }
  
  async updateLifeEventAlert(id: string, alert: Partial<InsertLifeEventAlert>): Promise<LifeEventAlert | undefined> {
    const [updated] = await db.update(lifeEventAlerts)
      .set({ ...alert, updatedAt: new Date() })
      .where(eq(lifeEventAlerts.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteLifeEventAlert(id: string): Promise<void> {
    await db.delete(lifeEventAlerts).where(eq(lifeEventAlerts.id, id));
  }
  
  async getPersonFullContext(personId: string): Promise<PersonFullContext | undefined> {
    const person = await this.getPerson(personId);
    if (!person) return undefined;
    
    const [personDeals, personInteractions, personNotes, personAlerts, personDrafts] = await Promise.all([
      db.select().from(deals).where(eq(deals.personId, personId)).orderBy(desc(deals.createdAt)),
      db.select().from(interactions).where(and(eq(interactions.personId, personId), isNull(interactions.deletedAt))).orderBy(desc(interactions.occurredAt)),
      db.select().from(notes).where(eq(notes.personId, personId)).orderBy(desc(notes.createdAt)),
      db.select().from(lifeEventAlerts).where(eq(lifeEventAlerts.personId, personId)).orderBy(desc(lifeEventAlerts.detectedAt)),
      db.select().from(generatedDrafts).where(eq(generatedDrafts.personId, personId)).orderBy(desc(generatedDrafts.createdAt)),
    ]);
    
    const lastTouchpoint = person.lastContact;
    const daysSinceContact = lastTouchpoint 
      ? Math.floor((Date.now() - new Date(lastTouchpoint).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    const fordFields = [person.fordFamily, person.fordOccupation, person.fordRecreation, person.fordDreams];
    const fordFilled = fordFields.filter(f => f && f.trim().length > 0).length;
    const fordCompleteness = Math.round((fordFilled / 4) * 100);
    
    const relationshipScore = this.calculateRelationshipScore(person, personInteractions, fordCompleteness, daysSinceContact);
    
    const suggestedNextAction = this.getSuggestedNextAction(person, personInteractions, fordCompleteness, daysSinceContact);
    
    return {
      person,
      deals: personDeals,
      interactions: personInteractions,
      notes: personNotes,
      lifeEventAlerts: personAlerts,
      generatedDrafts: personDrafts,
      relationshipScore,
      lastTouchpoint,
      daysSinceContact,
      fordCompleteness,
      suggestedNextAction,
    };
  }
  
  private calculateRelationshipScore(
    person: Person, 
    interactions: Interaction[], 
    fordCompleteness: number, 
    daysSinceContact: number | null
  ): number {
    let score = 0;
    
    // FORD completeness (up to 25 points)
    score += fordCompleteness * 0.25;
    
    // Recency of contact (up to 25 points)
    if (daysSinceContact === null) {
      score += 0;
    } else if (daysSinceContact <= 7) {
      score += 25;
    } else if (daysSinceContact <= 30) {
      score += 20;
    } else if (daysSinceContact <= 60) {
      score += 15;
    } else if (daysSinceContact <= 90) {
      score += 10;
    } else if (daysSinceContact <= 180) {
      score += 5;
    }
    
    // Interaction frequency - last 90 days (up to 25 points)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentInteractions = interactions.filter(i => 
      i.occurredAt && new Date(i.occurredAt) >= ninetyDaysAgo
    ).length;
    score += Math.min(recentInteractions * 5, 25);
    
    // Interaction diversity - types used (up to 15 points)
    const interactionTypes = new Set(interactions.map(i => i.type));
    score += Math.min(interactionTypes.size * 5, 15);
    
    // Segment bonus (up to 10 points)
    if (person.segment === 'A') score += 10;
    else if (person.segment === 'B') score += 7;
    else if (person.segment === 'C') score += 4;
    
    return Math.min(Math.round(score), 100);
  }
  
  private getSuggestedNextAction(
    person: Person, 
    interactions: Interaction[], 
    fordCompleteness: number, 
    daysSinceContact: number | null
  ): string | null {
    // Priority 1: No contact ever
    if (daysSinceContact === null) {
      return "Make initial contact - introduce yourself";
    }
    
    // Priority 2: Very stale relationship
    if (daysSinceContact > 90) {
      return "Reconnect - it's been over 3 months";
    }
    
    // Priority 3: Missing FORD info
    if (fordCompleteness < 50) {
      const missing = [];
      if (!person.fordFamily) missing.push("Family");
      if (!person.fordOccupation) missing.push("Occupation");
      if (!person.fordRecreation) missing.push("Recreation");
      if (!person.fordDreams) missing.push("Dreams");
      return `Learn more about their ${missing[0]}`;
    }
    
    // Priority 4: Segment-based cadence
    const cadenceDays: Record<string, number> = { 'A': 14, 'B': 30, 'C': 60, 'D': 90 };
    const targetDays = cadenceDays[person.segment || 'C'] || 60;
    if (daysSinceContact > targetDays) {
      return `Schedule a touchpoint - ${person.segment || 'C'} contacts need attention every ${targetDays} days`;
    }
    
    // Priority 5: Vary interaction type
    const recentTypes = new Set(
      interactions.slice(0, 5).map(i => i.type)
    );
    if (!recentTypes.has('call') && !recentTypes.has('meeting')) {
      return "Schedule a call or meeting - recent contacts have been text-based";
    }
    
    return "Relationship is healthy - continue regular touchpoints";
  }
  
  // Leads - Top of funnel
  async getAllLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }
  
  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }
  
  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return await db.select().from(leads)
      .where(eq(leads.status, status))
      .orderBy(desc(leads.createdAt));
  }
  
  async getLeadsBySource(source: string): Promise<Lead[]> {
    return await db.select().from(leads)
      .where(eq(leads.source, source))
      .orderBy(desc(leads.createdAt));
  }
  
  async getNewLeads(): Promise<Lead[]> {
    return await db.select().from(leads)
      .where(eq(leads.status, 'new'))
      .orderBy(desc(leads.createdAt));
  }
  
  async findDuplicateLead(email?: string, phone?: string): Promise<Lead | undefined> {
    if (!email && !phone) return undefined;
    
    const conditions = [];
    if (email) conditions.push(eq(leads.email, email));
    if (phone) conditions.push(eq(leads.phone, phone));
    
    const [match] = await db.select().from(leads)
      .where(or(...conditions))
      .limit(1);
    
    return match || undefined;
  }
  
  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }
  
  async updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db.update(leads)
      .set({ ...lead, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteLead(id: string): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }
  
  async convertLeadToPerson(leadId: string): Promise<{ lead: Lead; person: Person } | undefined> {
    const lead = await this.getLead(leadId);
    if (!lead) return undefined;
    
    const person = await this.createPerson({
      name: lead.name,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      notes: lead.notes || undefined,
      segment: 'D',
    });
    
    const updatedLead = await this.updateLead(leadId, {
      status: 'converted',
      personId: person.id,
      convertedAt: new Date(),
    });
    
    return updatedLead ? { lead: updatedLead, person } : undefined;
  }
  
  // System Events - Event Bus
  async getAllSystemEvents(limit: number = 100): Promise<SystemEvent[]> {
    return await db.select().from(systemEvents).orderBy(desc(systemEvents.createdAt)).limit(limit);
  }
  
  async getSystemEvent(id: string): Promise<SystemEvent | undefined> {
    const [event] = await db.select().from(systemEvents).where(eq(systemEvents.id, id));
    return event || undefined;
  }
  
  async getSystemEventsByType(eventType: string, limit: number = 50): Promise<SystemEvent[]> {
    return await db.select().from(systemEvents)
      .where(eq(systemEvents.eventType, eventType))
      .orderBy(desc(systemEvents.createdAt))
      .limit(limit);
  }
  
  async getSystemEventsByCategory(category: string, limit: number = 50): Promise<SystemEvent[]> {
    return await db.select().from(systemEvents)
      .where(eq(systemEvents.eventCategory, category))
      .orderBy(desc(systemEvents.createdAt))
      .limit(limit);
  }
  
  async getSystemEventsByPerson(personId: string, limit: number = 50): Promise<SystemEvent[]> {
    return await db.select().from(systemEvents)
      .where(eq(systemEvents.personId, personId))
      .orderBy(desc(systemEvents.createdAt))
      .limit(limit);
  }
  
  async getUnprocessedEvents(): Promise<SystemEvent[]> {
    return await db.select().from(systemEvents)
      .where(isNull(systemEvents.processedAt))
      .orderBy(systemEvents.createdAt);
  }
  
  async createSystemEvent(event: InsertSystemEvent): Promise<SystemEvent> {
    const [created] = await db.insert(systemEvents).values(event).returning();
    return created;
  }
  
  async markEventProcessed(id: string, processedBy: string[]): Promise<SystemEvent | undefined> {
    const [updated] = await db.update(systemEvents)
      .set({ processedAt: new Date(), processedBy })
      .where(eq(systemEvents.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Agent Actions - Approval Workflow
  async getAllAgentActions(limit: number = 100): Promise<AgentAction[]> {
    return await db.select().from(agentActions).orderBy(desc(agentActions.createdAt)).limit(limit);
  }
  
  async getAgentAction(id: string): Promise<AgentAction | undefined> {
    const [action] = await db.select().from(agentActions).where(eq(agentActions.id, id));
    return action || undefined;
  }
  
  async getAgentActionsByStatus(status: string, limit: number = 50): Promise<AgentAction[]> {
    return await db.select().from(agentActions)
      .where(eq(agentActions.status, status))
      .orderBy(desc(agentActions.createdAt))
      .limit(limit);
  }
  
  async getAgentActionsByAgent(agentName: string, limit: number = 50): Promise<AgentAction[]> {
    return await db.select().from(agentActions)
      .where(eq(agentActions.agentName, agentName))
      .orderBy(desc(agentActions.createdAt))
      .limit(limit);
  }
  
  async getPendingApprovals(): Promise<AgentAction[]> {
    return await db.select().from(agentActions)
      .where(and(
        eq(agentActions.status, 'proposed'),
        or(eq(agentActions.riskLevel, 'high'), eq(agentActions.riskLevel, 'medium'))
      ))
      .orderBy(desc(agentActions.createdAt));
  }
  
  async createAgentAction(action: InsertAgentAction): Promise<AgentAction> {
    const [created] = await db.insert(agentActions).values(action).returning();
    return created;
  }
  
  async updateAgentAction(id: string, action: Partial<InsertAgentAction>): Promise<AgentAction | undefined> {
    const [updated] = await db.update(agentActions)
      .set({ ...action, updatedAt: new Date() })
      .where(eq(agentActions.id, id))
      .returning();
    return updated || undefined;
  }
  
  async approveAgentAction(id: string, approvedBy: string): Promise<AgentAction | undefined> {
    const [updated] = await db.update(agentActions)
      .set({ status: 'approved', approvedBy, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(agentActions.id, id))
      .returning();
    return updated || undefined;
  }
  
  async rejectAgentAction(id: string): Promise<AgentAction | undefined> {
    const [updated] = await db.update(agentActions)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(agentActions.id, id))
      .returning();
    return updated || undefined;
  }
  
  async markAgentActionExecuted(id: string, targetEntityId?: string): Promise<AgentAction | undefined> {
    const [updated] = await db.update(agentActions)
      .set({ 
        status: 'executed', 
        executedAt: new Date(), 
        targetEntityId: targetEntityId || null,
        updatedAt: new Date() 
      })
      .where(eq(agentActions.id, id))
      .returning();
    return updated || undefined;
  }
  
  async markAgentActionFailed(id: string, errorMessage: string): Promise<AgentAction | undefined> {
    const [updated] = await db.update(agentActions)
      .set({ status: 'failed', errorMessage, updatedAt: new Date() })
      .where(eq(agentActions.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Agent Subscriptions
  async getAllAgentSubscriptions(): Promise<AgentSubscription[]> {
    return await db.select().from(agentSubscriptions).orderBy(desc(agentSubscriptions.priority));
  }
  
  async getActiveSubscriptionsForEvent(eventType: string): Promise<AgentSubscription[]> {
    return await db.select().from(agentSubscriptions)
      .where(and(
        eq(agentSubscriptions.eventType, eventType),
        eq(agentSubscriptions.isActive, true)
      ))
      .orderBy(desc(agentSubscriptions.priority));
  }
  
  async createAgentSubscription(subscription: InsertAgentSubscription): Promise<AgentSubscription> {
    const [created] = await db.insert(agentSubscriptions).values(subscription).returning();
    return created;
  }
  
  async updateAgentSubscription(id: string, subscription: Partial<InsertAgentSubscription>): Promise<AgentSubscription | undefined> {
    const [updated] = await db.update(agentSubscriptions)
      .set(subscription)
      .where(eq(agentSubscriptions.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteAgentSubscription(id: string): Promise<void> {
    await db.delete(agentSubscriptions).where(eq(agentSubscriptions.id, id));
  }
  
  // Observer Suggestions - AI Chief of Staff proactive suggestions
  async getAllObserverSuggestions(limit: number = 50): Promise<ObserverSuggestion[]> {
    return await db.select().from(observerSuggestions)
      .orderBy(desc(observerSuggestions.createdAt))
      .limit(limit);
  }
  
  async getPendingObserverSuggestions(): Promise<ObserverSuggestion[]> {
    const now = new Date();
    return await db.select().from(observerSuggestions)
      .where(and(
        eq(observerSuggestions.status, 'pending'),
        or(
          isNull(observerSuggestions.expiresAt),
          gte(observerSuggestions.expiresAt, now)
        ),
        or(
          isNull(observerSuggestions.snoozeUntil),
          lt(observerSuggestions.snoozeUntil, now)
        )
      ))
      .orderBy(desc(observerSuggestions.confidence), desc(observerSuggestions.createdAt));
  }
  
  async getObserverSuggestion(id: string): Promise<ObserverSuggestion | undefined> {
    const [suggestion] = await db.select().from(observerSuggestions)
      .where(eq(observerSuggestions.id, id));
    return suggestion || undefined;
  }
  
  async createObserverSuggestion(suggestion: InsertObserverSuggestion): Promise<ObserverSuggestion> {
    const [created] = await db.insert(observerSuggestions).values(suggestion).returning();
    return created;
  }
  
  async updateObserverSuggestion(id: string, suggestion: Partial<InsertObserverSuggestion>): Promise<ObserverSuggestion | undefined> {
    const [updated] = await db.update(observerSuggestions)
      .set(suggestion)
      .where(eq(observerSuggestions.id, id))
      .returning();
    return updated || undefined;
  }
  
  async acceptObserverSuggestion(id: string): Promise<ObserverSuggestion | undefined> {
    const [updated] = await db.update(observerSuggestions)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(eq(observerSuggestions.id, id))
      .returning();
    return updated || undefined;
  }
  
  async snoozeObserverSuggestion(id: string, until: Date): Promise<ObserverSuggestion | undefined> {
    const [updated] = await db.update(observerSuggestions)
      .set({ status: 'snoozed', snoozeUntil: until })
      .where(eq(observerSuggestions.id, id))
      .returning();
    return updated || undefined;
  }
  
  async dismissObserverSuggestion(id: string, feedbackNote?: string): Promise<ObserverSuggestion | undefined> {
    const [updated] = await db.update(observerSuggestions)
      .set({ status: 'dismissed', dismissedAt: new Date(), feedbackNote: feedbackNote || null })
      .where(eq(observerSuggestions.id, id))
      .returning();
    return updated || undefined;
  }
  
  async expireOldSuggestions(): Promise<number> {
    const now = new Date();
    const result = await db.update(observerSuggestions)
      .set({ status: 'expired' })
      .where(and(
        eq(observerSuggestions.status, 'pending'),
        isNotNull(observerSuggestions.expiresAt),
        lt(observerSuggestions.expiresAt, now)
      ))
      .returning();
    return result.length;
  }
  
  // Observer Patterns - Learned behavior patterns
  async getAllObserverPatterns(): Promise<ObserverPattern[]> {
    return await db.select().from(observerPatterns)
      .orderBy(desc(observerPatterns.occurrenceCount));
  }
  
  async getEnabledObserverPatterns(): Promise<ObserverPattern[]> {
    return await db.select().from(observerPatterns)
      .where(eq(observerPatterns.isEnabled, true))
      .orderBy(desc(observerPatterns.occurrenceCount));
  }
  
  async getObserverPattern(id: string): Promise<ObserverPattern | undefined> {
    const [pattern] = await db.select().from(observerPatterns)
      .where(eq(observerPatterns.id, id));
    return pattern || undefined;
  }
  
  async createObserverPattern(pattern: InsertObserverPattern): Promise<ObserverPattern> {
    const [created] = await db.insert(observerPatterns).values(pattern).returning();
    return created;
  }
  
  async updateObserverPattern(id: string, pattern: Partial<InsertObserverPattern>): Promise<ObserverPattern | undefined> {
    const [updated] = await db.update(observerPatterns)
      .set({ ...pattern, updatedAt: new Date() })
      .where(eq(observerPatterns.id, id))
      .returning();
    return updated || undefined;
  }
  
  async incrementPatternOccurrence(id: string): Promise<ObserverPattern | undefined> {
    const [updated] = await db.update(observerPatterns)
      .set({ 
        occurrenceCount: sql`${observerPatterns.occurrenceCount} + 1`,
        lastTriggeredAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(observerPatterns.id, id))
      .returning();
    return updated || undefined;
  }
  
  async updatePatternFeedback(id: string, delta: number): Promise<ObserverPattern | undefined> {
    const [updated] = await db.update(observerPatterns)
      .set({ 
        userFeedbackScore: sql`${observerPatterns.userFeedbackScore} + ${delta}`,
        updatedAt: new Date()
      })
      .where(eq(observerPatterns.id, id))
      .returning();
    return updated || undefined;
  }
  
  // AI Actions - Verify → Automate audit trail
  async getAllAiActions(limit: number = 100): Promise<AiAction[]> {
    return await db.select().from(aiActions)
      .orderBy(desc(aiActions.createdAt))
      .limit(limit);
  }
  
  async getAiAction(id: string): Promise<AiAction | undefined> {
    const [action] = await db.select().from(aiActions)
      .where(eq(aiActions.id, id));
    return action || undefined;
  }
  
  async getAiActionsByType(actionType: string, limit: number = 50): Promise<AiAction[]> {
    return await db.select().from(aiActions)
      .where(eq(aiActions.actionType, actionType))
      .orderBy(desc(aiActions.createdAt))
      .limit(limit);
  }
  
  async createAiAction(action: InsertAiAction): Promise<AiAction> {
    const [created] = await db.insert(aiActions).values(action).returning();
    return created;
  }
  
  async updateAiAction(id: string, action: Partial<InsertAiAction>): Promise<AiAction | undefined> {
    const [updated] = await db.update(aiActions)
      .set(action)
      .where(eq(aiActions.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Saved Content - Insight Inbox
  async getAllSavedContent(limit: number = 100): Promise<SavedContent[]> {
    return await db.select().from(savedContent)
      .orderBy(desc(savedContent.createdAt))
      .limit(limit);
  }
  
  async getUnreadSavedContent(): Promise<SavedContent[]> {
    return await db.select().from(savedContent)
      .where(eq(savedContent.status, 'unread'))
      .orderBy(desc(savedContent.createdAt));
  }
  
  async getSavedContent(id: string): Promise<SavedContent | undefined> {
    const [content] = await db.select().from(savedContent)
      .where(eq(savedContent.id, id));
    return content || undefined;
  }
  
  async getSavedContentByUrl(url: string): Promise<SavedContent | undefined> {
    const [content] = await db.select().from(savedContent)
      .where(eq(savedContent.url, url));
    return content || undefined;
  }
  
  async createSavedContent(content: InsertSavedContent): Promise<SavedContent> {
    const [created] = await db.insert(savedContent).values(content).returning();
    return created;
  }
  
  async updateSavedContent(id: string, content: Partial<InsertSavedContent>): Promise<SavedContent | undefined> {
    const [updated] = await db.update(savedContent)
      .set({ ...content, updatedAt: new Date() })
      .where(eq(savedContent.id, id))
      .returning();
    return updated || undefined;
  }
  
  async markContentRead(id: string): Promise<SavedContent | undefined> {
    const [updated] = await db.update(savedContent)
      .set({ status: 'read', readAt: new Date(), updatedAt: new Date() })
      .where(eq(savedContent.id, id))
      .returning();
    return updated || undefined;
  }
  
  async archiveContent(id: string): Promise<SavedContent | undefined> {
    const [updated] = await db.update(savedContent)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(savedContent.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteSavedContent(id: string): Promise<void> {
    await db.delete(savedContent).where(eq(savedContent.id, id));
  }
  
  // Daily Digests
  async getAllDailyDigests(limit: number = 30): Promise<DailyDigest[]> {
    return await db.select().from(dailyDigests)
      .orderBy(desc(dailyDigests.digestDate))
      .limit(limit);
  }
  
  async getDailyDigest(id: string): Promise<DailyDigest | undefined> {
    const [digest] = await db.select().from(dailyDigests)
      .where(eq(dailyDigests.id, id));
    return digest || undefined;
  }
  
  async getTodaysDigest(): Promise<DailyDigest | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [digest] = await db.select().from(dailyDigests)
      .where(and(
        gte(dailyDigests.digestDate, today),
        lt(dailyDigests.digestDate, tomorrow)
      ));
    return digest || undefined;
  }
  
  async createDailyDigest(digest: InsertDailyDigest): Promise<DailyDigest> {
    const [created] = await db.insert(dailyDigests).values(digest).returning();
    return created;
  }
  
  async updateDailyDigest(id: string, digest: Partial<InsertDailyDigest>): Promise<DailyDigest | undefined> {
    const [updated] = await db.update(dailyDigests)
      .set(digest)
      .where(eq(dailyDigests.id, id))
      .returning();
    return updated || undefined;
  }
  
  // User Core Profile
  async getUserCoreProfile(betaUserId: string): Promise<UserCoreProfile | undefined> {
    const [profile] = await db.select().from(userCoreProfile)
      .where(eq(userCoreProfile.betaUserId, betaUserId));
    return profile || undefined;
  }
  
  async getUserCoreProfileById(id: string): Promise<UserCoreProfile | undefined> {
    const [profile] = await db.select().from(userCoreProfile)
      .where(eq(userCoreProfile.id, id));
    return profile || undefined;
  }
  
  async createUserCoreProfile(profile: InsertUserCoreProfile): Promise<UserCoreProfile> {
    const [created] = await db.insert(userCoreProfile).values(profile).returning();
    return created;
  }
  
  async updateUserCoreProfile(betaUserId: string, profile: Partial<InsertUserCoreProfile>): Promise<UserCoreProfile | undefined> {
    const [updated] = await db.update(userCoreProfile)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(userCoreProfile.betaUserId, betaUserId))
      .returning();
    return updated || undefined;
  }
  
  async upsertUserCoreProfile(profile: InsertUserCoreProfile): Promise<UserCoreProfile> {
    const existing = await this.getUserCoreProfile(profile.betaUserId);
    if (existing) {
      const updated = await this.updateUserCoreProfile(profile.betaUserId, profile);
      return updated!;
    }
    return await this.createUserCoreProfile(profile);
  }
  
  // Dormant Opportunities
  async getAllDormantOpportunities(limit: number = 100): Promise<DormantOpportunity[]> {
    return await db.select().from(dormantOpportunities)
      .orderBy(desc(dormantOpportunities.dormancyScore))
      .limit(limit);
  }
  
  async getPendingDormantOpportunities(): Promise<DormantOpportunity[]> {
    return await db.select().from(dormantOpportunities)
      .where(eq(dormantOpportunities.status, 'pending'))
      .orderBy(desc(dormantOpportunities.dormancyScore));
  }
  
  async getDormantOpportunity(id: string): Promise<DormantOpportunity | undefined> {
    const [opportunity] = await db.select().from(dormantOpportunities)
      .where(eq(dormantOpportunities.id, id));
    return opportunity || undefined;
  }
  
  async getDormantOpportunityByPersonId(personId: string): Promise<DormantOpportunity | undefined> {
    const [opportunity] = await db.select().from(dormantOpportunities)
      .where(and(
        eq(dormantOpportunities.personId, personId),
        eq(dormantOpportunities.status, 'pending')
      ));
    return opportunity || undefined;
  }
  
  async createDormantOpportunity(opportunity: InsertDormantOpportunity): Promise<DormantOpportunity> {
    const [created] = await db.insert(dormantOpportunities).values(opportunity).returning();
    return created;
  }
  
  async updateDormantOpportunity(id: string, opportunity: Partial<InsertDormantOpportunity>): Promise<DormantOpportunity | undefined> {
    const [updated] = await db.update(dormantOpportunities)
      .set({ ...opportunity, updatedAt: new Date() })
      .where(eq(dormantOpportunities.id, id))
      .returning();
    return updated || undefined;
  }
  
  async approveDormantOpportunity(id: string): Promise<DormantOpportunity | undefined> {
    const [updated] = await db.update(dormantOpportunities)
      .set({ status: 'approved', reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(dormantOpportunities.id, id))
      .returning();
    return updated || undefined;
  }
  
  async dismissDormantOpportunity(id: string, reason?: string): Promise<DormantOpportunity | undefined> {
    const [updated] = await db.update(dormantOpportunities)
      .set({ 
        status: 'dismissed', 
        dismissedReason: reason,
        reviewedAt: new Date(), 
        updatedAt: new Date() 
      })
      .where(eq(dormantOpportunities.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteDormantOpportunity(id: string): Promise<void> {
    await db.delete(dormantOpportunities).where(eq(dormantOpportunities.id, id));
  }
  
  // Social Media Connections
  async getAllSocialConnections(): Promise<SocialConnection[]> {
    return await db.select().from(socialConnections).orderBy(desc(socialConnections.createdAt));
  }
  
  async getSocialConnection(id: string): Promise<SocialConnection | undefined> {
    const [connection] = await db.select().from(socialConnections).where(eq(socialConnections.id, id));
    return connection || undefined;
  }
  
  async getActiveSocialConnection(platform: string): Promise<SocialConnection | undefined> {
    const [connection] = await db.select().from(socialConnections)
      .where(and(
        eq(socialConnections.platform, platform),
        eq(socialConnections.isActive, true)
      ));
    return connection || undefined;
  }
  
  async createSocialConnection(connection: InsertSocialConnection): Promise<SocialConnection> {
    const [created] = await db.insert(socialConnections).values(connection).returning();
    return created;
  }
  
  async updateSocialConnection(id: string, connection: Partial<InsertSocialConnection>): Promise<SocialConnection | undefined> {
    const [updated] = await db.update(socialConnections)
      .set({ ...connection, updatedAt: new Date() })
      .where(eq(socialConnections.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteSocialConnection(id: string): Promise<void> {
    await db.delete(socialConnections).where(eq(socialConnections.id, id));
  }
  
  // Social Posts
  async getAllSocialPosts(limit: number = 100): Promise<SocialPost[]> {
    return await db.select().from(socialPosts)
      .orderBy(desc(socialPosts.createdAt))
      .limit(limit);
  }
  
  async getSocialPost(id: string): Promise<SocialPost | undefined> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, id));
    return post || undefined;
  }
  
  async getScheduledSocialPosts(): Promise<SocialPost[]> {
    return await db.select().from(socialPosts)
      .where(eq(socialPosts.status, 'scheduled'))
      .orderBy(socialPosts.scheduledFor);
  }
  
  async createSocialPost(post: InsertSocialPost): Promise<SocialPost> {
    const [created] = await db.insert(socialPosts).values(post).returning();
    return created;
  }
  
  async updateSocialPost(id: string, post: Partial<InsertSocialPost>): Promise<SocialPost | undefined> {
    const [updated] = await db.update(socialPosts)
      .set({ ...post, updatedAt: new Date() })
      .where(eq(socialPosts.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteSocialPost(id: string): Promise<void> {
    await db.delete(socialPosts).where(eq(socialPosts.id, id));
  }
  
  // Context Graph - Decision Traces & World Model
  async createContextNode(node: InsertContextNode): Promise<ContextNode> {
    const [created] = await db.insert(contextNodes).values(node).returning();
    return created;
  }
  
  async getContextNode(id: string): Promise<ContextNode | undefined> {
    const [node] = await db.select().from(contextNodes).where(eq(contextNodes.id, id));
    return node || undefined;
  }
  
  async getContextNodeByEntity(entityType: string, entityId: string): Promise<ContextNode | undefined> {
    const [node] = await db.select().from(contextNodes)
      .where(and(
        eq(contextNodes.nodeType, entityType),
        eq(contextNodes.entityId, entityId)
      ));
    return node || undefined;
  }
  
  async createContextEdge(edge: InsertContextEdge): Promise<ContextEdge> {
    const [created] = await db.insert(contextEdges).values(edge).returning();
    return created;
  }
  
  async getContextEdgesFrom(nodeId: string): Promise<ContextEdge[]> {
    return await db.select().from(contextEdges)
      .where(eq(contextEdges.fromNodeId, nodeId))
      .orderBy(desc(contextEdges.createdAt));
  }
  
  async getContextEdgesTo(nodeId: string): Promise<ContextEdge[]> {
    return await db.select().from(contextEdges)
      .where(eq(contextEdges.toNodeId, nodeId))
      .orderBy(desc(contextEdges.createdAt));
  }
  
  async createDecisionTrace(trace: InsertDecisionTrace): Promise<DecisionTrace> {
    const [created] = await db.insert(decisionTraces).values(trace).returning();
    return created;
  }
  
  async getDecisionTrace(id: string): Promise<DecisionTrace | undefined> {
    const [trace] = await db.select().from(decisionTraces).where(eq(decisionTraces.id, id));
    return trace || undefined;
  }
  
  async getDecisionTracesForEntity(entityType: string, entityId: string, limit: number = 50): Promise<DecisionTrace[]> {
    return await db.select().from(decisionTraces)
      .where(and(
        eq(decisionTraces.entityType, entityType),
        eq(decisionTraces.entityId, entityId)
      ))
      .orderBy(desc(decisionTraces.createdAt))
      .limit(limit);
  }
  
  async getRecentDecisionTraces(limit: number = 100): Promise<DecisionTrace[]> {
    return await db.select().from(decisionTraces)
      .orderBy(desc(decisionTraces.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
