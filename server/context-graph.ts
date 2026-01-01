/**
 * Context Graph Service - Decision Traces & Organizational World Model
 * 
 * Implements the "event clock" - capturing not just what's true now, but WHY it became true.
 * Based on the context graph / decision traces architecture pattern.
 * 
 * Key concepts:
 * - Nodes: Entities in the graph (people, deals, interactions, decisions)
 * - Edges: Typed relationships (informed_by, resulted_in, led_to, etc.)
 * - Decision Traces: Full capture of decision with inputs, reasoning, and outcome
 */

import { storage } from "./storage";
import { 
  type InsertContextNode, 
  type InsertContextEdge, 
  type InsertDecisionTrace,
  type ContextNode,
  type ContextEdge,
  type DecisionTrace,
  ContextNodeType,
  ContextEdgeType,
} from "@shared/schema";
import { createLogger } from "./logger";

const logger = createLogger("ContextGraph");

export type DecisionInput = {
  evidence: { type: string; summary: string; sourceId?: string }[];
  constraints?: string[];
  priorState?: Record<string, unknown>;
};

export type DecisionOutcome = {
  newState?: Record<string, unknown>;
  sideEffects?: { type: string; description: string }[];
  success: boolean;
  errorMessage?: string;
};

export type RecordDecisionParams = {
  traceType: 'user_action' | 'ai_action' | 'system_event';
  actor: string;
  action: string;
  entityType?: string;
  entityId?: string;
  inputs?: DecisionInput;
  reasoning?: string;
  outcome?: DecisionOutcome;
  confidence?: number;
  reversible?: boolean;
  linkedTraceId?: string;
};

export type EntityReference = {
  type: string;
  id: string;
  label: string;
  summary?: string;
};

class ContextGraphService {
  /**
   * Record a decision trace - the core method for capturing "why" something happened.
   * Creates both a decision trace and a context node for the decision.
   */
  async recordDecision(params: RecordDecisionParams): Promise<DecisionTrace> {
    logger.debug(`Recording decision: ${params.actor} - ${params.action}`);
    
    let contextNodeId: string | undefined;
    
    if (params.entityType && params.entityId) {
      const existingNode = await storage.getContextNodeByEntity(params.entityType, params.entityId);
      if (existingNode) {
        contextNodeId = existingNode.id;
      } else {
        const node = await this.ensureEntityNode({
          type: params.entityType,
          id: params.entityId,
          label: `${params.entityType}:${params.entityId}`,
        });
        contextNodeId = node.id;
      }
    }
    
    const trace = await storage.createDecisionTrace({
      traceType: params.traceType,
      actor: params.actor,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      contextNodeId,
      inputs: params.inputs,
      reasoning: params.reasoning,
      outcome: params.outcome,
      confidence: params.confidence,
      reversible: params.reversible ?? true,
      linkedTraceId: params.linkedTraceId,
    });
    
    logger.info(`Decision trace recorded: ${trace.id} for ${params.action}`);
    return trace;
  }
  
  /**
   * Ensure an entity has a corresponding context node.
   * Creates one if it doesn't exist, returns existing if found.
   */
  async ensureEntityNode(entity: EntityReference): Promise<ContextNode> {
    const existing = await storage.getContextNodeByEntity(entity.type, entity.id);
    if (existing) {
      return existing;
    }
    
    const node = await storage.createContextNode({
      nodeType: entity.type,
      entityId: entity.id,
      label: entity.label,
      summary: entity.summary,
    });
    
    logger.debug(`Created context node for ${entity.type}:${entity.id}`);
    return node;
  }
  
  /**
   * Link two entities with a typed relationship.
   * Creates nodes for both entities if they don't exist.
   */
  async linkEntities(
    from: EntityReference,
    to: EntityReference,
    edgeType: string,
    reasoning?: string,
    weight?: number
  ): Promise<ContextEdge> {
    const fromNode = await this.ensureEntityNode(from);
    const toNode = await this.ensureEntityNode(to);
    
    const edge = await storage.createContextEdge({
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      edgeType,
      reasoning,
      weight: weight ?? 1,
    });
    
    logger.debug(`Created edge ${edgeType}: ${from.label} -> ${to.label}`);
    return edge;
  }
  
  /**
   * Get the reasoning chain for an entity - traverse the graph to explain "why".
   * Returns decision traces and connected nodes that led to the current state.
   */
  async getReasoningChain(
    entityType: string, 
    entityId: string, 
    depth: number = 3
  ): Promise<{
    traces: DecisionTrace[];
    connectedNodes: { node: ContextNode; edges: ContextEdge[] }[];
  }> {
    const traces = await storage.getDecisionTracesForEntity(entityType, entityId, 50);
    const entityNode = await storage.getContextNodeByEntity(entityType, entityId);
    
    const connectedNodes: { node: ContextNode; edges: ContextEdge[] }[] = [];
    
    if (entityNode) {
      const visited = new Set<string>();
      await this.traverseConnections(entityNode.id, depth, visited, connectedNodes);
    }
    
    return { traces, connectedNodes };
  }
  
  private async traverseConnections(
    nodeId: string,
    depth: number,
    visited: Set<string>,
    result: { node: ContextNode; edges: ContextEdge[] }[]
  ): Promise<void> {
    if (depth <= 0 || visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = await storage.getContextNode(nodeId);
    if (!node) return;
    
    const incomingEdges = await storage.getContextEdgesTo(nodeId);
    const outgoingEdges = await storage.getContextEdgesFrom(nodeId);
    const allEdges = [...incomingEdges, ...outgoingEdges];
    
    result.push({ node, edges: allEdges });
    
    for (const edge of incomingEdges) {
      await this.traverseConnections(edge.fromNodeId, depth - 1, visited, result);
    }
  }
  
  /**
   * Record when an interaction is logged - creates decision trace with context
   */
  async recordInteractionLogged(params: {
    interactionId: string;
    personId: string;
    personName: string;
    interactionType: string;
    summary?: string;
    aiExtractedData?: Record<string, unknown>;
    source: 'manual' | 'fathom' | 'granola' | 'plaud';
  }): Promise<DecisionTrace> {
    const evidence: DecisionInput['evidence'] = [];
    
    if (params.aiExtractedData) {
      const data = params.aiExtractedData;
      
      if (data.fordUpdates) {
        const fordKeys = Object.keys(data.fordUpdates as Record<string, unknown>).filter(k => 
          (data.fordUpdates as Record<string, unknown>)[k]
        );
        if (fordKeys.length > 0) {
          evidence.push({
            type: 'ford_extraction',
            summary: `AI extracted FORD notes: ${fordKeys.join(', ')}`,
            sourceId: params.interactionId,
          });
        }
      }
      
      if (data.followUps && Array.isArray(data.followUps) && data.followUps.length > 0) {
        evidence.push({
          type: 'follow_ups',
          summary: `AI identified ${data.followUps.length} follow-up items`,
          sourceId: params.interactionId,
        });
      }
      
      if (data.keyTopics && Array.isArray(data.keyTopics) && data.keyTopics.length > 0) {
        evidence.push({
          type: 'key_topics',
          summary: `Key topics discussed: ${(data.keyTopics as string[]).slice(0, 3).join(', ')}`,
          sourceId: params.interactionId,
        });
      }
      
      if (data.processingStatus === 'completed') {
        evidence.push({
          type: 'ai_processing',
          summary: 'AI processing completed successfully',
          sourceId: params.interactionId,
        });
      }
    }
    
    const trace = await this.recordDecision({
      traceType: params.source === 'manual' ? 'user_action' : 'system_event',
      actor: params.source === 'manual' ? 'user' : `system:${params.source}_sync`,
      action: 'logged_interaction',
      entityType: 'person',
      entityId: params.personId,
      inputs: { evidence },
      reasoning: `${params.interactionType} with ${params.personName} was logged${params.source !== 'manual' ? ` via ${params.source}` : ''}`,
      outcome: {
        success: true,
        newState: { lastContact: new Date().toISOString() },
        sideEffects: params.aiExtractedData ? [
          { type: 'ford_updated', description: 'FORD notes may have been updated from conversation' }
        ] : undefined,
      },
    });
    
    await this.linkEntities(
      { type: 'interaction', id: params.interactionId, label: `${params.interactionType}: ${params.summary || 'Conversation'}` },
      { type: 'person', id: params.personId, label: params.personName },
      ContextEdgeType.REFERENCES,
      'Interaction references this person'
    );
    
    return trace;
  }
  
  /**
   * Record when a segment change happens
   */
  async recordSegmentChange(params: {
    personId: string;
    personName: string;
    oldSegment: string | null;
    newSegment: string;
    reason: string;
    triggeredBy: 'user' | 'ai_suggestion' | 'system_rule';
    linkedSuggestionId?: string;
  }): Promise<DecisionTrace> {
    const evidence: DecisionInput['evidence'] = [];
    
    if (params.linkedSuggestionId) {
      evidence.push({
        type: 'observer_suggestion',
        summary: 'AI suggested this segment change',
        sourceId: params.linkedSuggestionId,
      });
    }
    
    return await this.recordDecision({
      traceType: params.triggeredBy === 'user' ? 'user_action' : params.triggeredBy === 'ai_suggestion' ? 'ai_action' : 'system_event',
      actor: params.triggeredBy === 'user' ? 'user' : params.triggeredBy === 'ai_suggestion' ? 'ai:workflow_coach' : 'system:segment_rules',
      action: 'segment_changed',
      entityType: 'person',
      entityId: params.personId,
      inputs: { 
        evidence,
        priorState: { segment: params.oldSegment },
      },
      reasoning: params.reason,
      outcome: {
        success: true,
        newState: { segment: params.newSegment },
      },
      reversible: true,
    });
  }
  
  /**
   * Record when a contact is promoted from Extended to Sphere
   */
  async recordPromotedToSphere(params: {
    personId: string;
    personName: string;
    segment: string;
    reason: string;
  }): Promise<DecisionTrace> {
    return await this.recordDecision({
      traceType: 'user_action',
      actor: 'user',
      action: 'promoted_to_sphere',
      entityType: 'person',
      entityId: params.personId,
      reasoning: params.reason,
      outcome: {
        success: true,
        newState: { inSphere: true, segment: params.segment },
      },
    });
  }
  
  /**
   * Record when a life event is detected for a contact
   */
  async recordLifeEventDetected(params: {
    alertId: string;
    personId: string;
    personName: string;
    eventType: string;
    eventCategory: string;
    confidence: string | null;
    summary: string | null;
    sourcePlatform: string | null;
  }): Promise<DecisionTrace> {
    const evidence: DecisionInput['evidence'] = [];
    
    if (params.sourcePlatform) {
      evidence.push({
        type: 'social_signal',
        summary: `Detected on ${params.sourcePlatform}`,
        sourceId: params.alertId,
      });
    }
    
    const trace = await this.recordDecision({
      traceType: 'system_event',
      actor: 'system:life_event_scanner',
      action: 'life_event_detected',
      entityType: 'person',
      entityId: params.personId,
      inputs: { evidence },
      reasoning: `${params.eventType} detected for ${params.personName}${params.confidence ? ` (${params.confidence} confidence)` : ''}`,
      outcome: {
        success: true,
        newState: { 
          lifeEvent: params.eventType,
          category: params.eventCategory,
        },
        sideEffects: [
          { type: 'outreach_opportunity', description: params.summary || `Potential real estate opportunity from ${params.eventType}` }
        ],
      },
    });
    
    await this.linkEntities(
      { type: 'life_event', id: params.alertId, label: `${params.eventType}: ${params.summary || 'Life event detected'}` },
      { type: 'person', id: params.personId, label: params.personName },
      ContextEdgeType.TRIGGERED,
      'Life event may trigger real estate activity'
    );
    
    return trace;
  }
  
  /**
   * Record when an observer suggestion is accepted or dismissed
   */
  async recordSuggestionAction(params: {
    suggestionId: string;
    suggestionTitle: string;
    action: 'accepted' | 'dismissed' | 'snoozed';
    personId?: string;
    personName?: string;
    feedbackNote?: string;
  }): Promise<DecisionTrace> {
    return await this.recordDecision({
      traceType: 'user_action',
      actor: 'user',
      action: `suggestion_${params.action}`,
      entityType: params.personId ? 'person' : 'suggestion',
      entityId: params.personId || params.suggestionId,
      inputs: {
        evidence: [{
          type: 'observer_suggestion',
          summary: params.suggestionTitle,
          sourceId: params.suggestionId,
        }],
      },
      reasoning: params.feedbackNote || `User ${params.action} the suggestion`,
      outcome: { success: true },
    });
  }
}

export const contextGraph = new ContextGraphService();
