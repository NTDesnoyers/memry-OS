/**
 * Verifier Framework - AI as Proposal Engine, Code as Verifier
 * 
 * Based on Karpathy's insight: Classic software automates what you can SPECIFY;
 * AI automates what you can VERIFY. Every AI action needs a coded success check.
 * 
 * Pattern: AI proposes action → Verifier checks → Pass: Execute | Fail: Human review
 */

import { createLogger } from './logger';

const logger = createLogger('Verifiers');

export interface VerifierResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  score?: number; // 0-100 confidence score
  metadata?: Record<string, unknown>;
}

export interface VerifierContext {
  actionType: string;
  proposedBy: 'ai' | 'user' | 'system';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type Verifier<T> = (input: T, context: VerifierContext) => VerifierResult;

export function createVerifier<T>(
  name: string,
  checks: Array<{ name: string; check: (input: T) => boolean | string }>
): Verifier<T> {
  return (input: T, context: VerifierContext): VerifierResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const { name: checkName, check } of checks) {
      try {
        const result = check(input);
        if (result === false) {
          errors.push(`${checkName}: failed`);
        } else if (typeof result === 'string') {
          errors.push(`${checkName}: ${result}`);
        }
      } catch (err: any) {
        errors.push(`${checkName}: ${err.message}`);
      }
    }
    
    const passed = errors.length === 0;
    const score = passed ? 100 : Math.max(0, 100 - (errors.length * 25));
    
    logger.debug(`Verifier ${name}: ${passed ? 'PASSED' : 'FAILED'}`, {
      actionType: context.actionType,
      errors,
      warnings,
      score
    });
    
    return { passed, errors, warnings, score };
  };
}

export const verifySavedContent = createVerifier<{
  url?: string;
  title?: string;
  content?: string;
  summary?: string;
}>('savedContent', [
  {
    name: 'hasValidUrl',
    check: (input) => {
      if (!input.url) return 'URL is required';
      try {
        new URL(input.url);
        return true;
      } catch {
        return 'Invalid URL format';
      }
    }
  },
  {
    name: 'hasTitle',
    check: (input) => !!input.title && input.title.length > 0 || 'Title is required'
  },
  {
    name: 'hasContent',
    check: (input) => !!input.content && input.content.length > 50 || 'Content must be at least 50 characters'
  }
]);

export const verifySummary = createVerifier<{
  original: string;
  summary: string;
}>('summary', [
  {
    name: 'summaryNotEmpty',
    check: (input) => !!input.summary && input.summary.length > 0 || 'Summary cannot be empty'
  },
  {
    name: 'summaryNotTooLong',
    check: (input) => !input.summary || input.summary.length <= 1000 || 'Summary exceeds 1000 characters'
  },
  {
    name: 'summaryNotTooShort',
    check: (input) => !input.summary || input.summary.length >= 20 || 'Summary is too short (min 20 chars)'
  },
  {
    name: 'summaryDifferentFromOriginal',
    check: (input) => input.summary !== input.original || 'Summary should not be identical to original'
  }
]);

export const verifyTags = createVerifier<{
  tags: string[];
  allowedTags?: string[];
}>('tags', [
  {
    name: 'hasTags',
    check: (input) => input.tags && input.tags.length > 0 || 'At least one tag is required'
  },
  {
    name: 'tagsNotTooMany',
    check: (input) => !input.tags || input.tags.length <= 10 || 'Too many tags (max 10)'
  },
  {
    name: 'tagsValid',
    check: (input) => {
      if (!input.allowedTags || input.allowedTags.length === 0) return true;
      const invalid = input.tags.filter(t => !input.allowedTags!.includes(t));
      if (invalid.length > 0) {
        return `Invalid tags: ${invalid.join(', ')}`;
      }
      return true;
    }
  }
]);

export const verifyShareSuggestion = createVerifier<{
  personId?: string;
  personExists: boolean;
  topicOverlapScore: number;
  thresholdScore: number;
}>('shareSuggestion', [
  {
    name: 'hasPersonId',
    check: (input) => !!input.personId || 'Person ID is required'
  },
  {
    name: 'personExists',
    check: (input) => input.personExists || 'Person does not exist'
  },
  {
    name: 'meetsThreshold',
    check: (input) => input.topicOverlapScore >= input.thresholdScore || 
      `Topic overlap score (${input.topicOverlapScore}) below threshold (${input.thresholdScore})`
  }
]);

export const verifyTask = createVerifier<{
  title?: string;
  personId?: string;
  dueDate?: Date | string | null;
}>('task', [
  {
    name: 'hasTitle',
    check: (input) => !!input.title && input.title.length > 0 || 'Task title is required'
  },
  {
    name: 'titleNotPlaceholder',
    check: (input) => {
      const placeholders = ['TODO', 'TBD', 'placeholder', 'test'];
      const lower = (input.title || '').toLowerCase();
      return !placeholders.some(p => lower === p) || 'Task title appears to be a placeholder';
    }
  }
]);

export const verifyInteraction = createVerifier<{
  personId?: string;
  personExists: boolean;
  type?: string;
  notes?: string;
  date?: Date | string | null;
}>('interaction', [
  {
    name: 'hasPersonId',
    check: (input) => !!input.personId || 'Person ID is required'
  },
  {
    name: 'personExists',
    check: (input) => input.personExists || 'Person does not exist'
  },
  {
    name: 'hasType',
    check: (input) => !!input.type || 'Interaction type is required'
  },
  {
    name: 'hasContent',
    check: (input) => !!input.notes && input.notes.length > 0 || 'Interaction notes are required'
  }
]);

export const verifyDraftEmail = createVerifier<{
  to?: string;
  subject?: string;
  body?: string;
}>('draftEmail', [
  {
    name: 'hasRecipient',
    check: (input) => !!input.to && input.to.length > 0 || 'Recipient is required'
  },
  {
    name: 'hasSubject',
    check: (input) => !!input.subject && input.subject.length > 0 || 'Subject is required'
  },
  {
    name: 'hasBody',
    check: (input) => !!input.body && input.body.length > 0 || 'Email body is required'
  },
  {
    name: 'noPlaceholders',
    check: (input) => {
      const placeholders = ['[NAME]', '[DATE]', '{{', '}}', 'PLACEHOLDER'];
      const content = `${input.subject || ''} ${input.body || ''}`;
      const found = placeholders.filter(p => content.includes(p));
      return found.length === 0 || `Contains placeholders: ${found.join(', ')}`;
    }
  }
]);

export const verifyHouseholdLink = createVerifier<{
  personIds: string[];
  allExist: boolean;
  householdName?: string;
}>('householdLink', [
  {
    name: 'hasPersonIds',
    check: (input) => input.personIds && input.personIds.length >= 2 || 'At least 2 person IDs required'
  },
  {
    name: 'allPeopleExist',
    check: (input) => input.allExist || 'Not all specified people exist'
  }
]);

export const verifyDigestContent = createVerifier<{
  items: Array<{ title: string; summary: string; url: string }>;
  recipientEmail?: string;
}>('digestContent', [
  {
    name: 'hasItems',
    check: (input) => input.items && input.items.length > 0 || 'Digest must have at least one item'
  },
  {
    name: 'itemsHaveTitles',
    check: (input) => {
      const missing = input.items.filter(i => !i.title);
      return missing.length === 0 || `${missing.length} items missing titles`;
    }
  },
  {
    name: 'itemsHaveValidUrls',
    check: (input) => {
      const invalid = input.items.filter(i => {
        try {
          new URL(i.url);
          return false;
        } catch {
          return true;
        }
      });
      return invalid.length === 0 || `${invalid.length} items have invalid URLs`;
    }
  }
]);

export async function runVerifierWithAudit<T>(
  verifier: Verifier<T>,
  input: T,
  context: VerifierContext,
  onPass: () => Promise<unknown>,
  onFail: (result: VerifierResult) => Promise<unknown>
): Promise<{ result: VerifierResult; outcome: unknown }> {
  const result = verifier(input, context);
  
  if (result.passed) {
    const outcome = await onPass();
    return { result, outcome };
  } else {
    const outcome = await onFail(result);
    return { result, outcome };
  }
}
