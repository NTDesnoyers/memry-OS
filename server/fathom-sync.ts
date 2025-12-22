import { storage } from "./storage";
import crypto from "crypto";

const FATHOM_API_URL = "https://api.fathom.ai/external/v1";
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let syncInterval: NodeJS.Timeout | null = null;
let lastSyncTime: Date | null = null;
let syncStatus = {
  isRunning: false,
  lastSync: null as Date | null,
  lastResult: null as { synced: number; failed: number; message?: string } | null,
  error: null as string | null,
};

function generateExternalId(meeting: any): string {
  const meetingUrl = meeting.url || "";
  const meetingId = meetingUrl.split("/").pop() || "";
  const uniqueStr = `fathom_${meetingId}${meeting.title || ""}${meeting.created_at || ""}`;
  return crypto.createHash("md5").update(uniqueStr).digest("hex");
}

function parseTranscript(transcriptData: any[]): string {
  if (!Array.isArray(transcriptData)) return "";
  
  return transcriptData.map(entry => {
    const speaker = entry.speaker?.display_name || "Unknown";
    const text = entry.text || "";
    const timestamp = entry.timestamp || "";
    return `[${timestamp}] ${speaker}: ${text}`;
  }).join("\n");
}

function parseParticipants(meeting: any): any[] {
  const participants: any[] = [];
  
  const calendarInvitees = meeting.calendar_invitees || [];
  for (const invitee of calendarInvitees) {
    if (invitee.name) {
      participants.push({
        name: invitee.name,
        email: invitee.email || "",
        isExternal: invitee.is_external ?? true,
      });
    }
  }
  
  const recordedBy = meeting.recorded_by;
  if (recordedBy?.name) {
    const alreadyAdded = participants.some(p => p.name === recordedBy.name);
    if (!alreadyAdded) {
      participants.unshift({
        name: recordedBy.name,
        email: recordedBy.email || "",
        isHost: true,
      });
    }
  }
  
  return participants;
}

async function fetchMeetings(apiKey: string, createdAfter?: string): Promise<any[]> {
  const headers = {
    "X-Api-Key": apiKey,
    "Content-Type": "application/json",
  };
  
  const allMeetings: any[] = [];
  let cursor: string | null = null;
  
  while (true) {
    const params = new URLSearchParams({ include_transcript: "true" });
    if (createdAfter) params.set("created_after", createdAfter);
    if (cursor) params.set("cursor", cursor);
    
    const response = await fetch(`${FATHOM_API_URL}/meetings?${params}`, {
      headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fathom API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const meetings = data.items || [];
    allMeetings.push(...meetings);
    
    cursor = data.cursor;
    if (!cursor || allMeetings.length >= 50) break;
  }
  
  return allMeetings;
}

async function syncMeeting(meeting: any): Promise<{ success: boolean; action: string }> {
  const externalId = generateExternalId(meeting);
  
  const existing = await storage.getInteractionByExternalId(externalId);
  if (existing) {
    return { success: true, action: "skipped" };
  }
  
  const transcript = parseTranscript(meeting.transcript || []);
  const participants = parseParticipants(meeting);
  
  const summaryData = meeting.default_summary;
  const summary = typeof summaryData === "object" 
    ? summaryData?.markdown_formatted || "" 
    : String(summaryData || "");
  
  let duration: number | undefined;
  const startTime = meeting.recording_start_time || meeting.scheduled_start_time;
  const endTime = meeting.recording_end_time || meeting.scheduled_end_time;
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    duration = Math.round((end.getTime() - start.getTime()) / 1000);
  }
  
  let personId: string | undefined;
  for (const participant of participants) {
    if (participant.isHost) continue;
    
    if (participant.email) {
      const person = await storage.getPersonByEmail(participant.email);
      if (person) {
        personId = person.id;
        break;
      }
    }
    
    const peopleByName = await storage.searchPeopleByName(participant.name);
    if (peopleByName.length > 0) {
      personId = peopleByName[0].id;
      break;
    }
  }
  
  const occurredAt = meeting.created_at || meeting.recording_start_time || new Date().toISOString();
  
  await storage.createInteraction({
    externalId,
    personId,
    type: "meeting",
    source: "fathom",
    title: meeting.title || meeting.meeting_title || "Fathom Meeting",
    summary,
    transcript,
    occurredAt: new Date(occurredAt),
    duration,
    participants,
    externalLink: meeting.share_url || meeting.url,
  });
  
  return { success: true, action: "created" };
}

export async function runFathomSync(): Promise<{ synced: number; failed: number; message?: string }> {
  const apiKey = process.env.FATHOM_API_KEY;
  if (!apiKey) {
    return { synced: 0, failed: 0, message: "FATHOM_API_KEY not configured" };
  }
  
  if (syncStatus.isRunning) {
    return { synced: 0, failed: 0, message: "Sync already in progress" };
  }
  
  syncStatus.isRunning = true;
  syncStatus.error = null;
  
  try {
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - 7);
    const createdAfter = lookbackDate.toISOString();
    
    console.log(`[Fathom Sync] Fetching meetings since ${createdAfter}...`);
    const meetings = await fetchMeetings(apiKey, createdAfter);
    console.log(`[Fathom Sync] Found ${meetings.length} meetings`);
    
    let synced = 0;
    let failed = 0;
    
    for (const meeting of meetings) {
      try {
        const result = await syncMeeting(meeting);
        if (result.action === "created") {
          synced++;
          console.log(`[Fathom Sync] Synced: ${meeting.title || "Untitled"}`);
        }
      } catch (error: any) {
        failed++;
        console.error(`[Fathom Sync] Failed to sync meeting:`, error.message);
      }
    }
    
    const result = { synced, failed };
    syncStatus.lastSync = new Date();
    syncStatus.lastResult = result;
    lastSyncTime = new Date();
    
    console.log(`[Fathom Sync] Complete: ${synced} synced, ${failed} failed`);
    return result;
  } catch (error: any) {
    syncStatus.error = error.message;
    console.error(`[Fathom Sync] Error:`, error.message);
    return { synced: 0, failed: 0, message: error.message };
  } finally {
    syncStatus.isRunning = false;
  }
}

export function startFathomSyncScheduler() {
  if (syncInterval) {
    console.log("[Fathom Sync] Scheduler already running");
    return;
  }
  
  if (!process.env.FATHOM_API_KEY) {
    console.log("[Fathom Sync] FATHOM_API_KEY not set, scheduler not started");
    return;
  }
  
  console.log(`[Fathom Sync] Starting scheduler (every ${SYNC_INTERVAL_MS / 1000 / 60} minutes)`);
  
  setTimeout(() => runFathomSync(), 10000);
  
  syncInterval = setInterval(() => {
    runFathomSync();
  }, SYNC_INTERVAL_MS);
}

export function stopFathomSyncScheduler() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log("[Fathom Sync] Scheduler stopped");
  }
}

export function getFathomSyncStatus() {
  return {
    ...syncStatus,
    isConfigured: !!process.env.FATHOM_API_KEY,
    schedulerRunning: !!syncInterval,
  };
}
