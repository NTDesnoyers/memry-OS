/**
 * Zapier Webhook CRM Integration
 * Generic fallback for CRMs that don't have direct API access
 * Sends data to a Zapier webhook URL that can route to any CRM
 */

import type { ICrmProvider, CrmContactPayload, CrmNotePayload, CrmTaskPayload, SyncResult, CrmProviderConfig } from './types';

export class ZapierWebhookProvider implements ICrmProvider {
  name = 'zapier';
  displayName = 'Zapier Webhook';
  
  private webhookUrl: string;
  
  constructor(config: CrmProviderConfig) {
    if (!config.webhookUrl) {
      throw new Error('Zapier integration requires a webhook URL');
    }
    this.webhookUrl = config.webhookUrl;
  }
  
  private async sendWebhook(
    eventType: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          timestamp: new Date().toISOString(),
          source: 'NinjaOS',
          data,
        }),
      });
      
      if (!response.ok) {
        return { 
          success: false, 
          error: `Zapier webhook returned ${response.status}` 
        };
      }
      
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Network error' 
      };
    }
  }
  
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const result = await this.sendWebhook('test_connection', {
      message: 'NinjaOS connection test',
    });
    return result;
  }
  
  async createContact(payload: CrmContactPayload): Promise<SyncResult> {
    const result = await this.sendWebhook('contact_created', {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      segment: payload.segment,
      tags: payload.tags,
      notes: payload.notes,
      address: payload.address,
      ford: {
        family: payload.fordFamily,
        occupation: payload.fordOccupation,
        recreation: payload.fordRecreation,
        dreams: payload.fordDreams,
      },
    });
    
    return {
      success: result.success,
      error: result.error,
    };
  }
  
  async updateContact(externalId: string, payload: Partial<CrmContactPayload>): Promise<SyncResult> {
    const result = await this.sendWebhook('contact_updated', {
      externalId,
      ...payload,
    });
    
    return {
      success: result.success,
      externalId,
      error: result.error,
    };
  }
  
  async createNote(payload: CrmNotePayload): Promise<SyncResult> {
    const result = await this.sendWebhook('note_created', {
      contactId: payload.contactExternalId || payload.localContactId,
      title: payload.title,
      content: payload.content,
      type: payload.type,
      occurredAt: payload.occurredAt.toISOString(),
      duration: payload.duration,
      participants: payload.participants,
    });
    
    return {
      success: result.success,
      error: result.error,
    };
  }
  
  async createTask(payload: CrmTaskPayload): Promise<SyncResult> {
    const result = await this.sendWebhook('task_created', {
      contactId: payload.contactExternalId || payload.localContactId,
      title: payload.title,
      description: payload.description,
      dueDate: payload.dueDate?.toISOString(),
      priority: payload.priority,
      completed: payload.completed,
    });
    
    return {
      success: result.success,
      error: result.error,
    };
  }
  
  async updateTask(externalId: string, payload: Partial<CrmTaskPayload>): Promise<SyncResult> {
    const result = await this.sendWebhook('task_updated', {
      externalId,
      ...payload,
      dueDate: payload.dueDate?.toISOString(),
    });
    
    return {
      success: result.success,
      externalId,
      error: result.error,
    };
  }
  
  async lookupContact(): Promise<{ externalId: string } | null> {
    return null;
  }
}
