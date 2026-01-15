import { apiRequest } from "./queryClient";

export type BetaEventType = 
  | 'app_opened'
  | 'user_login'
  | 'user_signup'
  | 'login_failed'
  | 'feature_opened'
  | 'conversation_logged'
  | 'followup_created'
  | 'weekly_review_viewed'
  | 'draft_created'
  | 'activated';

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
