/**
 * Feature Mode Configuration
 * 
 * Single source of truth for Founder Mode vs Beta User Mode.
 * Controls which routes, navigation items, and features are accessible.
 */

export type FeatureMode = 'founder' | 'beta';

// Environment-based mode detection
// Founder mode is enabled via localStorage flag or environment variable
export function getCurrentMode(): FeatureMode {
  // Check localStorage for founder mode flag (set via console for founder)
  if (typeof window !== 'undefined') {
    const founderFlag = localStorage.getItem('flow_founder_mode');
    if (founderFlag === 'true') {
      return 'founder';
    }
  }
  
  // Default to beta mode for all users
  return 'beta';
}

export function isFounderMode(): boolean {
  return getCurrentMode() === 'founder';
}

export function isBetaMode(): boolean {
  return getCurrentMode() === 'beta';
}

export function toggleMode(): FeatureMode {
  const newMode = isFounderMode() ? 'beta' : 'founder';
  if (newMode === 'founder') {
    localStorage.setItem('flow_founder_mode', 'true');
  } else {
    localStorage.removeItem('flow_founder_mode');
  }
  return newMode;
}

export function setMode(mode: FeatureMode): void {
  if (mode === 'founder') {
    localStorage.setItem('flow_founder_mode', 'true');
  } else {
    localStorage.removeItem('flow_founder_mode');
  }
}

// Routes allowed in beta mode
// These are the ONLY routes accessible to beta users
export const BETA_ALLOWED_ROUTES: string[] = [
  '/',                    // Home/Today view with overdue contacts
  '/people',              // Contacts list
  '/people/new',          // Add new contact
  '/people/:id',          // Person profile (read interaction history, FORD notes)
  '/drafts',              // Generated follow-ups and revival drafts
  '/revival',             // Dormant contacts + approve draft
  '/conversations',       // Add Memory - conversation/interaction log
  '/welcome',             // Beta welcome page
];

// Helper to check if a route is allowed in beta mode
// Handles dynamic routes like /people/:id
export function isRouteAllowedInBetaMode(pathname: string): boolean {
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
  { name: "Today", href: "/", icon: "LayoutDashboard" },
  { name: "Contacts", href: "/people", icon: "Users" },
  { name: "Drafts", href: "/drafts", icon: "FileEdit" },
  { name: "Revival", href: "/revival", icon: "Sparkles" },
  { name: "Add Memory", href: "/conversations", icon: "MessageSquare" },
];

// Navigation items allowed in beta mode (by href)
export const BETA_NAV_HREFS = new Set([
  '/',
  '/people',
  '/drafts',
  '/revival',
  '/conversations',
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
