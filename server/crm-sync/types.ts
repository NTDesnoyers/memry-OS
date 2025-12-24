/**
 * CRM Sync Types - Standardized data format for syncing to external CRMs
 */

export type CrmContactPayload = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  segment?: string;
  tags?: string[];
  fordFamily?: string;
  fordOccupation?: string;
  fordRecreation?: string;
  fordDreams?: string;
  notes?: string;
  address?: string;
  source?: string;
};

export type CrmNotePayload = {
  contactExternalId?: string;
  localContactId?: string;
  title?: string;
  content: string;
  type: 'call' | 'meeting' | 'text' | 'email' | 'note';
  occurredAt: Date;
  duration?: number;
  participants?: string[];
};

export type CrmTaskPayload = {
  contactExternalId?: string;
  localContactId?: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: 'high' | 'medium' | 'low';
  completed?: boolean;
};

export type CrmEventPayload = {
  source: string;
  type: string;
  message?: string;
  person: {
    firstName: string;
    lastName?: string;
    emails?: { value: string }[];
    phones?: { value: string }[];
    tags?: string[];
  };
};

export type SyncResult = {
  success: boolean;
  externalId?: string;
  error?: string;
  rawResponse?: unknown;
};

export interface ICrmProvider {
  name: string;
  displayName: string;
  
  testConnection(): Promise<{ success: boolean; error?: string }>;
  
  createContact(payload: CrmContactPayload): Promise<SyncResult>;
  updateContact(externalId: string, payload: Partial<CrmContactPayload>): Promise<SyncResult>;
  
  createNote(payload: CrmNotePayload): Promise<SyncResult>;
  
  createTask?(payload: CrmTaskPayload): Promise<SyncResult>;
  updateTask?(externalId: string, payload: Partial<CrmTaskPayload>): Promise<SyncResult>;
  
  sendEvent?(payload: CrmEventPayload): Promise<SyncResult>;
  
  lookupContact?(email?: string, phone?: string): Promise<{ externalId: string } | null>;
}

export type CrmProviderConfig = {
  apiKey?: string;
  apiUrl?: string;
  webhookUrl?: string;
  systemKey?: string;
  accessToken?: string;
  refreshToken?: string;
  customFields?: Record<string, string>;
};
