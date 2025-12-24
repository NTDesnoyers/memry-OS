/**
 * Cloze CRM Integration
 * Popular with Ninja Selling agents
 * Docs: https://api.cloze.com/api-docs/
 */

import type { ICrmProvider, CrmContactPayload, CrmNotePayload, CrmTaskPayload, SyncResult, CrmProviderConfig } from './types';

const CLOZE_BASE_URL = 'https://api.cloze.com/v1';

export class ClozeProvider implements ICrmProvider {
  name = 'cloze';
  displayName = 'Cloze';
  
  private apiKey: string;
  
  constructor(config: CrmProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Cloze requires an API key');
    }
    this.apiKey = config.apiKey;
  }
  
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await fetch(`${CLOZE_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
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
    const result = await this.request('/profile');
    return { 
      success: result.success, 
      error: result.error 
    };
  }
  
  async createContact(payload: CrmContactPayload): Promise<SyncResult> {
    const clozePayload = {
      name: payload.lastName 
        ? `${payload.firstName} ${payload.lastName}` 
        : payload.firstName,
      emails: payload.email ? [{ value: payload.email, type: 'work' }] : [],
      phones: payload.phone ? [{ value: payload.phone, type: 'mobile' }] : [],
      notes: this.buildNotesFromPayload(payload),
      tags: payload.tags || [],
      addresses: payload.address ? [{
        street: payload.address,
        type: 'home',
      }] : [],
      customFields: {
        segment: payload.segment,
      },
    };
    
    const result = await this.request<{ id: string }>('/people', 'POST', clozePayload);
    
    if (result.success && result.data) {
      return {
        success: true,
        externalId: result.data.id,
        rawResponse: result.data,
      };
    }
    
    return {
      success: false,
      error: result.error,
    };
  }
  
  private buildNotesFromPayload(payload: CrmContactPayload): string {
    const parts: string[] = [];
    
    if (payload.notes) {
      parts.push(payload.notes);
    }
    
    if (payload.fordFamily || payload.fordOccupation || payload.fordRecreation || payload.fordDreams) {
      parts.push('\n--- FORD Notes ---');
      if (payload.fordFamily) parts.push(`Family: ${payload.fordFamily}`);
      if (payload.fordOccupation) parts.push(`Occupation: ${payload.fordOccupation}`);
      if (payload.fordRecreation) parts.push(`Recreation: ${payload.fordRecreation}`);
      if (payload.fordDreams) parts.push(`Dreams: ${payload.fordDreams}`);
    }
    
    return parts.join('\n');
  }
  
  async updateContact(externalId: string, payload: Partial<CrmContactPayload>): Promise<SyncResult> {
    const clozePayload: Record<string, unknown> = { id: externalId };
    
    if (payload.firstName) {
      clozePayload.name = payload.lastName 
        ? `${payload.firstName} ${payload.lastName}` 
        : payload.firstName;
    }
    if (payload.email) clozePayload.emails = [{ value: payload.email, type: 'work' }];
    if (payload.phone) clozePayload.phones = [{ value: payload.phone, type: 'mobile' }];
    if (payload.tags) clozePayload.tags = payload.tags;
    
    const result = await this.request(`/people/${externalId}`, 'PUT', clozePayload);
    
    return {
      success: result.success,
      externalId,
      error: result.error,
    };
  }
  
  async createNote(payload: CrmNotePayload): Promise<SyncResult> {
    const noteContent = [
      payload.title ? `**${payload.title}**` : '',
      payload.content,
      payload.participants?.length ? `\nParticipants: ${payload.participants.join(', ')}` : '',
      payload.duration ? `\nDuration: ${payload.duration} minutes` : '',
    ].filter(Boolean).join('\n');
    
    const clozePayload = {
      personId: payload.contactExternalId,
      type: this.mapNoteToClozeType(payload.type),
      content: noteContent,
      date: payload.occurredAt.toISOString(),
    };
    
    const result = await this.request<{ id: string }>('/timeline', 'POST', clozePayload);
    
    if (result.success && result.data) {
      return {
        success: true,
        externalId: result.data.id,
        rawResponse: result.data,
      };
    }
    
    return {
      success: false,
      error: result.error,
    };
  }
  
  private mapNoteToClozeType(type: string): string {
    const typeMap: Record<string, string> = {
      call: 'call',
      meeting: 'meeting',
      text: 'message',
      email: 'email',
      note: 'note',
    };
    return typeMap[type] || 'note';
  }
  
  async createTask(payload: CrmTaskPayload): Promise<SyncResult> {
    const clozePayload = {
      personId: payload.contactExternalId,
      title: payload.title,
      description: payload.description,
      dueDate: payload.dueDate?.toISOString(),
      priority: payload.priority || 'medium',
      completed: payload.completed || false,
    };
    
    const result = await this.request<{ id: string }>('/tasks', 'POST', clozePayload);
    
    if (result.success && result.data) {
      return {
        success: true,
        externalId: result.data.id,
        rawResponse: result.data,
      };
    }
    
    return {
      success: false,
      error: result.error,
    };
  }
  
  async updateTask(externalId: string, payload: Partial<CrmTaskPayload>): Promise<SyncResult> {
    const clozePayload: Record<string, unknown> = { id: externalId };
    
    if (payload.title) clozePayload.title = payload.title;
    if (payload.description) clozePayload.description = payload.description;
    if (payload.dueDate) clozePayload.dueDate = payload.dueDate.toISOString();
    if (payload.completed !== undefined) clozePayload.completed = payload.completed;
    
    const result = await this.request(`/tasks/${externalId}`, 'PUT', clozePayload);
    
    return {
      success: result.success,
      externalId,
      error: result.error,
    };
  }
  
  async lookupContact(email?: string, phone?: string): Promise<{ externalId: string } | null> {
    let query = '';
    if (email) query = `email=${encodeURIComponent(email)}`;
    else if (phone) query = `phone=${encodeURIComponent(phone)}`;
    else return null;
    
    const result = await this.request<{ people: Array<{ id: string }> }>(`/people/search?${query}`);
    
    if (result.success && result.data?.people?.length) {
      return { externalId: result.data.people[0].id };
    }
    
    return null;
  }
}
