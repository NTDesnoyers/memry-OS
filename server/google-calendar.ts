// Google Calendar Integration via Replit Connector
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function isCalendarConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export async function listCalendars() {
  const calendar = await getUncachableGoogleCalendarClient();
  const response = await calendar.calendarList.list();
  return response.data.items || [];
}

export async function listEvents(options: {
  calendarId?: string;
  timeMin?: Date;
  timeMax?: Date;
  maxResults?: number;
} = {}) {
  const calendar = await getUncachableGoogleCalendarClient();
  
  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const response = await calendar.events.list({
    calendarId: options.calendarId || 'primary',
    timeMin: (options.timeMin || now).toISOString(),
    timeMax: (options.timeMax || oneWeekLater).toISOString(),
    maxResults: options.maxResults || 50,
    singleEvents: true,
    orderBy: 'startTime',
  });
  
  return response.data.items || [];
}

export async function getEvent(calendarId: string, eventId: string) {
  const calendar = await getUncachableGoogleCalendarClient();
  const response = await calendar.events.get({
    calendarId,
    eventId,
  });
  return response.data;
}

export async function createEvent(options: {
  calendarId?: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: string[];
  location?: string;
}) {
  const calendar = await getUncachableGoogleCalendarClient();
  
  const event: any = {
    summary: options.summary,
    description: options.description,
    location: options.location,
    start: {
      dateTime: options.start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: options.end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };
  
  if (options.attendees && options.attendees.length > 0) {
    event.attendees = options.attendees.map(email => ({ email }));
  }
  
  const response = await calendar.events.insert({
    calendarId: options.calendarId || 'primary',
    requestBody: event,
  });
  
  return response.data;
}

export async function updateEvent(options: {
  calendarId?: string;
  eventId: string;
  summary?: string;
  description?: string;
  start?: Date;
  end?: Date;
  location?: string;
}) {
  const calendar = await getUncachableGoogleCalendarClient();
  
  const event: any = {};
  
  if (options.summary) event.summary = options.summary;
  if (options.description) event.description = options.description;
  if (options.location) event.location = options.location;
  if (options.start) {
    event.start = {
      dateTime: options.start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
  if (options.end) {
    event.end = {
      dateTime: options.end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
  
  const response = await calendar.events.patch({
    calendarId: options.calendarId || 'primary',
    eventId: options.eventId,
    requestBody: event,
  });
  
  return response.data;
}

export async function deleteEvent(calendarId: string, eventId: string) {
  const calendar = await getUncachableGoogleCalendarClient();
  await calendar.events.delete({
    calendarId,
    eventId,
  });
}

export async function getTodaysEvents() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  return listEvents({
    timeMin: startOfDay,
    timeMax: endOfDay,
  });
}

export async function getUpcomingEvents(days: number = 7) {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  return listEvents({
    timeMin: now,
    timeMax: future,
  });
}
