import { db } from "../../db";
import { aiConversations, AiConversation } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export type ChatMessage = {
  role: string;
  content: string;
  createdAt: string;
};

export interface IChatStorage {
  getConversation(id: string): Promise<AiConversation | undefined>;
  getAllConversations(): Promise<AiConversation[]>;
  createConversation(title: string): Promise<AiConversation>;
  deleteConversation(id: string): Promise<void>;
  getMessagesByConversation(conversationId: string): Promise<ChatMessage[]>;
  createMessage(conversationId: string, role: string, content: string): Promise<ChatMessage>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: string) {
    const [conversation] = await db.select().from(aiConversations).where(eq(aiConversations.id, id));
    return conversation;
  },

  async getAllConversations() {
    return db.select().from(aiConversations).orderBy(desc(aiConversations.createdAt));
  },

  async createConversation(title: string) {
    const [conversation] = await db.insert(aiConversations).values({ title, messages: [] }).returning();
    return conversation;
  },

  async deleteConversation(id: string) {
    await db.delete(aiConversations).where(eq(aiConversations.id, id));
  },

  async getMessagesByConversation(conversationId: string) {
    const [conversation] = await db.select().from(aiConversations).where(eq(aiConversations.id, conversationId));
    if (!conversation) return [];
    return (conversation.messages as ChatMessage[]) || [];
  },

  async createMessage(conversationId: string, role: string, content: string) {
    const [conversation] = await db.select().from(aiConversations).where(eq(aiConversations.id, conversationId));
    if (!conversation) throw new Error("Conversation not found");
    
    const newMessage: ChatMessage = {
      role,
      content,
      createdAt: new Date().toISOString(),
    };
    
    const existingMessages = (conversation.messages as ChatMessage[]) || [];
    const updatedMessages = [...existingMessages, newMessage];
    
    await db.update(aiConversations)
      .set({ messages: updatedMessages, updatedAt: new Date() })
      .where(eq(aiConversations.id, conversationId));
    
    return newMessage;
  },
};
