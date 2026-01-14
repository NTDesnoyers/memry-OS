/**
 * Feature Mode Configuration
 * 
 * Single source of truth for Founder Mode vs Beta User Mode.
 * Controls which routes, navigation items, and features are accessible.
 */

export type FeatureMode = 'founder' | 'beta';

// Founder email - only this user can access founder mode
const FOUNDER_EMAIL = 'nathan@desnoyersproperties.com';

// Check if the current user is the founder based on their email
export function isFounderEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
}

// Check if founder mode toggle is enabled
// Only the founder (nathan@desnoyersproperties.com) can see the toggle
export function isFounderToggleEnabled(userEmail?: string | null): boolean {
  // If no email provided, check env variable as fallback (for development)
  if (!userEmail) {
    const envValue = import.meta.env.VITE_ENABLE_FOUNDER_TOGGLE;
    return envValue !== 'false';
  }
  // Only founder can see the toggle
  return isFounderEmail(userEmail);
}

// Environment-based mode detection
// Founder mode is enabled via localStorage flag, but only for authorized users
export function getCurrentMode(userEmail?: string | null): FeatureMode {
  // If user is not the founder, always return beta mode
  if (userEmail && !isFounderEmail(userEmail)) {
    return 'beta';
  }
  
  // Check localStorage for founder mode flag (only works for founder)
  if (typeof window !== 'undefined') {
    const founderFlag = localStorage.getItem('flow_founder_mode');
    if (founderFlag === 'true') {
      return 'founder';
    }
  }
  
  // Default to beta mode for all users
  return 'beta';
}

export function isFounderMode(userEmail?: string | null): boolean {
  return getCurrentMode(userEmail) === 'founder';
}

export function isBetaMode(userEmail?: string | null): boolean {
  return getCurrentMode(userEmail) === 'beta';
}

export async function toggleMode(): Promise<FeatureMode> {
  const newMode = isFounderMode() ? 'beta' : 'founder';
  
  // Update localStorage for immediate UI response
  if (newMode === 'founder') {
    localStorage.setItem('flow_founder_mode', 'true');
  } else {
    localStorage.removeItem('flow_founder_mode');
  }
  
  // Sync with server so backend knows the mode
  try {
    await fetch('/api/feature-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode }),
      credentials: 'include'
    });
  } catch (error) {
    console.warn('Failed to sync feature mode with server:', error);
  }
  
  return newMode;
}

export async function setMode(mode: FeatureMode): Promise<void> {
  if (mode === 'founder') {
    localStorage.setItem('flow_founder_mode', 'true');
  } else {
    localStorage.removeItem('flow_founder_mode');
  }
  
  // Sync with server
  try {
    await fetch('/api/feature-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
      credentials: 'include'
    });
  } catch (error) {
    console.warn('Failed to sync feature mode with server:', error);
  }
}

// Sync mode from server on app load (for founder to restore their preference)
export async function syncModeFromServer(): Promise<FeatureMode | null> {
  try {
    const response = await fetch('/api/feature-mode', {
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json();
      // Update localStorage to match server
      if (data.mode === 'founder') {
        localStorage.setItem('flow_founder_mode', 'true');
      } else {
        localStorage.removeItem('flow_founder_mode');
      }
      return data.mode;
    }
  } catch (error) {
    console.warn('Failed to fetch feature mode from server:', error);
  }
  return null;
}

// Routes allowed in beta mode
// These are the ONLY routes accessible to beta users
export const BETA_ALLOWED_ROUTES: string[] = [
  '/',                    // Flow - conversation capture (home)
  '/weekly-review',       // Weekly Review (FORD digest + people grid)
  '/people',              // Contacts list
  '/people/new',          // Add new contact
  '/people/:id',          // Person profile (read interaction history, FORD notes)
  '/signals',             // Follow-Up Signals - decision checkpoints
  '/drafts',              // Generated follow-ups and revival drafts
  '/welcome',             // Beta welcome page
];

// Helper to check if a route is allowed in beta mode
// Handles dynamic routes like /people/:id
export function isRouteAllowedInBetaMode(pathname: string, userEmail?: string | null): boolean {
  // Founder can access all routes including admin routes
  if (isFounderEmail(userEmail)) {
    return true;
  }
  
  // Check exact matches first
  if (BETA_ALLOWED_ROUTES.includes(pathname)) {
    return true;
  }
  
  // Check dynamic route patterns
  // /people/:id pattern (but not /people/new which is checked above)
  if (/^\/people\/[^/]+$/.test(pathname)) {
    return true;
  }
  
  return false;
}

// Navigation items for beta mode
export const BETA_NAV_ITEMS = [
  { name: "Flow", href: "/", icon: "Repeat" },
  { name: "Weekly Review", href: "/weekly-review", icon: "FileText" },
  { name: "Contacts", href: "/people", icon: "Users" },
  { name: "Signals", href: "/signals", icon: "Zap" },
  { name: "Actions", href: "/drafts", icon: "FileEdit" },
];

// Navigation items allowed in beta mode (by href)
export const BETA_NAV_HREFS = new Set([
  '/',
  '/weekly-review',
  '/people',
  '/signals',
  '/drafts',
]);

// Profile menu items allowed in beta mode
export const BETA_PROFILE_MENU_HREFS = new Set<string>([
  // None for beta - hide all settings/configuration
]);

// Quick action IDs allowed in beta mode
export const BETA_QUICK_ACTION_IDS = new Set([
  'add_contact',   // Add new contact (routes to /people/new if allowed, else show toast)
]);

// Skills allowed in beta mode
export const BETA_SKILL_IDS = new Set([
  'draft_revival',   // Draft Revival Email - goes to /revival
]);

// Features to hide in beta mode
export const FOUNDER_ONLY_FEATURES = {
  aiAssistant: true,
  voiceConversation: true,
  weeklyReport: true,
  businessTracker: true,
  coaching: true,
  leadInbox: true,
  lifeEvents: true,
  eventLog: true,
  reviews: true,
  visualPricing: true,
  havesWants: true,
  brandCenter: true,
  referrals: true,
  calendar: true,
  automation: true,
  integrations: true,
  settings: true,
  voiceProfile: true,
  content: true,
  insightInbox: true,
  intake: true,
  flow: true,
  dashboardWidgets: true,
  commandPaletteAdvanced: true,
};

// Check if a specific feature is allowed in current mode
export function isFeatureAllowed(featureKey: keyof typeof FOUNDER_ONLY_FEATURES): boolean {
  if (isFounderMode()) {
    return true;
  }
  // In beta mode, founder-only features are not allowed
  return !FOUNDER_ONLY_FEATURES[featureKey];
}
