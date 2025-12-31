import { storage } from "./storage";
import crypto from "crypto";
import { processInteraction, analyzeConversationForCoaching } from "./conversation-processor";
import { createLogger } from "./logger";

const logger = createLogger('FathomSync');
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

async function syncMeeting(meeting: any): Promise<{ success: boolean; action: string; interactionId?: string }> {
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
  const occurredAt = meeting.created_at || meeting.recording_start_time || new Date().toISOString();
  
  for (const participant of participants) {
    if (participant.isHost) continue;
    
    let person = null;
    
    // Try to find by email first
    if (participant.email) {
      person = await storage.getPersonByEmail(participant.email);
    }
    
    // Try to find by name if no email match
    if (!person) {
      const peopleByName = await storage.searchPeopleByName(participant.name);
      if (peopleByName.length > 0) {
        person = peopleByName[0];
      }
    }
    
    // Auto-create as extended contact if not found and has email
    if (!person && participant.email) {
      try {
        person = await storage.createPerson({
          name: participant.name || participant.email.split('@')[0],
          email: participant.email,
          inSphere: false,
          autoCapturedFrom: 'fathom',
          firstSeenAt: new Date(occurredAt),
        });
        logger.info(`Auto-created extended contact: ${person.name} (${participant.email})`);
      } catch (err) {
        logger.error(`Failed to auto-create contact for ${participant.email}:`, err);
      }
    }
    
    if (person && !personId) {
      personId = person.id;
    }
  }
  
  const newInteraction = await storage.createInteraction({
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
  
  return { success: true, action: "created", interactionId: newInteraction.id };
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
    
    logger.info(`Fetching meetings since ${createdAfter}...`);
    const meetings = await fetchMeetings(apiKey, createdAfter);
    logger.info(`Found ${meetings.length} meetings`);
    
    let synced = 0;
    let failed = 0;
    const newInteractionIds: string[] = [];
    
    for (const meeting of meetings) {
      try {
        const result = await syncMeeting(meeting);
        if (result.action === "created") {
          synced++;
          if (result.interactionId) {
            newInteractionIds.push(result.interactionId);
          }
          logger.info(`Synced: ${meeting.title || "Untitled"}`);
        }
      } catch (error: any) {
        failed++;
        logger.error(`Failed to sync meeting:`, error.message);
      }
    }
    
    // Auto-process all newly synced meetings to generate follow-ups and coaching analysis
    if (newInteractionIds.length > 0) {
      logger.info(`Processing ${newInteractionIds.length} new meetings for follow-ups and coaching...`);
      for (const interactionId of newInteractionIds) {
        try {
          // First process for follow-ups
          const processResult = await processInteraction(interactionId);
          if (processResult.success) {
            logger.info(`Processed interaction, created ${processResult.draftsCreated || 0} drafts`);
          } else {
            logger.info(`Processing skipped: ${processResult.error || "unknown reason"}`);
          }
          
          // Then run coaching analysis if there's a transcript
          const interaction = await storage.getInteraction(interactionId);
          if (interaction?.transcript && interaction.transcript.length >= 100 && !interaction.coachingAnalysis) {
            try {
              const person = interaction.personId 
                ? (await storage.getPerson(interaction.personId)) ?? null 
                : null;
              const coachingAnalysis = await analyzeConversationForCoaching(interaction, person);
              await storage.updateInteraction(interactionId, { coachingAnalysis });
              logger.info(`Coaching analysis complete: score ${coachingAnalysis.overallScore}`);
            } catch (coachingError: any) {
              logger.error(`Coaching analysis failed:`, coachingError.message);
            }
          }
        } catch (error: any) {
          logger.error(`Failed to process interaction:`, error.message);
        }
      }
    }
    
    const result = { synced, failed };
    syncStatus.lastSync = new Date();
    syncStatus.lastResult = result;
    lastSyncTime = new Date();
    
    logger.info(`Complete: ${synced} synced, ${failed} failed`);
    return result;
  } catch (error: any) {
    syncStatus.error = error.message;
    logger.error(`Error:`, error.message);
    return { synced: 0, failed: 0, message: error.message };
  } finally {
    syncStatus.isRunning = false;
  }
}

export function startFathomSyncScheduler() {
  if (syncInterval) {
    logger.info("Scheduler already running");
    return;
  }
  
  if (!process.env.FATHOM_API_KEY) {
    logger.info("FATHOM_API_KEY not set, scheduler not started");
    return;
  }
  
  logger.info(`Starting scheduler (every ${SYNC_INTERVAL_MS / 1000 / 60} minutes)`);
  
  setTimeout(() => runFathomSync(), 10000);
  
  syncInterval = setInterval(() => {
    runFathomSync();
  }, SYNC_INTERVAL_MS);
}

export function stopFathomSyncScheduler() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    logger.info("Scheduler stopped");
  }
}

export function getFathomSyncStatus() {
  return {
    ...syncStatus,
    isConfigured: !!process.env.FATHOM_API_KEY,
    schedulerRunning: !!syncInterval,
  };
}
