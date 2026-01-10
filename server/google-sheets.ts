// Google Sheets Integration - OAuth connected via Replit Connector
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheets not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Check if Google Sheets is connected
export async function isGoogleSheetsConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

// Append a row to a Google Sheet
export async function appendToSheet(spreadsheetId: string, sheetName: string, values: string[][]): Promise<void> {
  const sheets = await getUncachableGoogleSheetClient();
  
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values,
    },
  });
}

// Log an issue to the Flow OS Issues Google Sheet
export async function logIssueToSheet(issue: {
  id: string;
  type: string;
  description: string;
  userEmail?: string;
  route?: string;
  featureMode?: string;
  createdAt: string;
}): Promise<void> {
  const spreadsheetId = process.env.ISSUES_SPREADSHEET_ID;
  
  if (!spreadsheetId) {
    console.log('ISSUES_SPREADSHEET_ID not set - skipping Google Sheets logging');
    return;
  }
  
  try {
    // Sanitize description - replace newlines with spaces to prevent row splitting in Google Sheets
    const sanitizedDescription = issue.description.replace(/[\r\n]+/g, ' ').trim();
    
    await appendToSheet(spreadsheetId, 'Issues', [
      [
        issue.createdAt,
        issue.type,
        sanitizedDescription,
        issue.route || '',
        issue.userEmail || 'Anonymous',
        issue.featureMode || '',
        'New', // Status
        '', // Priority
        '', // Notes
        issue.id,
      ],
    ]);
    console.log(`Issue ${issue.id} logged to Google Sheets`);
  } catch (error) {
    console.error('Failed to log issue to Google Sheets:', error);
  }
}

// Export weekly cost summary to Google Sheets
export async function exportWeeklyCostSummary(summaries: {
  date: string;
  userEmail: string | null;
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  featureBreakdown: Record<string, { requests: number; tokens: number; cost: number }> | null;
}[]): Promise<void> {
  const spreadsheetId = process.env.COST_SPREADSHEET_ID;
  
  if (!spreadsheetId) {
    console.log('COST_SPREADSHEET_ID not set - skipping cost export');
    return;
  }
  
  try {
    const rows = summaries.map(s => [
      s.date,
      s.userEmail || 'Unknown',
      s.totalRequests.toString(),
      s.totalTokens.toString(),
      (s.totalCost / 10000).toFixed(4), // Convert micro-cents to dollars
      s.featureBreakdown ? Object.entries(s.featureBreakdown)
        .map(([k, v]) => `${k}: ${v.requests}`)
        .join(', ') : '',
    ]);
    
    if (rows.length > 0) {
      await appendToSheet(spreadsheetId, 'WeeklyCosts', rows);
      console.log(`Exported ${rows.length} cost summary rows to Google Sheets`);
    }
  } catch (error) {
    console.error('Failed to export cost summary to Google Sheets:', error);
  }
}
