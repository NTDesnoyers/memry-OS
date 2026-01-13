import { apiRequest } from "./queryClient";

export type BetaEventType = 
  | 'app_opened'
  | 'feature_opened'
  | 'conversation_logged'
  | 'followup_created'
  | 'weekly_review_viewed'
  | 'draft_created';

export async function trackBetaEvent(
  eventType: BetaEventType,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    await apiRequest("POST", "/api/beta/track", {
      eventType,
      properties,
    });
  } catch (error) {
    console.error("Failed to track beta event:", error);
  }
}

export async function sendHeartbeat(): Promise<void> {
  try {
    await apiRequest("POST", "/api/beta/heartbeat", {});
  } catch (error) {
    console.error("Failed to send heartbeat:", error);
  }
}
