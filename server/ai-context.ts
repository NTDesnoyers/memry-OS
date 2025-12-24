import { storage } from "./storage";
import { createLogger } from "./logger";

const logger = createLogger("AIContext");

export type UserProfileContext = {
  hasProfile: boolean;
  mtp: string | null;
  missionStatement: string | null;
  coreValues: string[];
  philosophy: string | null;
  decisionFramework: string | null;
  yearsExperience: number | null;
  teamStructure: string | null;
  annualGoalTransactions: number | null;
  annualGoalGci: number | null;
  specializations: string[];
  focusAreas: string[];
  familySummary: string | null;
  hobbies: string[];
  communityInvolvement: string | null;
};

export type AIContextPayload = {
  profile: UserProfileContext;
  promptSnippet: string;
};

export async function getUserProfileContext(): Promise<UserProfileContext> {
  try {
    const { userCoreProfile } = await import("@shared/schema");
    const { db } = await import("./db");
    
    const [profile] = await db.select().from(userCoreProfile).limit(1);
    
    if (!profile) {
      return {
        hasProfile: false,
        mtp: null,
        missionStatement: null,
        coreValues: [],
        philosophy: null,
        decisionFramework: null,
        yearsExperience: null,
        teamStructure: null,
        annualGoalTransactions: null,
        annualGoalGci: null,
        specializations: [],
        focusAreas: [],
        familySummary: null,
        hobbies: [],
        communityInvolvement: null,
      };
    }
    
    return {
      hasProfile: true,
      mtp: profile.mtp,
      missionStatement: profile.missionStatement,
      coreValues: profile.coreValues || [],
      philosophy: profile.philosophy,
      decisionFramework: profile.decisionFramework,
      yearsExperience: profile.yearsExperience,
      teamStructure: profile.teamStructure,
      annualGoalTransactions: profile.annualGoalTransactions,
      annualGoalGci: profile.annualGoalGci,
      specializations: profile.specializations || [],
      focusAreas: profile.focusAreas || [],
      familySummary: profile.familySummary,
      hobbies: profile.hobbies || [],
      communityInvolvement: profile.communityInvolvement,
    };
  } catch (error) {
    logger.error("Failed to get user profile context", { error });
    return {
      hasProfile: false,
      mtp: null,
      missionStatement: null,
      coreValues: [],
      philosophy: null,
      decisionFramework: null,
      yearsExperience: null,
      teamStructure: null,
      annualGoalTransactions: null,
      annualGoalGci: null,
      specializations: [],
      focusAreas: [],
      familySummary: null,
      hobbies: [],
      communityInvolvement: null,
    };
  }
}

export function buildProfilePromptSnippet(profile: UserProfileContext): string {
  if (!profile.hasProfile) {
    return "";
  }
  
  const parts: string[] = [];
  
  if (profile.mtp) {
    parts.push(`## User's Master Transformative Purpose (MTP)
${profile.mtp}`);
  }
  
  if (profile.missionStatement) {
    parts.push(`## Mission Statement
${profile.missionStatement}`);
  }
  
  if (profile.coreValues.length > 0) {
    parts.push(`## Core Values
${profile.coreValues.map(v => `- ${v}`).join("\n")}`);
  }
  
  if (profile.philosophy) {
    parts.push(`## Business Philosophy
${profile.philosophy}`);
  }
  
  if (profile.decisionFramework) {
    parts.push(`## Decision Framework
${profile.decisionFramework}`);
  }
  
  const professionalDetails: string[] = [];
  if (profile.yearsExperience) {
    professionalDetails.push(`${profile.yearsExperience} years in real estate`);
  }
  if (profile.teamStructure) {
    const teamLabels: Record<string, string> = {
      solo: "Solo Agent",
      team_lead: "Team Leader",
      team_member: "Team Member",
      partnership: "Partnership",
      brokerage_owner: "Brokerage Owner",
    };
    professionalDetails.push(teamLabels[profile.teamStructure] || profile.teamStructure);
  }
  if (profile.annualGoalTransactions) {
    professionalDetails.push(`Goal: ${profile.annualGoalTransactions} transactions/year`);
  }
  if (profile.annualGoalGci) {
    professionalDetails.push(`Goal: $${profile.annualGoalGci.toLocaleString()} GCI/year`);
  }
  
  if (professionalDetails.length > 0) {
    parts.push(`## Professional Context
${professionalDetails.join(" | ")}`);
  }
  
  if (profile.specializations.length > 0) {
    const specLabels: Record<string, string> = {
      luxury: "Luxury Properties",
      first_time: "First-Time Buyers",
      investment: "Investment Properties",
      relocation: "Relocation",
      commercial: "Commercial",
      land: "Land & Lots",
      new_construction: "New Construction",
      condos: "Condos & Townhomes",
    };
    const specs = profile.specializations.map(s => specLabels[s] || s);
    parts.push(`## Specializations
${specs.join(", ")}`);
  }
  
  if (profile.focusAreas.length > 0) {
    parts.push(`## Geographic Focus Areas
${profile.focusAreas.join(", ")}`);
  }
  
  const personalDetails: string[] = [];
  if (profile.familySummary) {
    personalDetails.push(`Family: ${profile.familySummary}`);
  }
  if (profile.hobbies.length > 0) {
    personalDetails.push(`Hobbies: ${profile.hobbies.join(", ")}`);
  }
  if (profile.communityInvolvement) {
    personalDetails.push(`Community: ${profile.communityInvolvement}`);
  }
  
  if (personalDetails.length > 0) {
    parts.push(`## Personal Context (FORD)
${personalDetails.join("\n")}`);
  }
  
  if (parts.length === 0) {
    return "";
  }
  
  return `# User Profile - Guiding Principles

${parts.join("\n\n")}

---
Use this context to personalize your responses, align suggestions with the user's values, and reference their goals when making recommendations.`;
}

export async function getAIContextPayload(): Promise<AIContextPayload> {
  const profile = await getUserProfileContext();
  const promptSnippet = buildProfilePromptSnippet(profile);
  
  logger.debug("Built AI context payload", { 
    hasProfile: profile.hasProfile,
    snippetLength: promptSnippet.length 
  });
  
  return {
    profile,
    promptSnippet,
  };
}

export async function getSystemPromptWithProfile(baseSystemPrompt: string): Promise<string> {
  const { promptSnippet } = await getAIContextPayload();
  
  if (!promptSnippet) {
    return baseSystemPrompt;
  }
  
  return `${baseSystemPrompt}

${promptSnippet}`;
}
