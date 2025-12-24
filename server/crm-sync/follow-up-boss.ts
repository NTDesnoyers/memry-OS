/**
 * Follow Up Boss CRM Integration
 * Uses the Events API for lead intake and REST API for contact management
 * Docs: https://docs.followupboss.com
 */

import type { ICrmProvider, CrmContactPayload, CrmNotePayload, CrmTaskPayload, CrmEventPayload, SyncResult, CrmProviderConfig } from './types';

const FUB_BASE_URL = 'https://api.followupboss.com/v1';

export class FollowUpBossProvider implements ICrmProvider {
  name = 'follow_up_boss';
  displayName = 'Follow Up Boss';
  
  private apiKey: string;
  private systemKey?: string;
  private systemName: string;
  
  constructor(config: CrmProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Follow Up Boss requires an API key');
    }
    this.apiKey = config.apiKey;
    this.systemKey = config.systemKey;
    this.systemName = 'NinjaOS';
  }
  
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const headers: Record<string, string> = {
      'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
      'X-System': this.systemName,
    };
    
    if (this.systemKey) {
      headers['X-System-Key'] = this.systemKey;
    }
    
    try {
      const response = await fetch(`${FUB_BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || data.error || `HTTP ${response.status}` 
        };
      }
      
      return { success: true, data };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Network error' 
      };
    }
  }
  
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const result = await this.request('/me');
    return { 
      success: result.success, 
      error: result.error 
    };
  }
  
  async createContact(payload: CrmContactPayload): Promise<SyncResult> {
    const fubPayload = {
      firstName: payload.firstName,
      lastName: payload.lastName || '',
      emails: payload.email ? [{ value: payload.email }] : [],
      phones: payload.phone ? [{ value: payload.phone }] : [],
      tags: payload.tags || [],
      source: payload.source || 'NinjaOS',
      addresses: payload.address ? [{
        type: 'home',
        street: payload.address,
      }] : [],
    };
    
    const result = await this.request<{ id: number }>('/people', 'POST', fubPayload);
    
    if (result.success && result.data) {
      return {
        success: true,
        externalId: String(result.data.id),
        rawResponse: result.data,
      };
    }
    
    return {
      success: false,
      error: result.error,
    };
  }
  
  async updateContact(externalId: string, payload: Partial<CrmContactPayload>): Promise<SyncResult> {
    const fubPayload: Record<string, unknown> = {};
    
    if (payload.firstName) fubPayload.firstName = payload.firstName;
    if (payload.lastName) fubPayload.lastName = payload.lastName;
    if (payload.email) fubPayload.emails = [{ value: payload.email }];
    if (payload.phone) fubPayload.phones = [{ value: payload.phone }];
    if (payload.tags) fubPayload.tags = payload.tags;
    
    const result = await this.request(`/people/${externalId}`, 'PUT', fubPayload);
    
    return {
      success: result.success,
      externalId,
      error: result.error,
    };
  }
  
  async createNote(payload: CrmNotePayload): Promise<SyncResult> {
    if (!payload.contactExternalId) {
      return { success: false, error: 'Contact external ID required for Follow Up Boss notes' };
    }
    
    const fubPayload = {
      personId: parseInt(payload.contactExternalId, 10),
      body: payload.content,
      subject: payload.title || '',
    };
    
    const result = await this.request<{ id: number }>('/notes', 'POST', fubPayload);
    
    if (result.success && result.data) {
      return {
        success: true,
        externalId: String(result.data.id),
        rawResponse: result.data,
      };
    }
    
    return {
      success: false,
      error: result.error,
    };
  }
  
  async createTask(payload: CrmTaskPayload): Promise<SyncResult> {
    if (!payload.contactExternalId) {
      return { success: false, error: 'Contact external ID required for Follow Up Boss tasks' };
    }
    
    const fubPayload = {
      personId: parseInt(payload.contactExternalId, 10),
      description: payload.title,
      dueDate: payload.dueDate ? payload.dueDate.toISOString().split('T')[0] : undefined,
      isCompleted: payload.completed || false,
    };
    
    const result = await this.request<{ id: number }>('/tasks', 'POST', fubPayload);
    
    if (result.success && result.data) {
      return {
        success: true,
        externalId: String(result.data.id),
        rawResponse: result.data,
      };
    }
    
    return {
      success: false,
      error: result.error,
    };
  }
  
  async updateTask(externalId: string, payload: Partial<CrmTaskPayload>): Promise<SyncResult> {
    const fubPayload: Record<string, unknown> = {};
    
    if (payload.title) fubPayload.description = payload.title;
    if (payload.dueDate) fubPayload.dueDate = payload.dueDate.toISOString().split('T')[0];
    if (payload.completed !== undefined) fubPayload.isCompleted = payload.completed;
    
    const result = await this.request(`/tasks/${externalId}`, 'PUT', fubPayload);
    
    return {
      success: result.success,
      externalId,
      error: result.error,
    };
  }
  
  async sendEvent(payload: CrmEventPayload): Promise<SyncResult> {
    const fubPayload = {
      source: payload.source || 'NinjaOS',
      type: payload.type,
      message: payload.message,
      person: {
        firstName: payload.person.firstName,
        lastName: payload.person.lastName,
        emails: payload.person.emails,
        phones: payload.person.phones,
        tags: payload.person.tags,
      },
    };
    
    const result = await this.request<{ id: number; personId: number }>('/events', 'POST', fubPayload);
    
    if (result.success && result.data) {
      return {
        success: true,
        externalId: String(result.data.personId),
        rawResponse: result.data,
      };
    }
    
    return {
      success: false,
      error: result.error,
    };
  }
  
  async lookupContact(email?: string, phone?: string): Promise<{ externalId: string } | null> {
    let query = '';
    if (email) query = `email=${encodeURIComponent(email)}`;
    else if (phone) query = `phone=${encodeURIComponent(phone)}`;
    else return null;
    
    const result = await this.request<{ people: Array<{ id: number }> }>(`/people?${query}`);
    
    if (result.success && result.data?.people?.length) {
      return { externalId: String(result.data.people[0].id) };
    }
    
    return null;
  }
}
