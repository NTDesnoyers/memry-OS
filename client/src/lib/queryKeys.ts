/**
 * Centralized Query Key Registry
 * 
 * All React Query cache keys must be defined here.
 * This prevents cache invalidation bugs where producers and consumers use different keys.
 * 
 * RULE: No inline query keys in components. Only queryKeys.* functions allowed.
 * 
 * See postmortem: docs/postmortems/2026-01-signal-actions.md
 */

export const queryKeys = {
  // Core entities
  signals: () => ["/api/signals"] as const,
  generatedDrafts: () => ["/api/generated-drafts"] as const,
  tasks: () => ["/api/tasks"] as const,
  interactions: () => ["/api/interactions"] as const,
  
  // People
  people: () => ["/api/people"] as const,
  person: (personId: string) => ["/api/people", personId] as const,
  personInteractions: (personId: string) => ["/api/people", personId, "interactions"] as const,
  personDrafts: (personId: string) => ["/api/people", personId, "drafts"] as const,
  
  // Weekly review
  weeklyReview: () => ["/api/weekly-review"] as const,
  weeklyReviewStats: () => ["/api/weekly-review/stats"] as const,
  
  // AI and voice
  aiConversations: () => ["/api/ai-conversations"] as const,
  voiceProfile: () => ["/api/voice-profile"] as const,
  
  // Admin
  betaDashboard: () => ["/api/admin/beta-dashboard"] as const,
  
  // External services
  gmailStatus: () => ["/api/gmail/status"] as const,
  
  // Experiences
  experiences: () => ["/api/experiences"] as const,
  personExperiences: (personId: string) => ["/api/people", personId, "experiences"] as const,
};
