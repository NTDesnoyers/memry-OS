/**
 * NurtureAgent - Responsible for relationship maintenance and follow-up suggestions.
 * 
 * Subscribes to:
 * - contact.due: Proposes reach-out actions for overdue contacts
 * - ford.updated: Acknowledges FORD updates, may suggest follow-up questions
 * - segment.changed: Adjusts nurture cadence based on new segment
 * - anniversary.approaching: Proposes birthday/anniversary outreach
 * - relationship.score_changed: May suggest actions to improve declining scores
 */

import { eventBus } from "./event-bus";
import { storage } from "./storage";
import { 
  EventType, 
  AgentName, 
  type SystemEvent, 
  type AgentAction 
} from "@shared/schema";

async function handleContactDue(event: SystemEvent): Promise<AgentAction[]> {
  const { dueReason, daysSinceContact, daysOverdue } = event.payload as {
    dueReason: string;
    daysSinceContact: number;
    daysOverdue: number;
  };

  if (!event.personId) return [];

  const person = await storage.getPerson(event.personId);
  if (!person) return [];

  let actionType = 'suggest_call';
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let reasoning = '';

  if (daysOverdue > 30) {
    actionType = 'suggest_call';
    riskLevel = 'medium';
    reasoning = `${person.name} is ${daysOverdue} days overdue for contact (${dueReason}). A personal call would help re-establish connection.`;
  } else if (daysOverdue > 14) {
    actionType = 'suggest_email';
    reasoning = `${person.name} is ${daysOverdue} days overdue. A check-in email would be appropriate.`;
  } else {
    actionType = 'suggest_text';
    reasoning = `${person.name} is due for contact (${dueReason}). A quick text would maintain the relationship.`;
  }

  const action = await storage.createAgentAction({
    eventId: event.id,
    agentName: AgentName.NURTURE,
    actionType,
    personId: event.personId,
    targetEntity: 'person',
    proposedContent: {
      personName: person.name,
      dueReason,
      daysSinceContact,
      daysOverdue,
      segment: person.segment,
    },
    riskLevel,
    reasoning,
    status: 'proposed',
    approvedBy: null,
    approvedAt: null,
    executedAt: null,
    errorMessage: null,
  });

  return [action];
}

async function handleFordUpdated(event: SystemEvent): Promise<AgentAction[]> {
  const { field, newValue } = event.payload as {
    field: string;
    oldValue: string | null;
    newValue: string | null;
  };

  if (!event.personId || !newValue) return [];

  const person = await storage.getPerson(event.personId);
  if (!person) return [];

  const action = await storage.createAgentAction({
    eventId: event.id,
    agentName: AgentName.NURTURE,
    actionType: 'log_insight',
    personId: event.personId,
    targetEntity: 'person',
    proposedContent: {
      personName: person.name,
      fordField: field,
      newValue,
    },
    riskLevel: 'low',
    reasoning: `FORD note updated for ${person.name}: ${field.replace('ford', '')} - "${newValue.substring(0, 50)}${newValue.length > 50 ? '...' : ''}"`,
    status: 'proposed',
    approvedBy: null,
    approvedAt: null,
    executedAt: null,
    errorMessage: null,
  });

  return [action];
}

async function handleAnniversaryApproaching(event: SystemEvent): Promise<AgentAction[]> {
  const { anniversaryType, date, daysUntil } = event.payload as {
    anniversaryType: string;
    date: string;
    daysUntil: number;
  };

  if (!event.personId) return [];

  const person = await storage.getPerson(event.personId);
  if (!person) return [];

  let actionType = 'suggest_handwritten_note';
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  let reasoning = '';

  if (anniversaryType === 'birthday') {
    actionType = 'suggest_handwritten_note';
    reasoning = `${person.name}'s birthday is in ${daysUntil} days (${date}). A handwritten card would make a great impression.`;
  } else if (anniversaryType === 'home_purchase') {
    actionType = 'suggest_gift';
    riskLevel = 'high';
    reasoning = `${person.name}'s home purchase anniversary is in ${daysUntil} days. Consider a small gift to celebrate this milestone.`;
  } else {
    actionType = 'suggest_email';
    reasoning = `${person.name} has an upcoming ${anniversaryType} anniversary in ${daysUntil} days.`;
  }

  const action = await storage.createAgentAction({
    eventId: event.id,
    agentName: AgentName.NURTURE,
    actionType,
    personId: event.personId,
    targetEntity: 'person',
    proposedContent: {
      personName: person.name,
      anniversaryType,
      date,
      daysUntil,
    },
    riskLevel,
    reasoning,
    status: 'proposed',
    approvedBy: null,
    approvedAt: null,
    executedAt: null,
    errorMessage: null,
  });

  return [action];
}

async function handleSegmentChanged(event: SystemEvent): Promise<AgentAction[]> {
  const { oldSegment, newSegment } = event.payload as {
    oldSegment: string | null;
    newSegment: string | null;
  };

  if (!event.personId) return [];

  const person = await storage.getPerson(event.personId);
  if (!person) return [];

  const segmentOrder = ['D', 'C', 'B', 'A'];
  const oldIndex = segmentOrder.indexOf(oldSegment || 'D');
  const newIndex = segmentOrder.indexOf(newSegment || 'D');
  const isPromotion = newIndex > oldIndex;

  const reasoning = isPromotion
    ? `${person.name} was promoted from segment ${oldSegment || 'none'} to ${newSegment}. Increased contact frequency recommended.`
    : `${person.name} moved from segment ${oldSegment} to ${newSegment}. Adjust nurture cadence accordingly.`;

  const action = await storage.createAgentAction({
    eventId: event.id,
    agentName: AgentName.NURTURE,
    actionType: 'log_insight',
    personId: event.personId,
    targetEntity: 'person',
    proposedContent: {
      personName: person.name,
      oldSegment,
      newSegment,
      isPromotion,
    },
    riskLevel: 'low',
    reasoning,
    status: 'proposed',
    approvedBy: null,
    approvedAt: null,
    executedAt: null,
    errorMessage: null,
  });

  return [action];
}

async function handleRelationshipScoreChanged(event: SystemEvent): Promise<AgentAction[]> {
  const { oldScore, newScore, changeReason } = event.payload as {
    oldScore: number;
    newScore: number;
    changeReason: string;
  };

  if (!event.personId) return [];

  const person = await storage.getPerson(event.personId);
  if (!person) return [];

  const scoreDiff = newScore - oldScore;
  const isSignificantDrop = scoreDiff <= -15;

  if (!isSignificantDrop) {
    return [];
  }

  const action = await storage.createAgentAction({
    eventId: event.id,
    agentName: AgentName.NURTURE,
    actionType: 'suggest_call',
    personId: event.personId,
    targetEntity: 'person',
    proposedContent: {
      personName: person.name,
      oldScore,
      newScore,
      changeReason,
    },
    riskLevel: 'medium',
    reasoning: `${person.name}'s relationship score dropped ${Math.abs(scoreDiff)} points (${oldScore} → ${newScore}). Reason: ${changeReason}. A reconnection call is recommended.`,
    status: 'proposed',
    approvedBy: null,
    approvedAt: null,
    executedAt: null,
    errorMessage: null,
  });

  return [action];
}

async function handleNurtureEvent(event: SystemEvent): Promise<AgentAction[] | void> {
  switch (event.eventType) {
    case EventType.CONTACT_DUE:
      return handleContactDue(event);
    case EventType.FORD_UPDATED:
      return handleFordUpdated(event);
    case EventType.ANNIVERSARY_APPROACHING:
      return handleAnniversaryApproaching(event);
    case EventType.SEGMENT_CHANGED:
      return handleSegmentChanged(event);
    case EventType.RELATIONSHIP_SCORE_CHANGED:
      return handleRelationshipScoreChanged(event);
    default:
      return;
  }
}

export function registerNurtureAgent(): void {
  eventBus.registerAgent({
    agentName: AgentName.NURTURE,
    eventTypes: [
      EventType.CONTACT_DUE,
      EventType.FORD_UPDATED,
      EventType.ANNIVERSARY_APPROACHING,
      EventType.SEGMENT_CHANGED,
      EventType.RELATIONSHIP_SCORE_CHANGED,
    ],
    handler: handleNurtureEvent,
  });

  console.log('[NurtureAgent] Registered and listening for relationship events');
}
