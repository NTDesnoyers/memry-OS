/**
 * Beeper Desktop API Integration
 * Captures messages from unified messaging across all networks
 * Docs: https://developers.beeper.com/desktop-api
 * 
 * Note: Beeper API runs locally on the user's desktop at localhost:23373
 * This integration connects to it when the user has Beeper Desktop running
 */

import type { CrmProviderConfig } from './types';

const DEFAULT_BEEPER_PORT = 23373;

export type BeeperMessage = {
  id: string;
  chatId: string;
  sender: {
    name: string;
    identifier?: string;
  };
  text: string;
  timestamp: Date;
  isFromMe: boolean;
  network?: string;
};

export type BeeperChat = {
  id: string;
  name: string;
  network: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  participants: Array<{
    name: string;
    identifier?: string;
  }>;
};

export class BeeperIntegration {
  private baseUrl: string;
  private accessToken?: string;
  
  constructor(config: CrmProviderConfig) {
    const port = config.customFields?.beeperPort || DEFAULT_BEEPER_PORT;
    this.baseUrl = `http://localhost:${port}`;
    this.accessToken = config.accessToken;
  }
  
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}` 
        };
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Connection failed - is Beeper Desktop running?' 
      };
    }
  }
  
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const result = await this.request('/v1/accounts');
    if (result.success) {
      return { success: true };
    }
    return { 
      success: false, 
      error: result.error || 'Cannot connect to Beeper Desktop API' 
    };
  }
  
  async getAccounts(): Promise<Array<{ id: string; network: string; displayName: string }>> {
    const result = await this.request<{ accounts: Array<{ id: string; network: string; displayName: string }> }>('/v1/accounts');
    return result.data?.accounts || [];
  }
  
  async searchChats(query?: string, limit: number = 20): Promise<BeeperChat[]> {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    params.set('limit', String(limit));
    
    const result = await this.request<{ chats: Array<{
      id: string;
      name: string;
      accountId: string;
      lastMessage?: { text: string; timestamp: string };
      participants: Array<{ name: string; identifier?: string }>;
    }> }>(`/v1/chats/search?${params}`);
    
    if (!result.data?.chats) return [];
    
    return result.data.chats.map(chat => ({
      id: chat.id,
      name: chat.name,
      network: chat.accountId.split('_')[0] || 'unknown',
      lastMessage: chat.lastMessage?.text,
      lastMessageAt: chat.lastMessage ? new Date(chat.lastMessage.timestamp) : undefined,
      participants: chat.participants,
    }));
  }
  
  async getChatMessages(chatId: string, limit: number = 50): Promise<BeeperMessage[]> {
    const result = await this.request<{ messages: Array<{
      id: string;
      chatId: string;
      sender: { name: string; identifier?: string };
      text: string;
      timestamp: string;
      isFromMe: boolean;
    }> }>(`/v1/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`);
    
    if (!result.data?.messages) return [];
    
    return result.data.messages.map(msg => ({
      id: msg.id,
      chatId: msg.chatId,
      sender: msg.sender,
      text: msg.text,
      timestamp: new Date(msg.timestamp),
      isFromMe: msg.isFromMe,
    }));
  }
  
  async searchMessages(
    query: string,
    options?: { accountIds?: string[]; limit?: number }
  ): Promise<BeeperMessage[]> {
    const params = new URLSearchParams();
    params.set('query', query);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.accountIds) {
      options.accountIds.forEach(id => params.append('account_ids', id));
    }
    
    const result = await this.request<{ messages: Array<{
      id: string;
      chatId: string;
      sender: { name: string; identifier?: string };
      text: string;
      timestamp: string;
      isFromMe: boolean;
      accountId: string;
    }> }>(`/v1/messages/search?${params}`);
    
    if (!result.data?.messages) return [];
    
    return result.data.messages.map(msg => ({
      id: msg.id,
      chatId: msg.chatId,
      sender: msg.sender,
      text: msg.text,
      timestamp: new Date(msg.timestamp),
      isFromMe: msg.isFromMe,
      network: msg.accountId.split('_')[0] || 'unknown',
    }));
  }
  
  async sendMessage(chatId: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const result = await this.request<{ id: string }>(`/v1/chats/${encodeURIComponent(chatId)}/messages`, 'POST', { text });
    
    if (result.success && result.data) {
      return { success: true, messageId: result.data.id };
    }
    
    return { success: false, error: result.error };
  }
}
