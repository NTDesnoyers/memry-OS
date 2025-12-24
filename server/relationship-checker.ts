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
    const allPeople = await storage.getAllPeople();
    const today = new Date();
    const currentYear = today.getFullYear();
    
    for (const person of allPeople) {
      const anniversaryDates: { type: string; date: Date }[] = [];
      
      if (person.fordFamily) {
        const birthdayMatch = person.fordFamily.match(/birthday[:\s]+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i);
        if (birthdayMatch) {
          const parsed = parseFlexibleDate(birthdayMatch[1], currentYear);
          if (parsed) {
            anniversaryDates.push({ type: 'birthday', date: parsed });
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
          
          await eventBus.emitAnniversaryApproaching(
            person.id,
            anniversary.type,
            format(anniversary.date, 'MMMM d'),
            daysUntil
          );
          
          emittedToday.add(eventKey);
          logger.info(`Emitted anniversary.approaching for ${person.name} (${anniversary.type} in ${daysUntil} days)`);
        }
      }
    }
  } catch (error) {
    logger.error('Error checking anniversaries:', error);
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
