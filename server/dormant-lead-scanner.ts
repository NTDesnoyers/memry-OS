import { getUncachableGmailClient, isGmailConnected } from './gmail-client';
import { storage } from './storage';
import { createLogger } from './logger';
import type { Person, InsertDormantOpportunity } from '@shared/schema';

const logger = createLogger('DormantLeadScanner');

interface EmailThread {
  personId: string;
  email: string;
  threadCount: number;
  lastEmailDate: Date;
  lastSubject: string;
  firstEmailDate: Date;
}

interface ScoringFactors {
  daysSinceContact: number;
  threadCount: number;
  leadSource: string | null;
  segment: string | null;
  hasPhone: boolean;
}

export function calculateDormancyScore(factors: ScoringFactors): number {
  let score = 0;
  
  if (factors.daysSinceContact >= 1095) {
    score += 50;
  } else if (factors.daysSinceContact >= 730) {
    score += 40;
  } else if (factors.daysSinceContact >= 365) {
    score += 30;
  } else if (factors.daysSinceContact >= 180) {
    score += 20;
  }
  
  if (factors.threadCount >= 5) {
    score += 25;
  } else if (factors.threadCount >= 3) {
    score += 15;
  } else if (factors.threadCount >= 1) {
    score += 5;
  }
  
  const highValueSources = ['open_house', 'referral', 'sphere', 'sign_call'];
  if (factors.leadSource && highValueSources.includes(factors.leadSource)) {
    score += 20;
  }
  
  if (factors.segment === 'A' || factors.segment === 'B') {
    score += 15;
  } else if (factors.segment === 'C') {
    score += 10;
  }
  
  if (factors.hasPhone) {
    score += 10;
  }
  
  return Math.min(score, 100);
}

function generateRevivalReason(person: Person, thread: EmailThread, daysSinceContact: number): string {
  const parts: string[] = [];
  
  if (daysSinceContact > 365) {
    const years = Math.floor(daysSinceContact / 365);
    parts.push(`Haven't connected in ${years} year${years > 1 ? 's' : ''}`);
  } else {
    parts.push(`Last contact ${daysSinceContact} days ago`);
  }
  
  if (thread.threadCount >= 3) {
    parts.push(`${thread.threadCount} previous email exchanges show engagement`);
  }
  
  return parts.join('. ') + '.';
}

function generateSuggestedApproach(person: Person, daysSinceContact: number): string {
  if (daysSinceContact > 730) {
    return 'Warm re-introduction: "Hi [name], I was thinking about you and wanted to reconnect. A lot has changed in the market since we last spoke..."';
  } else if (daysSinceContact > 365) {
    return 'Check-in message: "Hi [name], hope you\'re doing well! I wanted to reach out and see how things are going with your real estate plans..."';
  } else {
    return 'Quick follow-up: "Hi [name], wanted to touch base and see if there\'s anything I can help you with..."';
  }
}

export async function scanGmailForDormantLeads(options: {
  minDaysSinceContact?: number;
  maxResults?: number;
  scanDays?: number;
} = {}): Promise<{ found: number; created: number; skipped: number }> {
  const {
    minDaysSinceContact = 180,
    maxResults = 50,
    scanDays = 1095
  } = options;
  
  logger.info('Starting Gmail dormant lead scan', { minDaysSinceContact, maxResults, scanDays });
  
  const connected = await isGmailConnected();
  if (!connected) {
    logger.warn('Gmail not connected, skipping scan');
    return { found: 0, created: 0, skipped: 0 };
  }
  
  const gmail = await getUncachableGmailClient();
  const allPeople = await storage.getAllPeople();
  
  const peopleByEmail = new Map<string, Person>();
  for (const person of allPeople) {
    if (person.email) {
      peopleByEmail.set(person.email.toLowerCase(), person);
    }
  }
  
  if (peopleByEmail.size === 0) {
    logger.info('No contacts with emails found');
    return { found: 0, created: 0, skipped: 0 };
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - scanDays);
  const afterDate = cutoffDate.toISOString().split('T')[0].replace(/-/g, '/');
  
  const emailThreads = new Map<string, EmailThread>();
  let found = 0;
  let created = 0;
  let skipped = 0;
  
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${afterDate}`,
      maxResults: 500,
    });
    
    const messages = response.data.messages || [];
    logger.info(`Found ${messages.length} messages to scan`);
    
    for (const msg of messages.slice(0, 200)) {
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });
        
        const headers = detail.data.payload?.headers || [];
        const fromHeader = headers.find(h => h.name === 'From')?.value || '';
        const toHeader = headers.find(h => h.name === 'To')?.value || '';
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const dateHeader = headers.find(h => h.name === 'Date')?.value || '';
        
        const emailMatch = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s<]+@[^\s>]+)/);
        const fromEmail = emailMatch ? emailMatch[1].toLowerCase() : '';
        
        const toEmails: string[] = [];
        const toMatches = Array.from(toHeader.matchAll(/([^\s<,]+@[^\s>,]+)/g));
        for (const match of toMatches) {
          toEmails.push(match[1].toLowerCase());
        }
        
        const allEmails = [fromEmail, ...toEmails].filter(e => e);
        
        for (const email of allEmails) {
          const person = peopleByEmail.get(email);
          if (person) {
            const emailDate = new Date(dateHeader);
            
            if (!emailThreads.has(person.id)) {
              emailThreads.set(person.id, {
                personId: person.id,
                email: email,
                threadCount: 1,
                lastEmailDate: emailDate,
                lastSubject: subject,
                firstEmailDate: emailDate,
              });
            } else {
              const existing = emailThreads.get(person.id)!;
              existing.threadCount++;
              if (emailDate > existing.lastEmailDate) {
                existing.lastEmailDate = emailDate;
                existing.lastSubject = subject;
              }
              if (emailDate < existing.firstEmailDate) {
                existing.firstEmailDate = emailDate;
              }
            }
          }
        }
      } catch (msgError) {
        logger.debug('Error processing message', { msgId: msg.id, error: msgError });
      }
    }
    
    logger.info(`Found email threads for ${emailThreads.size} contacts`);
    
    const now = new Date();
    const opportunities: Array<{
      person: Person;
      thread: EmailThread;
      daysSinceContact: number;
      score: number;
    }> = [];
    
    for (const [personId, thread] of Array.from(emailThreads.entries())) {
      const person = allPeople.find(p => p.id === personId);
      if (!person) continue;
      
      const lastContact = person.lastContact || thread.lastEmailDate;
      const daysSinceContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceContact >= minDaysSinceContact) {
        const score = calculateDormancyScore({
          daysSinceContact,
          threadCount: thread.threadCount,
          leadSource: null,
          segment: person.segment,
          hasPhone: !!person.phone,
        });
        
        opportunities.push({ person, thread, daysSinceContact, score });
        found++;
      }
    }
    
    opportunities.sort((a, b) => b.score - a.score);
    
    for (const opp of opportunities.slice(0, maxResults)) {
      try {
        const existing = await storage.getDormantOpportunityByPersonId(opp.person.id);
        if (existing) {
          logger.debug('Opportunity already exists for person', { personId: opp.person.id });
          skipped++;
          continue;
        }
        
        const opportunityData: InsertDormantOpportunity = {
          personId: opp.person.id,
          status: 'pending',
          dormancyScore: opp.score,
          daysSinceContact: opp.daysSinceContact,
          leadSource: null,
          lastEmailDate: opp.thread.lastEmailDate,
          lastEmailSubject: opp.thread.lastSubject,
          emailThreadCount: opp.thread.threadCount,
          discoveredVia: 'gmail_scan',
          revivalReason: generateRevivalReason(opp.person, opp.thread, opp.daysSinceContact),
          suggestedApproach: generateSuggestedApproach(opp.person, opp.daysSinceContact),
        };
        
        await storage.createDormantOpportunity(opportunityData);
        created++;
        
        logger.info('Created dormant opportunity', {
          personId: opp.person.id,
          name: opp.person.name,
          score: opp.score,
          daysSince: opp.daysSinceContact,
        });
      } catch (createError) {
        logger.error('Failed to create opportunity', { personId: opp.person.id, error: createError });
      }
    }
    
  } catch (error) {
    logger.error('Gmail scan failed', { error });
    throw error;
  }
  
  logger.info('Gmail scan complete', { found, created, skipped });
  return { found, created, skipped };
}

export async function scanContactsForDormantLeads(options: {
  minDaysSinceContact?: number;
  maxResults?: number;
} = {}): Promise<{ found: number; created: number; skipped: number }> {
  const { minDaysSinceContact = 180, maxResults = 50 } = options;
  
  logger.info('Starting contact-based dormant lead scan', { minDaysSinceContact, maxResults });
  
  const allPeople = await storage.getAllPeople();
  const now = new Date();
  
  let found = 0;
  let created = 0;
  let skipped = 0;
  
  const candidates: Array<{
    person: Person;
    daysSinceContact: number;
    score: number;
  }> = [];
  
  for (const person of allPeople) {
    if (!person.lastContact) continue;
    
    const daysSinceContact = Math.floor((now.getTime() - person.lastContact.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceContact >= minDaysSinceContact) {
      const score = calculateDormancyScore({
        daysSinceContact,
        threadCount: 0,
        leadSource: null,
        segment: person.segment,
        hasPhone: !!person.phone,
      });
      
      candidates.push({ person, daysSinceContact, score });
      found++;
    }
  }
  
  candidates.sort((a, b) => b.score - a.score);
  
  for (const candidate of candidates.slice(0, maxResults)) {
    try {
      const existing = await storage.getDormantOpportunityByPersonId(candidate.person.id);
      if (existing) {
        skipped++;
        continue;
      }
      
      const years = Math.floor(candidate.daysSinceContact / 365);
      const revivalReason = years >= 1
        ? `No contact in ${years} year${years > 1 ? 's' : ''}. May be worth reconnecting.`
        : `${candidate.daysSinceContact} days since last contact. Time for a check-in.`;
      
      const opportunityData: InsertDormantOpportunity = {
        personId: candidate.person.id,
        status: 'pending',
        dormancyScore: candidate.score,
        daysSinceContact: candidate.daysSinceContact,
        discoveredVia: 'contact_analysis',
        revivalReason,
        suggestedApproach: generateSuggestedApproach(candidate.person, candidate.daysSinceContact),
      };
      
      await storage.createDormantOpportunity(opportunityData);
      created++;
    } catch (error) {
      logger.error('Failed to create opportunity from contact', { personId: candidate.person.id, error });
    }
  }
  
  logger.info('Contact scan complete', { found, created, skipped });
  return { found, created, skipped };
}

export async function generateRevivalCampaign(opportunityId: string): Promise<{
  success: boolean;
  draftId?: string;
  emailSubject?: string;
  emailBody?: string;
  error?: string;
}> {
  logger.info('Generating revival campaign', { opportunityId });
  
  try {
    const opportunity = await storage.getDormantOpportunity(opportunityId);
    if (!opportunity) {
      return { success: false, error: 'Opportunity not found' };
    }
    
    if (opportunity.status !== 'approved') {
      return { success: false, error: 'Opportunity must be approved first' };
    }
    
    const person = opportunity.personId ? await storage.getPerson(opportunity.personId) : null;
    if (!person) {
      return { success: false, error: 'Person not found' };
    }
    
    const years = Math.floor((opportunity.daysSinceContact || 0) / 365);
    const months = Math.floor(((opportunity.daysSinceContact || 0) % 365) / 30);
    
    const timeAgoText = years >= 1 
      ? `${years} year${years > 1 ? 's' : ''}` 
      : `${months} month${months > 1 ? 's' : ''}`;
    
    const emailSubject = `Thinking of you - Quick check-in`;
    
    const firstName = person.name?.split(' ')[0] || 'there';
    
    const emailBody = `Hi ${firstName},

It's been a while since we last connected - about ${timeAgoText} if I'm counting right! I was just going through my contacts and your name came up.

I hope you're doing well and that life has been treating you kindly. A lot has happened in the real estate market since we last spoke, and I wanted to reach out to see how things are going on your end.

Are you still in the same place, or have your housing needs changed? Either way, I'd love to catch up if you have a few minutes.

No pressure at all - just wanted to say hello and let you know I'm here if you ever need anything real estate related or just want to chat.

Looking forward to hearing from you!

Best regards`;

    const draft = await storage.createGeneratedDraft({
      personId: person.id,
      type: 'email',
      title: emailSubject,
      content: emailBody,
      metadata: { source: 'dormant_revival', subject: emailSubject },
      status: 'pending',
    });
    
    await storage.updateDormantOpportunity(opportunityId, {
      status: 'campaign_sent',
    });
    
    logger.info('Revival campaign generated', { opportunityId, draftId: draft.id });
    
    return {
      success: true,
      draftId: draft.id,
      emailSubject,
      emailBody,
    };
  } catch (error: any) {
    logger.error('Failed to generate revival campaign', { opportunityId, error: error.message });
    return { success: false, error: error.message };
  }
}
