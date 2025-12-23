/**
 * EventBus - Central nervous system for the Real Estate Orchestration Layer.
 * 
 * Responsibilities:
 * - Emit events when things happen in the system
 * - Route events to subscribed agents
 * - Log all events for audit trail
 * - Auto-approve and execute low-risk agent actions
 */

import { storage } from "./storage";
import { 
  EventType, 
  EventCategory, 
  AgentName,
  type InsertSystemEvent,
  type InsertAgentAction,
  type SystemEvent,
  type AgentAction,
} from "@shared/schema";

type EventHandler = (event: SystemEvent) => Promise<AgentAction[] | void>;

interface AgentRegistration {
  agentName: string;
  eventTypes: string[];
  handler: EventHandler;
}

class EventBus {
  private agents: Map<string, AgentRegistration> = new Map();
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  /**
   * Register an agent to receive specific event types.
   */
  registerAgent(registration: AgentRegistration): void {
    this.agents.set(registration.agentName, registration);
    
    for (const eventType of registration.eventTypes) {
      const handlers = this.eventHandlers.get(eventType) || [];
      handlers.push(registration.handler);
      this.eventHandlers.set(eventType, handlers);
    }
    
    console.log(`[EventBus] Registered agent: ${registration.agentName} for events: ${registration.eventTypes.join(', ')}`);
  }

  /**
   * Emit an event to the event bus. Stores the event and notifies subscribed agents.
   */
  async emit(event: Omit<InsertSystemEvent, 'processedAt' | 'processedBy'>): Promise<SystemEvent> {
    const systemEvent = await storage.createSystemEvent({
      ...event,
      processedAt: null,
      processedBy: null,
    });
    
    console.log(`[EventBus] Event emitted: ${event.eventType} (${systemEvent.id})`);
    
    this.processEventAsync(systemEvent);
    
    return systemEvent;
  }

  /**
   * Process an event asynchronously - notify all subscribed agents.
   */
  private async processEventAsync(event: SystemEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.eventType) || [];
    const processedBy: string[] = [];
    
    for (const handler of handlers) {
      try {
        const actions = await handler(event);
        
        if (actions && actions.length > 0) {
          for (const action of actions) {
            if (action.riskLevel === 'low') {
              await this.autoApproveAndExecute(action);
            }
          }
        }
        
        const agentEntry = Array.from(this.agents.entries()).find(([_, reg]) => 
          reg.handler === handler
        );
        if (agentEntry) {
          processedBy.push(agentEntry[0]);
        }
      } catch (error) {
        console.error(`[EventBus] Error processing event ${event.id}:`, error);
      }
    }
    
    if (processedBy.length > 0) {
      await storage.markEventProcessed(event.id, processedBy);
    }
  }

  /**
   * Auto-approve and mark as executed for low-risk actions.
   */
  private async autoApproveAndExecute(action: AgentAction): Promise<void> {
    await storage.approveAgentAction(action.id, 'auto');
    await storage.markAgentActionExecuted(action.id);
    console.log(`[EventBus] Auto-executed low-risk action: ${action.actionType} by ${action.agentName}`);
  }

  /**
   * Helper: Get category from event type.
   */
  getCategoryForEventType(eventType: string): string {
    if (eventType.startsWith('lead.')) return EventCategory.LEAD;
    if (eventType.startsWith('contact.') || eventType.startsWith('ford.') || eventType.startsWith('segment.')) return EventCategory.RELATIONSHIP;
    if (eventType.startsWith('deal.') || eventType.startsWith('deadline.') || eventType.startsWith('contract.')) return EventCategory.TRANSACTION;
    if (eventType.startsWith('transcript.') || eventType.startsWith('email.') || eventType.startsWith('sms.') || eventType.startsWith('meeting.')) return EventCategory.COMMUNICATION;
    return EventCategory.INTELLIGENCE;
  }

  /**
   * Convenience method: Emit a deal created event.
   */
  async emitDealCreated(dealId: string, personId: string | null, payload: Record<string, unknown>): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.DEAL_CREATED,
      eventCategory: EventCategory.TRANSACTION,
      personId,
      dealId,
      sourceEntity: 'deal',
      sourceEntityId: dealId,
      payload,
      metadata: { triggeredBy: 'system', sourceAction: 'create_deal' },
    });
  }

  /**
   * Convenience method: Emit a deal stage changed event.
   */
  async emitDealStageChanged(dealId: string, personId: string | null, oldStage: string, newStage: string): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.DEAL_STAGE_CHANGED,
      eventCategory: EventCategory.TRANSACTION,
      personId,
      dealId,
      sourceEntity: 'deal',
      sourceEntityId: dealId,
      payload: { oldStage, newStage },
      metadata: { triggeredBy: 'system', sourceAction: 'update_deal' },
    });
  }

  /**
   * Convenience method: Emit a contact made event.
   */
  async emitContactMade(personId: string, interactionId: string, interactionType: string): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.CONTACT_MADE,
      eventCategory: EventCategory.RELATIONSHIP,
      personId,
      dealId: null,
      sourceEntity: 'interaction',
      sourceEntityId: interactionId,
      payload: { interactionType },
      metadata: { triggeredBy: 'system', sourceAction: 'create_interaction' },
    });
  }

  /**
   * Convenience method: Emit a transcript ready event.
   */
  async emitTranscriptReady(personId: string | null, interactionId: string): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.TRANSCRIPT_READY,
      eventCategory: EventCategory.COMMUNICATION,
      personId,
      dealId: null,
      sourceEntity: 'interaction',
      sourceEntityId: interactionId,
      payload: {},
      metadata: { triggeredBy: 'system', sourceAction: 'transcript_processed' },
    });
  }

  /**
   * Convenience method: Emit a life event detected alert.
   */
  async emitLifeEventDetected(personId: string, alertId: string, eventType: string, eventCategory: string): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.LIFE_EVENT_DETECTED,
      eventCategory: EventCategory.INTELLIGENCE,
      personId,
      dealId: null,
      sourceEntity: 'life_event_alert',
      sourceEntityId: alertId,
      payload: { detectedEventType: eventType, detectedEventCategory: eventCategory },
      metadata: { triggeredBy: 'agent', agentName: AgentName.LIFE_EVENT, sourceAction: 'detect_life_event' },
    });
  }

  /**
   * Convenience method: Emit a FORD updated event.
   */
  async emitFordUpdated(personId: string, field: string, oldValue: string | null, newValue: string | null): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.FORD_UPDATED,
      eventCategory: EventCategory.RELATIONSHIP,
      personId,
      dealId: null,
      sourceEntity: 'person',
      sourceEntityId: personId,
      payload: { field, oldValue, newValue },
      metadata: { triggeredBy: 'system', sourceAction: 'update_person' },
    });
  }

  /**
   * Convenience method: Emit a segment changed event.
   */
  async emitSegmentChanged(personId: string, oldSegment: string | null, newSegment: string | null): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.SEGMENT_CHANGED,
      eventCategory: EventCategory.RELATIONSHIP,
      personId,
      dealId: null,
      sourceEntity: 'person',
      sourceEntityId: personId,
      payload: { oldSegment, newSegment },
      metadata: { triggeredBy: 'system', sourceAction: 'update_person' },
    });
  }

  /**
   * Convenience method: Emit a draft generated event.
   */
  async emitDraftGenerated(personId: string | null, draftId: string, draftType: string): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.DRAFT_GENERATED,
      eventCategory: EventCategory.INTELLIGENCE,
      personId,
      dealId: null,
      sourceEntity: 'generated_draft',
      sourceEntityId: draftId,
      payload: { draftType },
      metadata: { triggeredBy: 'agent', agentName: AgentName.MARKETING, sourceAction: 'generate_draft' },
    });
  }

  /**
   * Convenience method: Emit a contact due event (overdue for follow-up).
   */
  async emitContactDue(
    personId: string, 
    dueReason: string, 
    daysSinceContact: number, 
    daysOverdue: number
  ): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.CONTACT_DUE,
      eventCategory: EventCategory.RELATIONSHIP,
      personId,
      dealId: null,
      sourceEntity: 'person',
      sourceEntityId: personId,
      payload: { dueReason, daysSinceContact, daysOverdue },
      metadata: { triggeredBy: 'system', sourceAction: 'relationship_check' },
    });
  }

  /**
   * Convenience method: Emit an anniversary approaching event.
   */
  async emitAnniversaryApproaching(
    personId: string, 
    anniversaryType: string, 
    date: string, 
    daysUntil: number
  ): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.ANNIVERSARY_APPROACHING,
      eventCategory: EventCategory.INTELLIGENCE,
      personId,
      dealId: null,
      sourceEntity: 'person',
      sourceEntityId: personId,
      payload: { anniversaryType, date, daysUntil },
      metadata: { triggeredBy: 'system', sourceAction: 'anniversary_check' },
    });
  }

  /**
   * Convenience method: Emit a relationship score changed event.
   */
  async emitRelationshipScoreChanged(
    personId: string, 
    oldScore: number, 
    newScore: number, 
    changeReason: string
  ): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.RELATIONSHIP_SCORE_CHANGED,
      eventCategory: EventCategory.RELATIONSHIP,
      personId,
      dealId: null,
      sourceEntity: 'person',
      sourceEntityId: personId,
      payload: { oldScore, newScore, changeReason },
      metadata: { triggeredBy: 'system', sourceAction: 'score_calculation' },
    });
  }

  /**
   * Convenience method: Emit a lead created event.
   */
  async emitLeadCreated(leadId: string, source: string, payload: Record<string, unknown>): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.LEAD_CREATED,
      eventCategory: EventCategory.LEAD,
      personId: null,
      dealId: null,
      sourceEntity: 'lead',
      sourceEntityId: leadId,
      payload: { ...payload, source },
      metadata: { triggeredBy: 'system', sourceAction: 'create_lead' },
    });
  }

  /**
   * Convenience method: Emit a lead qualified event.
   */
  async emitLeadQualified(leadId: string, qualificationScore: number, personId?: string): Promise<SystemEvent> {
    return this.emit({
      eventType: EventType.LEAD_QUALIFIED,
      eventCategory: EventCategory.LEAD,
      personId: personId || null,
      dealId: null,
      sourceEntity: 'lead',
      sourceEntityId: leadId,
      payload: { qualificationScore },
      metadata: { triggeredBy: 'agent', agentName: AgentName.LEAD_INTAKE, sourceAction: 'qualify_lead' },
    });
  }

  /**
   * Get statistics for the event bus.
   */
  async getStats(): Promise<{
    totalEvents: number;
    unprocessedEvents: number;
    pendingApprovals: number;
    eventsByCategory: Record<string, number>;
    registeredAgents: string[];
  }> {
    const [allEvents, unprocessed, pending] = await Promise.all([
      storage.getAllSystemEvents(1000),
      storage.getUnprocessedEvents(),
      storage.getPendingApprovals(),
    ]);
    
    const eventsByCategory: Record<string, number> = {};
    for (const event of allEvents) {
      eventsByCategory[event.eventCategory] = (eventsByCategory[event.eventCategory] || 0) + 1;
    }
    
    return {
      totalEvents: allEvents.length,
      unprocessedEvents: unprocessed.length,
      pendingApprovals: pending.length,
      eventsByCategory,
      registeredAgents: Array.from(this.agents.keys()),
    };
  }
}

export const eventBus = new EventBus();
