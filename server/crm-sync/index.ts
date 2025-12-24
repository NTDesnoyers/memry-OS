/**
 * CRM Sync Service - Orchestrates syncing data to external CRMs
 * Supports multiple providers: Follow Up Boss, Cloze, Zapier webhook
 */

import { db } from '../db';
import { eq, and, lt, isNull, or } from 'drizzle-orm';
import { 
  crmIntegrations, 
  crmSyncQueue, 
  crmFieldMappings,
  people,
  interactions,
  tasks,
  type CrmIntegration,
  type CrmSyncQueue,
  type Person,
  type Interaction,
  type Task,
} from '@shared/schema';
import type { ICrmProvider, CrmContactPayload, CrmNotePayload, CrmTaskPayload, CrmProviderConfig } from './types';
import { FollowUpBossProvider } from './follow-up-boss';
import { ClozeProvider } from './cloze';
import { ZapierWebhookProvider } from './zapier-webhook';

export type CrmProviderType = 'follow_up_boss' | 'cloze' | 'zapier' | 'liondesk';

export class CrmSyncService {
  private providers: Map<string, ICrmProvider> = new Map();
  
  private createProvider(integration: CrmIntegration): ICrmProvider | null {
    const config = integration.config as CrmProviderConfig;
    
    try {
      switch (integration.provider) {
        case 'follow_up_boss':
          return new FollowUpBossProvider(config);
        case 'cloze':
          return new ClozeProvider(config);
        case 'zapier':
          return new ZapierWebhookProvider(config);
        default:
          console.warn(`Unknown CRM provider: ${integration.provider}`);
          return null;
      }
    } catch (err) {
      console.error(`Failed to create provider ${integration.provider}:`, err);
      return null;
    }
  }
  
  private async getProvider(integrationId: string): Promise<ICrmProvider | null> {
    if (this.providers.has(integrationId)) {
      return this.providers.get(integrationId)!;
    }
    
    const [integration] = await db
      .select()
      .from(crmIntegrations)
      .where(eq(crmIntegrations.id, integrationId));
    
    if (!integration || !integration.isActive) {
      return null;
    }
    
    const provider = this.createProvider(integration);
    if (provider) {
      this.providers.set(integrationId, provider);
    }
    return provider;
  }
  
  async getActiveIntegrations(): Promise<CrmIntegration[]> {
    return db
      .select()
      .from(crmIntegrations)
      .where(eq(crmIntegrations.isActive, true));
  }
  
  async getPrimaryIntegration(): Promise<CrmIntegration | null> {
    const [integration] = await db
      .select()
      .from(crmIntegrations)
      .where(and(
        eq(crmIntegrations.isActive, true),
        eq(crmIntegrations.isPrimary, true)
      ));
    return integration || null;
  }
  
  async testConnection(integrationId: string): Promise<{ success: boolean; error?: string }> {
    const provider = await this.getProvider(integrationId);
    if (!provider) {
      return { success: false, error: 'Integration not found or inactive' };
    }
    return provider.testConnection();
  }
  
  private personToContactPayload(person: Person): CrmContactPayload {
    const nameParts = person.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || undefined;
    
    return {
      firstName,
      lastName,
      email: person.email || undefined,
      phone: person.phone || undefined,
      segment: person.segment || undefined,
      tags: [],
      fordFamily: person.fordFamily || undefined,
      fordOccupation: person.fordOccupation || undefined,
      fordRecreation: person.fordRecreation || undefined,
      fordDreams: person.fordDreams || undefined,
      notes: person.notes || undefined,
      address: person.address || undefined,
    };
  }
  
  private interactionToNotePayload(interaction: Interaction, contactExternalId?: string): CrmNotePayload {
    return {
      contactExternalId,
      localContactId: interaction.personId || undefined,
      title: interaction.title || undefined,
      content: interaction.summary || interaction.transcript || 'No content',
      type: (interaction.type as 'call' | 'meeting' | 'text' | 'email' | 'note') || 'note',
      occurredAt: interaction.occurredAt,
      duration: interaction.duration || undefined,
      participants: interaction.participants || undefined,
    };
  }
  
  private taskToTaskPayload(task: Task, contactExternalId?: string): CrmTaskPayload {
    return {
      contactExternalId,
      localContactId: task.personId || undefined,
      title: task.title,
      description: task.description || undefined,
      dueDate: task.dueDate || undefined,
      priority: (task.priority as 'high' | 'medium' | 'low') || 'medium',
      completed: task.completed,
    };
  }
  
  async getExternalId(
    integrationId: string, 
    localEntityType: string, 
    localEntityId: string
  ): Promise<string | null> {
    const [mapping] = await db
      .select()
      .from(crmFieldMappings)
      .where(and(
        eq(crmFieldMappings.integrationId, integrationId),
        eq(crmFieldMappings.localEntityType, localEntityType),
        eq(crmFieldMappings.localEntityId, localEntityId)
      ));
    return mapping?.externalId || null;
  }
  
  async saveExternalId(
    integrationId: string,
    localEntityType: string,
    localEntityId: string,
    externalId: string
  ): Promise<void> {
    await db.insert(crmFieldMappings).values({
      integrationId,
      localEntityType,
      localEntityId,
      externalId,
      lastSyncedAt: new Date(),
    });
  }
  
  async queueSync(
    integrationId: string,
    entityType: 'person' | 'interaction' | 'task',
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    payload: Record<string, unknown>
  ): Promise<CrmSyncQueue> {
    const [queueItem] = await db.insert(crmSyncQueue).values({
      integrationId,
      entityType,
      entityId,
      operation,
      payload,
      status: 'pending',
      scheduledFor: new Date(),
    }).returning();
    
    return queueItem;
  }
  
  async syncPerson(person: Person, operation: 'create' | 'update' = 'create'): Promise<void> {
    const integrations = await this.getActiveIntegrations();
    
    for (const integration of integrations) {
      if (!integration.syncContactsEnabled) continue;
      
      const payload = this.personToContactPayload(person);
      await this.queueSync(integration.id, 'person', person.id, operation, payload);
    }
  }
  
  async syncInteraction(interaction: Interaction): Promise<void> {
    const integrations = await this.getActiveIntegrations();
    
    for (const integration of integrations) {
      if (!integration.syncNotesEnabled) continue;
      
      let contactExternalId: string | undefined;
      if (interaction.personId) {
        contactExternalId = await this.getExternalId(integration.id, 'person', interaction.personId) || undefined;
      }
      
      const payload = this.interactionToNotePayload(interaction, contactExternalId);
      await this.queueSync(integration.id, 'interaction', interaction.id, 'create', payload);
    }
  }
  
  async syncTask(task: Task, operation: 'create' | 'update' = 'create'): Promise<void> {
    const integrations = await this.getActiveIntegrations();
    
    for (const integration of integrations) {
      if (!integration.syncTasksEnabled) continue;
      
      let contactExternalId: string | undefined;
      if (task.personId) {
        contactExternalId = await this.getExternalId(integration.id, 'person', task.personId) || undefined;
      }
      
      const payload = this.taskToTaskPayload(task, contactExternalId);
      await this.queueSync(integration.id, 'task', task.id, operation, payload);
    }
  }
  
  async processQueue(limit: number = 10): Promise<{ processed: number; failed: number }> {
    const pendingItems = await db
      .select()
      .from(crmSyncQueue)
      .where(and(
        or(eq(crmSyncQueue.status, 'pending'), eq(crmSyncQueue.status, 'retry')),
        lt(crmSyncQueue.scheduledFor, new Date())
      ))
      .limit(limit);
    
    let processed = 0;
    let failed = 0;
    
    for (const item of pendingItems) {
      const result = await this.processSyncItem(item);
      if (result.success) {
        processed++;
      } else {
        failed++;
      }
    }
    
    return { processed, failed };
  }
  
  private async processSyncItem(item: CrmSyncQueue): Promise<{ success: boolean; error?: string }> {
    await db
      .update(crmSyncQueue)
      .set({ status: 'processing', attempts: (item.attempts || 0) + 1 })
      .where(eq(crmSyncQueue.id, item.id));
    
    const provider = await this.getProvider(item.integrationId);
    if (!provider) {
      await db
        .update(crmSyncQueue)
        .set({ status: 'failed', lastError: 'Provider not available' })
        .where(eq(crmSyncQueue.id, item.id));
      return { success: false, error: 'Provider not available' };
    }
    
    try {
      let result;
      const payload = item.payload as Record<string, unknown>;
      
      switch (item.entityType) {
        case 'person':
          if (item.operation === 'create') {
            result = await provider.createContact(payload as CrmContactPayload);
          } else {
            const externalId = await this.getExternalId(item.integrationId, 'person', item.entityId);
            if (externalId) {
              result = await provider.updateContact(externalId, payload as Partial<CrmContactPayload>);
            } else {
              result = await provider.createContact(payload as CrmContactPayload);
            }
          }
          break;
          
        case 'interaction':
          result = await provider.createNote(payload as CrmNotePayload);
          break;
          
        case 'task':
          if (provider.createTask) {
            if (item.operation === 'create') {
              result = await provider.createTask(payload as CrmTaskPayload);
            } else {
              const externalId = await this.getExternalId(item.integrationId, 'task', item.entityId);
              if (externalId && provider.updateTask) {
                result = await provider.updateTask(externalId, payload as Partial<CrmTaskPayload>);
              } else {
                result = await provider.createTask(payload as CrmTaskPayload);
              }
            }
          } else {
            result = { success: false, error: 'Provider does not support tasks' };
          }
          break;
          
        default:
          result = { success: false, error: `Unknown entity type: ${item.entityType}` };
      }
      
      if (result.success) {
        await db
          .update(crmSyncQueue)
          .set({ 
            status: 'completed', 
            processedAt: new Date(),
            externalId: result.externalId || null,
          })
          .where(eq(crmSyncQueue.id, item.id));
        
        if (result.externalId) {
          await this.saveExternalId(
            item.integrationId,
            item.entityType,
            item.entityId,
            result.externalId
          );
        }
        
        await db
          .update(crmIntegrations)
          .set({ 
            lastSyncAt: new Date(),
            lastSyncStatus: 'success',
            lastSyncError: null,
          })
          .where(eq(crmIntegrations.id, item.integrationId));
        
        return { success: true };
      } else {
        const shouldRetry = (item.attempts || 0) < (item.maxAttempts || 3);
        await db
          .update(crmSyncQueue)
          .set({ 
            status: shouldRetry ? 'retry' : 'failed',
            lastError: result.error,
            scheduledFor: shouldRetry 
              ? new Date(Date.now() + Math.pow(2, item.attempts || 1) * 60000)
              : item.scheduledFor,
          })
          .where(eq(crmSyncQueue.id, item.id));
        
        return { success: false, error: result.error };
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      await db
        .update(crmSyncQueue)
        .set({ status: 'failed', lastError: error })
        .where(eq(crmSyncQueue.id, item.id));
      
      return { success: false, error };
    }
  }
  
  async retryFailedItems(): Promise<number> {
    const result = await db
      .update(crmSyncQueue)
      .set({ status: 'pending', scheduledFor: new Date() })
      .where(eq(crmSyncQueue.status, 'retry'));
    
    return 0;
  }
}

export const crmSyncService = new CrmSyncService();
