/**
 * WorkflowCoachAgent - AI Chief of Staff that generates proactive suggestions.
 * 
 * Responsibilities:
 * - Observe user navigation and context changes
 * - Generate contextual suggestions based on REAL data (delegate, automate, shortcut, insight)
 * - Learn from user feedback to improve suggestions over time
 * - Respect learned patterns and user preferences
 * 
 * Subscribes to:
 * - ui.context.changed: Generate context-aware suggestions based on real data
 * - lead.created: Suggest immediate actions for new leads
 */

import { eventBus } from "./event-bus";
import { storage } from "./storage";
import { createLogger } from "./logger";
import { AgentName, type SystemEvent, type InsertObserverSuggestion } from "@shared/schema";

const logger = createLogger('WorkflowCoachAgent');
const AGENT_NAME = "WorkflowCoachAgent";

interface ContextData {
  route: string;
  entityType?: string;
  entityId?: string;
  focusedField?: string;
  timestamp: number;
}

type SuggestionIntent = 'delegate' | 'automate' | 'shortcut' | 'insight';

async function checkRecentSuggestions(patternId: string): Promise<boolean> {
  const suggestions = await storage.getAllObserverSuggestions(50);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  return suggestions.some(s => 
    s.patternId === patternId && 
    s.createdAt && 
    new Date(s.createdAt).getTime() > oneHourAgo
  );
}

async function getPatternFeedbackScore(patternId: string): Promise<number> {
  const patterns = await storage.getEnabledObserverPatterns();
  const pattern = patterns.find(p => {
    const triggerConditions = p.triggerConditions as any;
    return triggerConditions?.patternId === patternId;
  });
  return pattern?.userFeedbackScore || 0;
}

async function ensurePatternExists(patternId: string, intent: string): Promise<void> {
  const patterns = await storage.getEnabledObserverPatterns();
  const exists = patterns.some(p => {
    const triggerConditions = p.triggerConditions as any;
    return triggerConditions?.patternId === patternId;
  });
  
  if (!exists) {
    await storage.createObserverPattern({
      patternType: 'suggestion',
      description: `Auto-created pattern for ${patternId}`,
      triggerConditions: { patternId, intent },
      suggestedAction: { type: 'show_suggestion' },
      isEnabled: true,
      userFeedbackScore: 0,
    });
    logger.info(`Created pattern: ${patternId}`);
  }
}

async function createSuggestionIfAllowed(
  suggestion: InsertObserverSuggestion
): Promise<boolean> {
  if (suggestion.patternId) {
    const recentlyShown = await checkRecentSuggestions(suggestion.patternId);
    if (recentlyShown) return false;
    
    const feedbackScore = await getPatternFeedbackScore(suggestion.patternId);
    if (feedbackScore < -3) {
      logger.info(`Suppressed suggestion (feedback score ${feedbackScore}): ${suggestion.patternId}`);
      return false;
    }
    
    await ensurePatternExists(suggestion.patternId, suggestion.intent);
  }
  
  await storage.createObserverSuggestion(suggestion);
  logger.info(`Created suggestion: ${suggestion.title}`);
  return true;
}

async function generateLeadPageSuggestions(context: ContextData): Promise<void> {
  const newLeads = await storage.getNewLeads();
  const hotLeads = newLeads.filter(l => (l.qualificationScore || 0) >= 80);
  const warmLeads = newLeads.filter(l => {
    const score = l.qualificationScore || 0;
    return score >= 50 && score < 80;
  });
  
  if (hotLeads.length > 0) {
    await createSuggestionIfAllowed({
      agentName: AGENT_NAME,
      intent: 'delegate',
      title: `${hotLeads.length} Hot Lead${hotLeads.length > 1 ? 's' : ''} Need Attention`,
      description: `You have ${hotLeads.length} high-priority lead${hotLeads.length > 1 ? 's' : ''} (score 80+). Consider calling ${hotLeads[0].name} first - they scored ${hotLeads[0].qualificationScore}/100.`,
      confidence: 90,
      contextRoute: context.route,
      contextEntityType: 'lead',
      contextEntityId: hotLeads[0].id,
      leadId: hotLeads[0].id,
      patternId: 'hot_leads_priority',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    });
    return;
  }
  
  if (warmLeads.length > 0) {
    await createSuggestionIfAllowed({
      agentName: AGENT_NAME,
      intent: 'insight',
      title: `${warmLeads.length} Warm Lead${warmLeads.length > 1 ? 's' : ''} to Nurture`,
      description: `You have ${warmLeads.length} warm lead${warmLeads.length > 1 ? 's' : ''} in your inbox. A quick follow-up could move them to hot status.`,
      confidence: 70,
      contextRoute: context.route,
      patternId: 'warm_leads_nurture',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return;
  }
  
  if (newLeads.length === 0) {
    await createSuggestionIfAllowed({
      agentName: AGENT_NAME,
      intent: 'shortcut',
      title: 'Lead Inbox Clear',
      description: 'Great job! Your lead inbox is empty. Consider prospecting or checking in with your sphere.',
      confidence: 60,
      contextRoute: context.route,
      patternId: 'inbox_clear_celebrate',
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    });
  }
}

async function generatePeoplePageSuggestions(context: ContextData): Promise<void> {
  const people = await storage.getAllPeople();
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const staleContacts = people.filter(p => {
    if (!p.lastContact) return true;
    return new Date(p.lastContact) < thirtyDaysAgo;
  });
  
  const aListStale = staleContacts.filter(p => p.segment === 'A');
  
  if (aListStale.length > 0) {
    await createSuggestionIfAllowed({
      agentName: AGENT_NAME,
      intent: 'delegate',
      title: `${aListStale.length} A-List Contact${aListStale.length > 1 ? 's' : ''} Need Touch`,
      description: `${aListStale[0].name} and ${aListStale.length - 1} other A-list contacts haven't been contacted in 30+ days. These are your top relationships.`,
      confidence: 85,
      contextRoute: context.route,
      contextEntityType: 'person',
      contextEntityId: aListStale[0].id,
      personId: aListStale[0].id,
      patternId: 'alist_contact_due',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return;
  }
  
  const missingFord = people.filter(p => 
    p.segment === 'A' && (!p.fordOccupation || !p.fordFamily)
  );
  
  if (missingFord.length > 0) {
    await createSuggestionIfAllowed({
      agentName: AGENT_NAME,
      intent: 'insight',
      title: `FORD Notes Incomplete for ${missingFord.length} A-List`,
      description: `${missingFord[0].name} is missing FORD details. Complete profiles help you build stronger relationships.`,
      confidence: 65,
      contextRoute: context.route,
      contextEntityType: 'person',
      contextEntityId: missingFord[0].id,
      personId: missingFord[0].id,
      patternId: 'ford_incomplete',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
  }
}

async function generateDashboardSuggestions(context: ContextData): Promise<void> {
  const tasks = await storage.getAllTasks();
  const overdueTasks = tasks.filter(t => {
    if (t.completed) return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });
  
  if (overdueTasks.length > 0) {
    await createSuggestionIfAllowed({
      agentName: AGENT_NAME,
      intent: 'delegate',
      title: `${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`,
      description: `"${overdueTasks[0].title}" and ${overdueTasks.length - 1} other task${overdueTasks.length > 1 ? 's are' : ' is'} past due. Would you like help prioritizing?`,
      confidence: 80,
      contextRoute: context.route,
      patternId: 'overdue_tasks',
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });
    return;
  }
  
  const newLeads = await storage.getNewLeads();
  if (newLeads.length > 0) {
    await createSuggestionIfAllowed({
      agentName: AGENT_NAME,
      intent: 'insight',
      title: `${newLeads.length} New Lead${newLeads.length > 1 ? 's' : ''} Waiting`,
      description: 'Check your Lead Inbox to review and prioritize incoming opportunities.',
      confidence: 70,
      contextRoute: context.route,
      patternId: 'new_leads_dashboard',
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    });
  }
}

async function generateRouteSuggestions(context: ContextData): Promise<void> {
  switch (context.route) {
    case '/leads':
      await generateLeadPageSuggestions(context);
      break;
    case '/people':
      await generatePeoplePageSuggestions(context);
      break;
    case '/':
      await generateDashboardSuggestions(context);
      break;
    default:
      break;
  }
}

async function handleLeadCreated(event: SystemEvent): Promise<void> {
  const leadId = event.payload?.leadId as string;
  if (!leadId) return;
  
  const existingSuggestions = await storage.getAllObserverSuggestions(10);
  const alreadySuggested = existingSuggestions.some(s => 
    s.leadId === leadId && s.status === 'pending'
  );
  if (alreadySuggested) return;
  
  const lead = await storage.getLead(leadId);
  if (!lead) return;
  
  const score = lead.qualificationScore || 0;
  
  if (score >= 80) {
    await storage.createObserverSuggestion({
      agentName: AGENT_NAME,
      intent: 'delegate',
      title: `Hot Lead Alert: ${lead.name}`,
      description: `New lead scored ${score}/100! Source: ${lead.source}. ${lead.email ? `Email: ${lead.email}` : ''} ${lead.phone ? `Phone: ${lead.phone}` : ''}`,
      confidence: 95,
      contextRoute: '/leads',
      contextEntityType: 'lead',
      contextEntityId: leadId,
      leadId: leadId,
      patternId: 'hot_lead_created',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    });
    logger.info(`Hot lead alert created for ${lead.name}`);
  }
}

async function handleContextChanged(event: SystemEvent): Promise<void> {
  const context = event.payload as unknown as ContextData;
  if (!context?.route) return;
  
  await generateRouteSuggestions(context);
}

export function registerWorkflowCoachAgent(): void {
  eventBus.registerAgent({
    agentName: AGENT_NAME,
    eventTypes: ['ui.context.changed', 'lead.created'],
    handler: async (event) => {
      if (event.eventType === 'ui.context.changed') {
        await handleContextChanged(event);
      } else if (event.eventType === 'lead.created') {
        await handleLeadCreated(event);
      }
      return undefined;
    }
  });
  
  storage.createAgentSubscription({
    agentName: AgentName.WORKFLOW_COACH,
    eventType: 'ui.context.changed',
    isActive: true,
    priority: 50,
    config: {}
  }).catch(() => {});
  
  storage.createAgentSubscription({
    agentName: AgentName.WORKFLOW_COACH,
    eventType: 'lead.created',
    isActive: true,
    priority: 40,
    config: {}
  }).catch(() => {});
  
  logger.info(`Initialized with data-driven suggestions`);
}

export async function triggerContextSuggestions(route: string, entityType?: string, entityId?: string): Promise<void> {
  const context: ContextData = {
    route,
    entityType,
    entityId,
    timestamp: Date.now()
  };
  await generateRouteSuggestions(context);
}
