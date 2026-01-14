import { createHash } from 'crypto';

export function normalizeTranscript(transcript: string): string {
  if (!transcript) return '';
  
  return transcript
    .replace(/\[\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?\]/gi, '')
    .replace(/\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?/gi, '')
    .replace(/^(Speaker\s*\d+|Person\s*\d+|[\w\s]+):\s*/gim, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

export function hashTranscript(transcript: string | null | undefined): string | null {
  if (!transcript) return null;
  
  const normalized = normalizeTranscript(transcript);
  if (!normalized) return null;
  
  return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}
