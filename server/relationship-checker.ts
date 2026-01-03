/**
 * RelationshipChecker - Periodic scanner for relationship events.
 * 
 * Checks for:
 * - Contacts overdue for follow-up based on segment cadence
 * - Approaching birthdays and anniversaries
 * 
 * Emits events to the EventBus for the NurtureAgent to process.
 */

import { eventBus } from "./event-bus";
import { storage } from "./storage";
import { createLogger } from "./logger";
import { differenceInDays, isValid, format } from "date-fns";

const logger = createLogger('RelationshipChecker');
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const ANNIVERSARY_LOOKAHEAD_DAYS = 14;

const emittedToday = new Set<string>();
let lastCheckDate: string | null = null;

function resetIfNewDay(): void {
  const today = new Date().toDateString();
  if (lastCheckDate !== today) {
    emittedToday.clear();
    lastCheckDate = today;
    logger.info('New day detected, reset daily tracking');
  }
}

async function checkOverdueContacts(): Promise<void> {
  try {
    const overdueContacts = await storage.getContactsDueForFollowUp();
    
    for (const contact of overdueContacts) {
      const eventKey = `contact_due:${contact.person.id}:${lastCheckDate}`;
      
      if (emittedToday.has(eventKey)) {
        continue;
      }

      if (contact.daysOverdue >= 7) {
        await eventBus.emitContactDue(
          contact.person.id,
          contact.dueReason,
          contact.daysSinceContact,
          contact.daysOverdue
        );
        
        emittedToday.add(eventKey);
        logger.info(`Emitted contact.due for ${contact.person.name} (${contact.daysOverdue} days overdue)`);
      }
    }
  } catch (error) {
    logger.error('Error checking overdue contacts:', error);
  }
}

async function checkUpcomingAnniversaries(): Promise<void> {
  try {
    // Get all users and check for each one (multi-tenant)
    const users = await storage.getAllUsers();
    const today = new Date();
    
    for (const user of users) {
      const ctx = { userId: user.id };
      await checkAnniversariesForUser(ctx, today);
    }
  } catch (error) {
    logger.error('Error checking anniversaries:', error);
  }
}

async function checkAnniversariesForUser(ctx: { userId: string }, today: Date): Promise<void> {
  try {
    const allPeople = await storage.getAllPeople(ctx);
    const currentYear = today.getFullYear();
    
    for (const person of allPeople) {
      const anniversaryDates: { type: string; date: Date; label: string }[] = [];
      
      // Check dedicated date fields (MM-DD format)
      if (person.birthday) {
        const parsed = parseMmDdDate(person.birthday, currentYear);
        if (parsed) anniversaryDates.push({ type: 'birthday', date: parsed, label: 'Birthday' });
      }
      if (person.anniversary) {
        const parsed = parseMmDdDate(person.anniversary, currentYear);
        if (parsed) anniversaryDates.push({ type: 'wedding_anniversary', date: parsed, label: 'Wedding Anniversary' });
      }
      if (person.spouseBirthday && person.spouseName) {
        const parsed = parseMmDdDate(person.spouseBirthday, currentYear);
        if (parsed) anniversaryDates.push({ type: 'spouse_birthday', date: parsed, label: `${person.spouseName}'s Birthday` });
      }
      if (person.homeAnniversary) {
        const parsed = parseMmDdDate(person.homeAnniversary, currentYear);
        if (parsed) anniversaryDates.push({ type: 'home_anniversary', date: parsed, label: 'Home Purchase Anniversary' });
      }
      
      // Fallback: check FORD notes for birthday patterns
      if (anniversaryDates.length === 0 && person.fordFamily) {
        const birthdayMatch = person.fordFamily.match(/birthday[:\s]+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i);
        if (birthdayMatch) {
          const parsed = parseFlexibleDate(birthdayMatch[1], currentYear);
          if (parsed) {
            anniversaryDates.push({ type: 'birthday', date: parsed, label: 'Birthday' });
          }
        }
      }
      
      for (const anniversary of anniversaryDates) {
        const daysUntil = differenceInDays(anniversary.date, today);
        
        if (daysUntil >= 0 && daysUntil <= ANNIVERSARY_LOOKAHEAD_DAYS) {
          const eventKey = `anniversary:${person.id}:${anniversary.type}:${format(anniversary.date, 'yyyy-MM-dd')}`;
          
          if (emittedToday.has(eventKey)) {
            continue;
          }
          
          // Generate segment-based draft
          await generateAnniversaryDraft(person, anniversary.type, anniversary.label, format(anniversary.date, 'MMMM d'), daysUntil, ctx);
          
          // Also emit event for other listeners
          await eventBus.emitAnniversaryApproaching(
            person.id,
            anniversary.type,
            format(anniversary.date, 'MMMM d'),
            daysUntil
          );
          
          emittedToday.add(eventKey);
          logger.info(`Created draft and emitted anniversary.approaching for ${person.name} (${anniversary.label} in ${daysUntil} days)`);
        }
      }
    }
  } catch (error) {
    logger.error('Error checking anniversaries:', error);
  }
}

function parseMmDdDate(mmdd: string, year: number): Date | null {
  try {
    const parts = mmdd.split('-');
    if (parts.length === 2) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const date = new Date(year, month - 1, day);
      if (isValid(date)) {
        // If date already passed this year, use next year
        if (date < new Date()) {
          date.setFullYear(year + 1);
        }
        return date;
      }
    }
  } catch {}
  return null;
}

async function generateAnniversaryDraft(
  person: any, 
  type: string, 
  label: string, 
  dateStr: string, 
  daysUntil: number,
  ctx: { userId: string }
): Promise<void> {
  const segment = person.segment || 'D';
  const firstName = person.name?.split(' ')[0] || 'Friend';
  
  // Determine gift/touch level based on segment
  let giftNote = '';
  let taskTitle = '';
  
  switch (segment) {
    case 'A':
      giftNote = '\n\nGift idea: Include a $25 gift card to their favorite coffee shop or restaurant.';
      taskTitle = `${label} for ${person.name} - send note + gift card + call`;
      break;
    case 'B':
      giftNote = '\n\nGift idea: Consider a small thoughtful gift or flowers.';
      taskTitle = `${label} for ${person.name} - send note + small gift`;
      break;
    case 'C':
      giftNote = '';
      taskTitle = `${label} for ${person.name} - send note + call`;
      break;
    default:
      giftNote = '';
      taskTitle = `${label} for ${person.name} - send handwritten note`;
  }
  
  // Generate handwritten note content (everyone gets a note)
  let noteContent = '';
  if (type === 'birthday') {
    noteContent = `Dear ${firstName},\n\nWishing you the happiest of birthdays! I hope your special day is filled with joy, laughter, and all the things that make you smile.\n\nThinking of you today and always.${giftNote}\n\nWarm regards`;
  } else if (type === 'wedding_anniversary') {
    noteContent = `Dear ${firstName},\n\nHappy Anniversary! Wishing you and your spouse another wonderful year of love and happiness together.\n\nCelebrating with you from afar!${giftNote}\n\nWarm regards`;
  } else if (type === 'spouse_birthday') {
    noteContent = `Dear ${firstName},\n\nPlease pass along my warmest birthday wishes to ${person.spouseName}! I hope they have a wonderful celebration.${giftNote}\n\nBest wishes`;
  } else if (type === 'home_anniversary') {
    noteContent = `Dear ${firstName},\n\nHappy Home Anniversary! Can you believe it's been another year since you moved in? I hope your home continues to bring you joy and wonderful memories.${giftNote}\n\nWarm regards`;
  }
  
  try {
    // Create handwritten note draft
    await storage.createGeneratedDraft({
      personId: person.id,
      type: 'handwritten_note',
      title: `${label} Note for ${person.name}`,
      content: noteContent,
      status: 'pending',
      metadata: { 
        triggerType: type, 
        daysUntil, 
        segment,
        dateStr,
        giftRecommendation: segment === 'A' ? 'gift_card' : segment === 'B' ? 'small_gift' : 'note_only'
      }
    }, ctx);
    
    // Create task reminder - clamp to at least today (avoid past-due tasks)
    const daysOffset = Math.max(0, daysUntil - 7);
    await storage.createTask({
      title: taskTitle,
      personId: person.id,
      dueDate: new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000),
      priority: segment === 'A' ? 'high' : 'medium',
      status: 'pending'
    }, ctx);
    
    logger.info(`Created ${type} draft for ${person.name} (${segment} segment)`);
  } catch (error) {
    logger.error(`Failed to create draft for ${person.name}:`, error);
  }
}

function parseFlexibleDate(dateStr: string, defaultYear: number): Date | null {
  try {
    const cleaned = dateStr.replace(/\//g, '-');
    const parts = cleaned.split('-');
    
    if (parts.length >= 2) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parts.length === 3 ? parseInt(parts[2], 10) : defaultYear;
      
      const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;
      
      const date = new Date(defaultYear, month - 1, day);
      if (isValid(date)) {
        if (date < new Date()) {
          date.setFullYear(defaultYear + 1);
        }
        return date;
      }
    }
  } catch {
  }
  return null;
}

export async function runRelationshipCheck(): Promise<{ overdueChecked: boolean; anniversariesChecked: boolean }> {
  logger.info('Running relationship check...');
  
  resetIfNewDay();
  
  await checkOverdueContacts();
  await checkUpcomingAnniversaries();
  
  logger.info('Relationship check complete');
  return { overdueChecked: true, anniversariesChecked: true };
}

let checkInterval: NodeJS.Timeout | null = null;

export function startRelationshipChecker(): void {
  if (checkInterval) {
    logger.info('Already running');
    return;
  }
  
  logger.info('Starting scheduler (hourly checks)');
  
  runRelationshipCheck();
  
  checkInterval = setInterval(runRelationshipCheck, CHECK_INTERVAL_MS);
}

export function stopRelationshipChecker(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    logger.info('Stopped');
  }
}
