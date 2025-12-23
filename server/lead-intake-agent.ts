/**
 * LeadIntakeAgent - Handles new lead ingestion, scoring, and qualification.
 * 
 * Responsibilities:
 * - Process new leads and calculate qualification scores
 * - Check for duplicates (existing leads or contacts)
 * - Propose immediate follow-up actions for hot leads
 * - Trigger nurture workflows for qualified leads
 * 
 * Subscribes to:
 * - lead.created: Score and qualify new leads
 */

import { eventBus } from "./event-bus";
import { storage } from "./storage";
import { 
  EventType, 
  AgentName, 
  LeadStatus,
  type SystemEvent, 
  type AgentAction,
  type Lead
} from "@shared/schema";

const QUALIFICATION_THRESHOLDS = {
  HOT: 80,
  WARM: 50,
  COLD: 25,
};

function calculateLeadScore(lead: Lead): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  if (lead.email && lead.phone) {
    score += 20;
    factors.push('Complete contact info (+20)');
  } else if (lead.email || lead.phone) {
    score += 10;
    factors.push('Partial contact info (+10)');
  }

  if (lead.budget) {
    score += 15;
    factors.push('Budget provided (+15)');
  }

  if (lead.timeline) {
    const timelineLower = lead.timeline.toLowerCase();
    if (timelineLower.includes('immediate') || timelineLower.includes('asap') || timelineLower.includes('now')) {
      score += 25;
      factors.push('Immediate timeline (+25)');
    } else if (timelineLower.includes('month') || timelineLower.includes('1-3') || timelineLower.includes('soon')) {
      score += 20;
      factors.push('Near-term timeline (+20)');
    } else if (timelineLower.includes('6') || timelineLower.includes('year')) {
      score += 10;
      factors.push('Long-term timeline (+10)');
    }
  }

  if (lead.areas && lead.areas.length > 0) {
    score += 10;
    factors.push('Areas specified (+10)');
  }

  if (lead.interestedIn) {
    score += 10;
    factors.push('Interest type specified (+10)');
  }

  const sourceScores: Record<string, number> = {
    referral: 25,
    sphere: 20,
    open_house: 15,
    sign_call: 15,
    website: 10,
    zillow: 10,
    realtor_com: 10,
    social_media: 5,
    cold_call: 5,
    manual: 5,
    other: 0,
  };

  const sourceScore = sourceScores[lead.source] || 0;
  if (sourceScore > 0) {
    score += sourceScore;
    factors.push(`Source: ${lead.source} (+${sourceScore})`);
  }

  return { score: Math.min(score, 100), factors };
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/\D/g, '');
}

async function findDuplicateContact(lead: Lead): Promise<{ type: 'contact' | 'lead'; match: any; matchedBy: string } | null> {
  const allPeople = await storage.getAllPeople();
  const leadEmailNorm = lead.email?.toLowerCase().trim();
  const leadPhoneNorm = normalizePhone(lead.phone);
  
  for (const person of allPeople) {
    if (leadEmailNorm && person.email?.toLowerCase().trim() === leadEmailNorm) {
      return { type: 'contact', match: person, matchedBy: 'email' };
    }
    const personPhoneNorm = normalizePhone(person.phone);
    if (leadPhoneNorm && personPhoneNorm && leadPhoneNorm === personPhoneNorm) {
      return { type: 'contact', match: person, matchedBy: 'phone' };
    }
  }
  
  const allLeads = await storage.getAllLeads();
  for (const existingLead of allLeads) {
    if (existingLead.id === lead.id) continue;
    if (leadEmailNorm && existingLead.email?.toLowerCase().trim() === leadEmailNorm) {
      return { type: 'lead', match: existingLead, matchedBy: 'email' };
    }
    const existingPhoneNorm = normalizePhone(existingLead.phone);
    if (leadPhoneNorm && existingPhoneNorm && leadPhoneNorm === existingPhoneNorm) {
      return { type: 'lead', match: existingLead, matchedBy: 'phone' };
    }
  }
  
  return null;
}

async function handleLeadCreated(event: SystemEvent): Promise<AgentAction[]> {
  const leadId = event.sourceEntityId;
  if (!leadId) return [];

  const lead = await storage.getLead(leadId);
  if (!lead) return [];

  const duplicate = await findDuplicateContact(lead);

  if (duplicate) {
    if (duplicate.type === 'contact') {
      await storage.updateLead(leadId, {
        status: LeadStatus.DUPLICATE,
        personId: duplicate.match.id,
        notes: `${lead.notes || ''}\n[Auto] Matched to existing contact by ${duplicate.matchedBy}: ${duplicate.match.name}`.trim(),
      });

      const action = await storage.createAgentAction({
        eventId: event.id,
        agentName: AgentName.LEAD_INTAKE,
        actionType: 'log_insight',
        personId: duplicate.match.id,
        targetEntity: 'lead',
        targetEntityId: leadId,
        proposedContent: {
          leadName: lead.name,
          existingPersonName: duplicate.match.name,
          existingPersonId: duplicate.match.id,
          matchedBy: duplicate.matchedBy,
        },
        riskLevel: 'low',
        reasoning: `Lead "${lead.name}" matches existing contact "${duplicate.match.name}" by ${duplicate.matchedBy}. Marked as duplicate.`,
        status: 'proposed',
        approvedBy: null,
        approvedAt: null,
        executedAt: null,
        errorMessage: null,
      });

      return [action];
    } else {
      await storage.updateLead(leadId, {
        status: LeadStatus.DUPLICATE,
        notes: `${lead.notes || ''}\n[Auto] Duplicate of existing lead by ${duplicate.matchedBy}: ${duplicate.match.name} (ID: ${duplicate.match.id})`.trim(),
      });

      const action = await storage.createAgentAction({
        eventId: event.id,
        agentName: AgentName.LEAD_INTAKE,
        actionType: 'log_insight',
        targetEntity: 'lead',
        targetEntityId: leadId,
        proposedContent: {
          leadName: lead.name,
          duplicateLeadName: duplicate.match.name,
          duplicateLeadId: duplicate.match.id,
          matchedBy: duplicate.matchedBy,
        },
        riskLevel: 'low',
        reasoning: `Lead "${lead.name}" matches existing lead "${duplicate.match.name}" by ${duplicate.matchedBy}. Marked as duplicate.`,
        status: 'proposed',
        approvedBy: null,
        approvedAt: null,
        executedAt: null,
        errorMessage: null,
      });

      return [action];
    }
  }

  const { score, factors } = calculateLeadScore(lead);

  let newStatus: LeadStatus;
  let qualificationTier: 'hot' | 'warm' | 'cold';
  
  if (score >= QUALIFICATION_THRESHOLDS.HOT) {
    newStatus = LeadStatus.QUALIFIED;
    qualificationTier = 'hot';
  } else if (score >= QUALIFICATION_THRESHOLDS.WARM) {
    newStatus = LeadStatus.NURTURING;
    qualificationTier = 'warm';
  } else {
    newStatus = LeadStatus.NEW;
    qualificationTier = 'cold';
  }

  await storage.updateLead(leadId, {
    qualificationScore: score,
    status: newStatus,
    notes: `${lead.notes || ''}\n[Auto] Qualified as ${qualificationTier.toUpperCase()} lead (score: ${score}/100)`.trim(),
  });

  if (score >= QUALIFICATION_THRESHOLDS.HOT) {
    await eventBus.emitLeadQualified(leadId, score);
  }

  const actions: AgentAction[] = [];

  if (score >= QUALIFICATION_THRESHOLDS.HOT) {
    const action = await storage.createAgentAction({
      eventId: event.id,
      agentName: AgentName.LEAD_INTAKE,
      actionType: 'suggest_call',
      targetEntity: 'lead',
      targetEntityId: leadId,
      proposedContent: {
        leadName: lead.name,
        score,
        factors,
        source: lead.source,
        timeline: lead.timeline,
        budget: lead.budget,
      },
      riskLevel: 'medium',
      reasoning: `Hot lead! ${lead.name} scored ${score}/100. Source: ${lead.source}. ${factors.join(', ')}. Immediate call recommended.`,
      status: 'proposed',
      approvedBy: null,
      approvedAt: null,
      executedAt: null,
      errorMessage: null,
    });
    actions.push(action);
  } else if (score >= QUALIFICATION_THRESHOLDS.WARM) {
    const action = await storage.createAgentAction({
      eventId: event.id,
      agentName: AgentName.LEAD_INTAKE,
      actionType: 'suggest_email',
      targetEntity: 'lead',
      targetEntityId: leadId,
      proposedContent: {
        leadName: lead.name,
        score,
        factors,
        source: lead.source,
      },
      riskLevel: 'low',
      reasoning: `Warm lead: ${lead.name} scored ${score}/100. Send introductory email within 24 hours.`,
      status: 'proposed',
      approvedBy: null,
      approvedAt: null,
      executedAt: null,
      errorMessage: null,
    });
    actions.push(action);
  } else {
    const action = await storage.createAgentAction({
      eventId: event.id,
      agentName: AgentName.LEAD_INTAKE,
      actionType: 'log_insight',
      targetEntity: 'lead',
      targetEntityId: leadId,
      proposedContent: {
        leadName: lead.name,
        score,
        factors,
      },
      riskLevel: 'low',
      reasoning: `New lead: ${lead.name} scored ${score}/100. Added to nurture queue.`,
      status: 'proposed',
      approvedBy: null,
      approvedAt: null,
      executedAt: null,
      errorMessage: null,
    });
    actions.push(action);
  }

  return actions;
}

async function handleLeadEvent(event: SystemEvent): Promise<AgentAction[] | void> {
  switch (event.eventType) {
    case EventType.LEAD_CREATED:
      return handleLeadCreated(event);
    default:
      return;
  }
}

export function registerLeadIntakeAgent(): void {
  eventBus.registerAgent({
    agentName: AgentName.LEAD_INTAKE,
    eventTypes: [
      EventType.LEAD_CREATED,
    ],
    handler: handleLeadEvent,
  });

  console.log('[LeadIntakeAgent] Registered and listening for lead events');
}
