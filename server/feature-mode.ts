/**
 * Server-side Feature Mode Configuration
 * 
 * Mirrors client/src/lib/feature-mode.ts logic on the server.
 * Determines founder vs beta mode based on:
 * 1. User email (only founder can access founder mode)
 * 2. Session preference (founder can toggle to beta for testing)
 */

import type { Request } from "express";

export type FeatureMode = 'founder' | 'beta';

const FOUNDER_EMAIL = 'nathan@desnoyersproperties.com';

export function isFounderEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
}

/**
 * Get the current feature mode for a request.
 * Checks both user email and session preference.
 */
export function getFeatureMode(req: Request): FeatureMode {
  const userEmail = (req.user as any)?.claims?.email;
  
  // Non-founder users are always in beta mode
  if (!isFounderEmail(userEmail)) {
    return 'beta';
  }
  
  // Founder can toggle - check session preference
  const sessionMode = (req.session as any)?.featureMode;
  if (sessionMode === 'beta') {
    return 'beta';
  }
  
  // Default to founder mode for the founder
  return 'founder';
}

/**
 * Set the feature mode preference in the session.
 * Only affects the founder - other users are always beta.
 */
export function setFeatureMode(req: Request, mode: FeatureMode): void {
  const userEmail = (req.user as any)?.claims?.email;
  
  // Only founder can toggle
  if (!isFounderEmail(userEmail)) {
    return;
  }
  
  if (req.session) {
    (req.session as any).featureMode = mode;
  }
}

/**
 * Check if the request is in founder mode.
 */
export function isFounderMode(req: Request): boolean {
  return getFeatureMode(req) === 'founder';
}

/**
 * Check if the request is in beta mode.
 */
export function isBetaMode(req: Request): boolean {
  return getFeatureMode(req) === 'beta';
}
