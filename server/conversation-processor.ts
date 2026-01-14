import OpenAI from "openai";
import { storage, type TenantContext } from "./storage";
import type { Interaction, Person, AIExtractedData, InsertGeneratedDraft, VoiceProfile, ContentTopic, InsertFollowUpSignal, InsertExperience, Experience } from "@shared/schema";
import { buildDraftGenerationPrompt } from "./prompts";
import { addDays } from "date-fns";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Voice extraction prompt - learns Nathan's speaking patterns
const VOICE_EXTRACTION_PROMPT = `You are analyzing conversation transcripts to learn Nathan's unique communication style. Your job is to extract patterns that make his voice distinctive.

Look for and extract:

1. **Greetings**: How Nathan opens conversations or emails (e.g., "Hey there!", "Good to see you", "Thanks for jumping on")

2. **Sign-offs**: How Nathan closes conversations or says goodbye (e.g., "Take care!", "Looking forward to it", "Let's do this!")

3. **Expressions**: Unique phrases Nathan uses regularly (e.g., "That's awesome", "Love it", "Here's the deal", "At the end of the day")

4. **Tone Notes**: Observations about his communication style:
   - Is he formal or casual?
   - Does he use humor?
   - How does he show enthusiasm?
   - Does he use metaphors or analogies?
   - How does he transition topics?

5. **Compliment Patterns**: How Nathan gives praise or shows appreciation

6. **Question Styles**: How Nathan asks questions or shows interest

Return JSON:
{
  "greetings": ["phrase1", "phrase2"],
  "signoffs": ["phrase1", "phrase2"],
  "expressions": ["phrase1", "phrase2"],
  "toneNotes": ["observation1", "observation2"],
  "complimentPatterns": ["pattern1", "pattern2"],
  "questionStyles": ["style1", "style2"]
}

ONLY extract patterns that are clearly Nathan speaking (not the other person). Look for the host/interviewer perspective.`;

const SYSTEM_PROMPT = `You are an intelligent relationship assistant for a real estate professional focused on relationship-based selling. Your job is to analyze conversation transcripts and extract valuable relationship intelligence.

For each conversation, extract:

1. **FORD Notes** (Family, Occupation, Recreation, Dreams):
   - Family: spouse, children, parents, pets, family dynamics, life changes
   - Occupation: job, career, company, work situation, industry
   - Recreation: hobbies, interests, sports, travel, activities
   - Dreams: goals, aspirations, future plans, bucket list items

2. **Needs**: Things this person mentioned they're looking for or need help with:
   - Services (plumber, contractor, financial advisor, etc.)
   - Connections (know anyone who...)
   - Real estate needs (buying, selling, investing)
   - Professional services

3. **Offers**: What this person provides or could provide to others:
   - Their profession/industry expertise
   - Services they offer
   - Connections they could make

4. **Action Items**: Tasks that came out of the conversation:
   - Follow-ups promised
   - Information to send
   - Introductions to make
   - Research to do

5. **Buyer Criteria** (if they're looking to buy property):
   - Price range
   - Beds/baths
   - Areas/neighborhoods
   - Property types
   - Must-haves

6. **Referral Opportunities**: Potential connections to make between this person and others in the network

7. **Key Topics**: Main subjects discussed

8. **Next Steps**: Recommended next actions

Respond in JSON format matching the AIExtractedData type.`;

const MULTI_PERSON_SYSTEM_PROMPT = `You are an intelligent relationship assistant for a real estate professional. Analyze conversations involving MULTIPLE PEOPLE and extract FORD notes (Family, Occupation, Recreation, Dreams) for EACH person mentioned.

IMPORTANT: This is an event-centric model. One dinner with a couple counts as ONE FORD conversation, not two separate ones. But we need to track what was learned about EACH person.

For each person mentioned in the conversation, extract:
- Their name (match to provided participant list if possible)
- Family info (spouse, kids, parents mentioned)
- Occupation info (job, career, company)
- Recreation info (hobbies, interests, activities)
- Dreams info (goals, aspirations, plans)
- Any needs they mentioned
- Any offers/services they provide

Return JSON in this format:
{
  "perPersonData": [
    {
      "personName": "Sallie Ellett",
      "personId": null,  // will be matched later
      "fordFamily": "Dating Michael, ...",
      "fordOccupation": "Works in...",
      "fordRecreation": "Loves festivals, ...",
      "fordDreams": "Wants to...",
      "needs": ["looking for a..."],
      "offers": ["works in X industry"]
    }
  ],
  "eventSummary": "Dinner with Sallie and Michael discussing...",
  "fordConversationCount": 1,  // Usually 1 for couples/groups, indicates how many FORD convos this counts as
  "keyTopics": ["topic1", "topic2"],
  "actionItems": ["Follow up about X"],
  "nextSteps": ["Send email about Y"]
}`;

export async function analyzeConversation(
  interaction: Interaction,
  person: Person | null
): Promise<AIExtractedData> {
  const transcript = interaction.transcript || interaction.summary || "";
  
  if (!transcript || transcript.length < 50) {
    return {
      processingStatus: "completed",
      processedAt: new Date().toISOString(),
      keyTopics: [],
      actionItems: [],
    };
  }

  const contextPrompt = person ? `
Context about the person:
- Name: ${person.name}
- Current FORD Notes:
  - Family: ${person.fordFamily || "Unknown"}
  - Occupation: ${person.fordOccupation || "Unknown"}
  - Recreation: ${person.fordRecreation || "Unknown"}
  - Dreams: ${person.fordDreams || "Unknown"}
- Is Buyer: ${person.isBuyer ? "Yes" : "No"}
- Profession: ${person.profession || "Unknown"}

Only extract NEW information not already captured above.
` : "";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { 
          role: "user", 
          content: `${contextPrompt}

Analyze this conversation transcript and extract relationship intelligence:

---
${transcript.slice(0, 15000)}
---

Return JSON with the extracted data.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const extracted = JSON.parse(content) as AIExtractedData;
    extracted.processingStatus = "completed";
    extracted.processedAt = new Date().toISOString();
    
    return extracted;
  } catch (error) {
    console.error("Error analyzing conversation:", error);
    return {
      processingStatus: "failed",
      processedAt: new Date().toISOString(),
    };
  }
}

export interface PerPersonFordData {
  personName: string;
  personId?: string | null;
  fordFamily?: string;
  fordOccupation?: string;
  fordRecreation?: string;
  fordDreams?: string;
  needs?: string[];
  offers?: string[];
}

export interface MultiPersonAnalysisResult {
  perPersonData: PerPersonFordData[];
  eventSummary: string;
  fordConversationCount: number;
  keyTopics?: string[];
  actionItems?: string[];
  nextSteps?: string[];
}

export async function analyzeMultiPersonConversation(
  interaction: Interaction,
  participantNames: string[]
): Promise<MultiPersonAnalysisResult> {
  const transcript = interaction.transcript || interaction.summary || "";
  
  if (!transcript || transcript.length < 50) {
    return {
      perPersonData: [],
      eventSummary: "",
      fordConversationCount: 0,
      keyTopics: [],
      actionItems: [],
    };
  }

  const participantContext = participantNames.length > 0 
    ? `Known participants in this conversation: ${participantNames.join(", ")}`
    : "Identify all people mentioned in this conversation.";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: MULTI_PERSON_SYSTEM_PROMPT },
        { 
          role: "user", 
          content: `${participantContext}

Analyze this conversation and extract FORD notes for EACH person mentioned:

---
${transcript.slice(0, 15000)}
---

Return JSON with per-person FORD data.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content) as MultiPersonAnalysisResult;
    return result;
  } catch (error) {
    console.error("Error analyzing multi-person conversation:", error);
    return {
      perPersonData: [],
      eventSummary: "",
      fordConversationCount: 0,
    };
  }
}

// Match extracted person names to database people using fuzzy matching
export async function matchPersonByName(name: string, ctx?: TenantContext): Promise<Person | null> {
  const allPeople = await storage.getAllPeople(ctx);
  const nameLower = name.toLowerCase().trim();
  
  // Exact match
  const exactMatch = allPeople.find(p => p.name.toLowerCase() === nameLower);
  if (exactMatch) return exactMatch;
  
  // Partial match (first name or last name)
  const nameParts = nameLower.split(' ');
  for (const person of allPeople) {
    const personParts = person.name.toLowerCase().split(' ');
    // Check if first name matches
    if (personParts[0] === nameParts[0]) return person;
    // Check if last name matches
    if (personParts.length > 1 && nameParts.length > 1 && 
        personParts[personParts.length - 1] === nameParts[nameParts.length - 1]) {
      return person;
    }
  }
  
  return null;
}

// Generate a concise summary of the conversation
async function generateConversationSummary(
  transcript: string,
  person: Person | null,
  extractedData: AIExtractedData
): Promise<string> {
  try {
    const personContext = person ? `with ${person.name}` : "";
    const keyTopics = extractedData.keyTopics?.join(", ") || "";
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: `You are a concise meeting summarizer. Create a brief, natural summary of this conversation in 2-4 sentences. Focus on the key topics discussed and any important outcomes or next steps. Write in past tense, third person perspective. Do not use bullet points.`
        },
        { 
          role: "user", 
          content: `Summarize this conversation${personContext}:

Key topics covered: ${keyTopics}

Transcript excerpt:
${transcript.slice(0, 8000)}

Write a brief 2-4 sentence summary.`
        }
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "";
  }
}

// Extract Nathan's voice patterns from a transcript
export async function extractVoicePatterns(
  transcript: string,
  source?: string,
  ctx?: TenantContext
): Promise<void> {
  if (!transcript || transcript.length < 200) {
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: VOICE_EXTRACTION_PROMPT },
        { 
          role: "user", 
          content: `Analyze Nathan's speaking patterns in this conversation:

---
${transcript.slice(0, 15000)}
---

Extract patterns from Nathan's speech only.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return;

    const patterns = JSON.parse(content);

    // Store each pattern in the voice profile
    const categoryMappings = [
      { key: 'greetings', category: 'greetings' },
      { key: 'signoffs', category: 'signoffs' },
      { key: 'expressions', category: 'expressions' },
      { key: 'toneNotes', category: 'tone_notes' },
      { key: 'complimentPatterns', category: 'compliment_patterns' },
      { key: 'questionStyles', category: 'question_styles' },
    ];

    for (const { key, category } of categoryMappings) {
      const values = patterns[key];
      if (Array.isArray(values)) {
        for (const value of values) {
          if (typeof value === 'string' && value.length > 0) {
            await storage.upsertVoicePattern(category, value, 'conversation', source, ctx);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error extracting voice patterns:", error);
  }
}

// Content Topic Extraction - identify recurring pain points and questions for content creation
const CONTENT_TOPIC_PROMPT = `You are analyzing a conversation to identify PAIN POINTS, QUESTIONS, FRUSTRATIONS, or AREAS OF CONFUSION that would make good content topics.

Look for ANY type of pain point or issue, including but not limited to:
1. Questions about any process or decision (real estate, life, business, finances, relationships, health, career, etc.)
2. Confusion or misunderstandings that needed clarification
3. Concerns, worries, fears, or anxieties expressed
4. Frustrations with systems, processes, or experiences
5. Challenges or obstacles they're facing
6. Topics where explanation or education was provided
7. Life transitions or changes causing stress
8. Decision-making struggles
9. Problems they're trying to solve
10. Goals they're struggling to achieve

For each topic found, provide:
- A clear, specific topic title (e.g., "Work-Life Balance Struggles", "Understanding Inspection Contingencies", "Navigating Career Changes")
- A brief description of the pain point or question
- A sample quote from the conversation (their actual words)
- A category (real_estate, career, finance, relationships, health, lifestyle, business, parenting, technology, personal_growth, other)

Return JSON:
{
  "topics": [
    {
      "title": "...",
      "description": "...",
      "sampleQuote": "...",
      "category": "..."
    }
  ]
}

Include any genuine pain point where content could help educate, comfort, or guide others with similar issues. Skip small talk and trivial conversation.`;

export async function extractContentTopics(
  transcript: string,
  interactionId: string,
  ctx?: TenantContext
): Promise<{ topicsFound: number; newTopics: number }> {
  if (!transcript || transcript.length < 200) {
    return { topicsFound: 0, newTopics: 0 };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: CONTENT_TOPIC_PROMPT },
        {
          role: "user",
          content: `Analyze this conversation and identify content-worthy pain points and questions:

---
${transcript.slice(0, 12000)}
---`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { topicsFound: 0, newTopics: 0 };

    const parsed = JSON.parse(content);
    const topics = parsed.topics || [];
    
    let newTopicsCount = 0;
    
    // Get existing topics to check for matches
    const existingTopics = await storage.getAllContentTopics(ctx);
    
    for (const topic of topics) {
      if (!topic.title) continue;
      
      // Check if a similar topic already exists (fuzzy match)
      const titleLower = topic.title.toLowerCase();
      const existingMatch = existingTopics.find(t => 
        t.title.toLowerCase().includes(titleLower) || 
        titleLower.includes(t.title.toLowerCase()) ||
        (t.title.toLowerCase().split(' ').filter(w => w.length > 4).some(w => titleLower.includes(w)))
      );
      
      if (existingMatch) {
        // Increment mention count and add quote/interactionId
        await storage.incrementTopicMention(
          existingMatch.id,
          topic.sampleQuote,
          interactionId,
          ctx
        );
      } else {
        // Create new topic
        await storage.createContentTopic({
          title: topic.title,
          description: topic.description,
          category: topic.category,
          sampleQuotes: topic.sampleQuote ? [topic.sampleQuote] : [],
          relatedInteractionIds: [interactionId],
          mentionCount: 1,
          status: 'active',
        }, ctx);
        newTopicsCount++;
      }
    }
    
    return { topicsFound: topics.length, newTopics: newTopicsCount };
  } catch (error) {
    console.error("Error extracting content topics:", error);
    return { topicsFound: 0, newTopics: 0 };
  }
}

// Get the current voice profile for use in draft generation
export async function getVoiceContext(): Promise<string> {
  const profiles = await storage.getAllVoiceProfiles();
  
  if (profiles.length === 0) {
    return "";
  }

  const grouped: Record<string, string[]> = {};
  for (const p of profiles) {
    if (!grouped[p.category]) {
      grouped[p.category] = [];
    }
    // Include more frequent patterns first (already sorted by storage)
    if (grouped[p.category].length < 10) {
      grouped[p.category].push(p.value);
    }
  }

  let context = `\n\n## Nathan's Communication Style (use these patterns to match his voice):\n`;
  
  if (grouped.greetings?.length) {
    context += `\nGreetings he uses: ${grouped.greetings.join(", ")}`;
  }
  if (grouped.signoffs?.length) {
    context += `\nSign-offs he uses: ${grouped.signoffs.join(", ")}`;
  }
  if (grouped.expressions?.length) {
    context += `\nCommon expressions: ${grouped.expressions.join(", ")}`;
  }
  if (grouped.tone_notes?.length) {
    context += `\nTone characteristics: ${grouped.tone_notes.join("; ")}`;
  }
  if (grouped.compliment_patterns?.length) {
    context += `\nHow he gives compliments: ${grouped.compliment_patterns.join("; ")}`;
  }
  if (grouped.question_styles?.length) {
    context += `\nHow he asks questions: ${grouped.question_styles.join("; ")}`;
  }
  
  // Include learned draft preferences from user edits
  if (grouped.draft_tone_preference?.length) {
    context += `\n\n## Learned Draft Preferences (from past edits):`;
    context += `\nTone preferences: ${grouped.draft_tone_preference.join("; ")}`;
  }
  if (grouped.draft_avoid_pattern?.length) {
    context += `\nPATTERNS TO AVOID: ${grouped.draft_avoid_pattern.join("; ")}`;
  }
  if (grouped.draft_preferred_pattern?.length) {
    context += `\nPreferred patterns: ${grouped.draft_preferred_pattern.join("; ")}`;
  }
  if (grouped.draft_length_preference?.length) {
    context += `\nLength preference: ${grouped.draft_length_preference[0]}`;
  }

  context += `\n\nIMPORTANT: Match Nathan's natural speaking style. Use his typical expressions and tone. The content should sound authentically like him. Pay special attention to avoiding patterns he has edited out in past drafts.`;
  
  return context;
}

// Draft Edit Learning Prompt - Analyzes user edits to learn writing preferences
const DRAFT_EDIT_LEARNING_PROMPT = `You are analyzing how a user edited an AI-generated draft to learn their writing preferences.

Compare the ORIGINAL AI draft with the USER'S EDITED version and identify patterns in what they changed:

1. **Phrasing Preferences**: Words/phrases they replaced with alternatives
2. **Tone Adjustments**: Did they make it more/less formal, casual, warm, direct?
3. **Length Preferences**: Did they shorten/lengthen sentences or the overall content?
4. **Structure Changes**: How did they reorganize or restructure?
5. **Removals**: What types of content did they consistently remove?
6. **Additions**: What types of content did they add that wasn't there?

Return JSON with learned preferences that can improve future drafts:
{
  "phraseReplacements": [{"from": "original phrase", "to": "preferred phrase"}],
  "tonePreferences": ["more casual", "less formal greetings", etc.],
  "lengthPreference": "shorter" | "longer" | "same",
  "structureNotes": ["prefers bullets over paragraphs", etc.],
  "avoidPatterns": ["phrases or patterns to avoid"],
  "preferredPatterns": ["phrases or patterns they added or prefer"],
  "overallInsight": "One sentence summary of their editing style"
}

Focus on actionable patterns that can be used to generate better drafts next time.`;

export async function analyzeDraftEdit(
  feedbackId: string,
  ctx?: TenantContext
): Promise<void> {
  try {
    const feedback = await storage.getDraftFeedback(feedbackId, ctx);
    if (!feedback || feedback.processed) {
      return;
    }

    // Analyze the edits using AI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: DRAFT_EDIT_LEARNING_PROMPT },
        {
          role: "user",
          content: `Draft Type: ${feedback.draftType}

ORIGINAL AI-GENERATED DRAFT:
---
${feedback.originalContent}
---

USER'S EDITED VERSION:
---
${feedback.editedContent}
---

Analyze the differences and extract writing preferences.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return;
    }

    const insights = JSON.parse(content);
    
    // Store learned insights on the feedback record
    await storage.updateDraftFeedback(feedbackId, {
      learnedInsights: insights,
      processed: true,
    }, ctx);

    // Convert insights into voice profile entries for future use
    const source = `draft_edit:${feedbackId}`;
    
    // Store tone preferences
    if (insights.tonePreferences?.length) {
      for (const pref of insights.tonePreferences.slice(0, 3)) {
        await storage.upsertVoicePattern("draft_tone_preference", pref, feedback.draftType, source, ctx);
      }
    }
    
    // Store patterns to avoid
    if (insights.avoidPatterns?.length) {
      for (const pattern of insights.avoidPatterns.slice(0, 3)) {
        await storage.upsertVoicePattern("draft_avoid_pattern", pattern, feedback.draftType, source, ctx);
      }
    }
    
    // Store preferred patterns
    if (insights.preferredPatterns?.length) {
      for (const pattern of insights.preferredPatterns.slice(0, 3)) {
        await storage.upsertVoicePattern("draft_preferred_pattern", pattern, feedback.draftType, source, ctx);
      }
    }
    
    // Store length preference if clear
    if (insights.lengthPreference && insights.lengthPreference !== "same") {
      await storage.upsertVoicePattern("draft_length_preference", insights.lengthPreference, feedback.draftType, source, ctx);
    }

    console.log(`[Draft Learning] Processed feedback ${feedbackId}: ${insights.overallInsight || "Patterns extracted"}`);
  } catch (error) {
    console.error("Error analyzing draft edit:", error);
    throw error;
  }
}

// Build rich contact context for draft personalization
function buildContactContext(person: Person): string {
  const lines: string[] = [];
  
  // Spouse/partner info
  if (person.spouseName) {
    lines.push(`Spouse/Partner Name: ${person.spouseName}`);
  }
  
  // Children info
  if (person.childrenInfo) {
    lines.push(`Children: ${person.childrenInfo}`);
  }
  
  // FORD fields
  if (person.fordFamily) {
    lines.push(`Family Notes: ${person.fordFamily}`);
  }
  if (person.fordOccupation) {
    lines.push(`Occupation: ${person.fordOccupation}`);
  }
  if (person.fordRecreation) {
    lines.push(`Recreation/Interests: ${person.fordRecreation}`);
  }
  if (person.fordDreams) {
    lines.push(`Dreams/Goals: ${person.fordDreams}`);
  }
  
  // Profession
  if (person.profession) {
    lines.push(`Profession: ${person.profession}`);
  }
  
  // General notes may have relationship context
  if (person.notes) {
    lines.push(`Notes: ${person.notes}`);
  }
  
  if (lines.length === 0) {
    return "";
  }
  
  return `KNOWN CONTACT DETAILS (use these real names, not placeholders):\n${lines.join('\n')}`;
}

interface RoleBasedContact {
  role: string;
  name: string;
  occupation: string;
}

// Find contacts by role/specialty when user references them generically
async function findRoleBasedContacts(
  transcript: string,
  ctx?: TenantContext
): Promise<RoleBasedContact[]> {
  const matches: RoleBasedContact[] = [];
  
  // Common role patterns to look for
  const rolePatterns = [
    { pattern: /(?:my|our)\s+(?:go-to\s+)?(?:kitchens?\s*(?:and|&)?\s*baths?|kitchen)\s+(?:contractor|guy|person|GC)/i, role: "kitchens and baths contractor" },
    { pattern: /(?:my|our)\s+(?:go-to\s+)?(?:general\s+)?contractor/i, role: "general contractor" },
    { pattern: /(?:my|our)\s+(?:go-to\s+)?plumber/i, role: "plumber" },
    { pattern: /(?:my|our)\s+(?:go-to\s+)?electrician/i, role: "electrician" },
    { pattern: /(?:my|our)\s+(?:go-to\s+)?(?:financial\s+)?(?:advisor|planner)/i, role: "financial advisor" },
    { pattern: /(?:my|our)\s+(?:go-to\s+)?lender/i, role: "lender" },
    { pattern: /(?:my|our)\s+(?:go-to\s+)?(?:home\s+)?inspector/i, role: "home inspector" },
    { pattern: /(?:my|our)\s+(?:go-to\s+)?landscaper/i, role: "landscaper" },
    { pattern: /(?:my|our)\s+(?:go-to\s+)?handyman/i, role: "handyman" },
    { pattern: /(?:my|our)\s+(?:go-to\s+)?(?:title|escrow)\s+(?:company|officer|agent)/i, role: "title company" },
    { pattern: /(?:my|our)\s+(?:go-to\s+)?(?:estate|attorney|lawyer)/i, role: "attorney" },
    { pattern: /(?:my|our)\s+(?:go-to\s+)?(?:HVAC|heating|cooling)\s+(?:guy|person|tech|company)?/i, role: "HVAC" },
    { pattern: /(?:my|our)\s+(?:go-to\s+)?roofer/i, role: "roofer" },
  ];
  
  // Check which roles are mentioned in the transcript
  const mentionedRoles = rolePatterns.filter(rp => rp.pattern.test(transcript));
  
  if (mentionedRoles.length === 0) {
    return matches;
  }
  
  // Get all contacts and search for matches
  try {
    const allPeople = await storage.getAllPeople(ctx);
    
    for (const { role } of mentionedRoles) {
      const roleLower = role.toLowerCase();
      
      // Find a contact whose occupation/profession matches this role
      const match = allPeople.find(p => {
        const occupation = (p.fordOccupation || p.profession || '').toLowerCase();
        const notes = (p.notes || '').toLowerCase();
        
        // Check if occupation contains the role keywords
        const roleWords = roleLower.split(/\s+/);
        return roleWords.some(word => 
          word.length > 3 && (occupation.includes(word) || notes.includes(word))
        );
      });
      
      if (match) {
        matches.push({
          role,
          name: match.name,
          occupation: match.fordOccupation || match.profession || role
        });
      }
    }
  } catch (e) {
    console.warn("Error finding role-based contacts:", e);
  }
  
  return matches;
}

// Real estate life event triggers (context graph industry layer)
const LIFE_EVENT_KEYWORDS = {
  divorce: ['divorce', 'separated', 'splitting up', 'ex-wife', 'ex-husband', 'custody'],
  new_child: ['baby', 'pregnant', 'expecting', 'new baby', 'just had a baby', 'newborn', 'maternity', 'paternity'],
  job_change: ['new job', 'got promoted', 'starting at', 'just started', 'new position', 'career change', 'laid off', 'left my job'],
  long_tenure: ['been here for years', 'lived here forever', '7 years', '8 years', '10 years', '15 years'],
  retirement: ['retiring', 'retired', 'retirement', 'leaving work'],
  empty_nest: ['kids moved out', 'empty nest', 'last one left', 'all on our own now'],
  downsizing: ['too much space', 'don\'t need all this room', 'downsizing'],
  upsizing: ['need more room', 'outgrown', 'need a bigger place', 'cramped'],
  death_spouse: ['passed away', 'widowed', 'lost my spouse', 'lost my husband', 'lost my wife'],
  marriage: ['getting married', 'engaged', 'just got married', 'wedding'],
  relocation: ['moving to', 'transferring', 'relocated', 'relocation'],
  inheritance: ['inherited', 'estate', 'probate'],
  investment: ['rental property', 'investment property', 'thinking about investing'],
  health_issue: ['health problems', 'can\'t do stairs', 'need single level', 'accessibility'],
  school_change: ['school district', 'better schools', 'kids starting school'],
  neighborhood_issue: ['neighborhood going downhill', 'crime', 'neighbors'],
  renovation_need: ['needs too much work', 'falling apart', 'major repairs needed']
};

function detectLifeEvents(transcript: string): string[] {
  const lowerTranscript = transcript.toLowerCase();
  const detectedEvents: string[] = [];
  
  for (const [eventType, keywords] of Object.entries(LIFE_EVENT_KEYWORDS)) {
    if (keywords.some(kw => lowerTranscript.includes(kw))) {
      detectedEvents.push(eventType);
    }
  }
  
  return detectedEvents;
}

// Experience extraction prompt - AI extracts meaningful experiences from conversations
const EXPERIENCE_EXTRACTION_PROMPT = `You are an intelligent relationship assistant. Analyze this conversation to extract meaningful EXPERIENCES - significant life events, achievements, struggles, or transitions that deserve acknowledgment.

EXPERIENCE TYPES:
- life_event: Major life changes (birth, death, divorce, marriage, moving, health issues)
- achievement: Wins and milestones (promotion, graduation, business success, personal goals met)
- struggle: Challenges and difficulties (job loss, health problems, family issues, financial stress)
- transition: Life phase changes (retirement, kids leaving home, career change, relocating)

MAGNITUDE SCALE (be conservative, default to 2-3):
- 5: Life-altering (death of loved one, divorce, major health crisis, birth of child)
- 4: Major milestone (promotion, home purchase, engagement, big move)
- 3: Notable transition (new job, kid starting school, career pivot)
- 2: Everyday life (vacation, minor wins, routine updates, hobbies)
- 1: Ambient context (weather chat, casual small talk)

EMOTIONAL VALENCE:
- positive: Good news, wins, celebrations
- negative: Loss, struggle, challenge
- mixed: Bittersweet or complex situations

RULES:
- Only extract experiences explicitly mentioned in the conversation
- One conversation may yield 0-5 experiences (don't force it)
- Be conservative on magnitude - only assign 4-5 when language is explicit
- Include a brief, specific summary (1-2 sentences max)
- If confidence is low (<60%), skip it - better to miss than fabricate

Return JSON:
{
  "experiences": [
    {
      "type": "life_event",
      "summary": "Just had their first baby last month",
      "emotionalValence": "positive",
      "magnitudeScore": 5,
      "confidenceScore": 95
    }
  ]
}

If no meaningful experiences found, return: {"experiences": []}`;

interface ExtractedExperience {
  type: 'life_event' | 'achievement' | 'struggle' | 'transition';
  summary: string;
  emotionalValence?: 'positive' | 'negative' | 'mixed';
  magnitudeScore: number;
  confidenceScore: number;
}

export async function extractExperiences(
  transcript: string,
  personName: string
): Promise<ExtractedExperience[]> {
  // Skip if transcript is too short
  if (!transcript || transcript.length < 100) {
    return [];
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use cheaper model for extraction
      messages: [
        { role: "system", content: EXPERIENCE_EXTRACTION_PROMPT },
        { 
          role: "user", 
          content: `Analyze this conversation with ${personName} and extract any meaningful experiences:\n\n${transcript.slice(0, 6000)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Low temperature for consistent extraction
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) return [];
    
    const parsed = JSON.parse(content);
    const experiences: ExtractedExperience[] = (parsed.experiences || [])
      .filter((e: any) => {
        // Filter out low-confidence extractions
        if (e.confidenceScore && e.confidenceScore < 60) return false;
        // Must have required fields
        if (!e.type || !e.summary) return false;
        // Must be valid type
        if (!['life_event', 'achievement', 'struggle', 'transition'].includes(e.type)) return false;
        return true;
      })
      .map((e: any) => ({
        type: e.type,
        summary: e.summary,
        emotionalValence: ['positive', 'negative', 'mixed'].includes(e.emotionalValence) ? e.emotionalValence : undefined,
        magnitudeScore: Math.min(5, Math.max(1, e.magnitudeScore || 2)), // Clamp to 1-5
        confidenceScore: e.confidenceScore || 70
      }));
    
    return experiences;
  } catch (error) {
    console.warn('Experience extraction failed (non-blocking):', error);
    return []; // Don't block pipeline on extraction failures
  }
}

export async function createAndSaveExperiences(
  interaction: Interaction,
  person: Person,
  ctx?: TenantContext
): Promise<Experience[]> {
  const transcript = interaction.transcript || interaction.summary || '';
  
  // Extract experiences using AI
  const extractedExperiences = await extractExperiences(transcript, person.name);
  
  if (extractedExperiences.length === 0) {
    return [];
  }
  
  const savedExperiences: Experience[] = [];
  
  for (const exp of extractedExperiences) {
    // Light deduplication: check for same person + type + interaction
    const existing = await storage.findDuplicateExperience(
      person.id,
      exp.type,
      interaction.id,
      ctx
    );
    
    if (existing) {
      continue; // Skip duplicate
    }
    
    // Create the experience
    const insertExp: InsertExperience = {
      personId: person.id,
      interactionId: interaction.id,
      type: exp.type,
      summary: exp.summary,
      emotionalValence: exp.emotionalValence,
      magnitudeScore: exp.magnitudeScore,
      confidenceScore: exp.confidenceScore,
      acknowledged: false,
      occurredAt: interaction.occurredAt
    };
    
    const saved = await storage.createExperience(insertExp, ctx);
    savedExperiences.push(saved);
  }
  
  return savedExperiences;
}

function calculateSignalPriority(
  person: Person, 
  interaction: Interaction, 
  lifeEvents: string[],
  experiences?: Experience[]
): number {
  let score = 50; // Base score
  
  // Segment priority: A=30, B=20, C=10, D=0
  const segmentScores: Record<string, number> = { 'A': 30, 'B': 20, 'C': 10, 'D': 0 };
  score += segmentScores[person.segment || 'D'] || 0;
  
  // Experience-based priority (NEW - meaning-based ranking)
  // Higher magnitude experiences increase priority significantly
  if (experiences && experiences.length > 0) {
    const maxMagnitude = Math.max(...experiences.map(e => e.magnitudeScore));
    // Magnitude 5: +25, Magnitude 4: +20, Magnitude 3: +15, Magnitude 2: +10, Magnitude 1: +5
    score += maxMagnitude * 5;
    
    // Unacknowledged high-magnitude experiences get extra priority
    const unacknowledgedHigh = experiences.filter(e => !e.acknowledged && e.magnitudeScore >= 4);
    if (unacknowledgedHigh.length > 0) {
      score += 10; // Bonus for unacknowledged high-importance experiences
    }
  } else {
    // Fallback to keyword-based life event detection if no experiences extracted
    score += Math.min(lifeEvents.length * 15, 30);
  }
  
  // Interaction type priority
  const typeScores: Record<string, number> = {
    'meeting': 10, 'in_person': 10, 'dinner': 10,
    'call': 5, 'phone': 5,
    'email': 2, 'text': 2, 'voicemail': 2
  };
  score += typeScores[interaction.type] || 0;
  
  // Hot/warm/active deal contacts get priority (using available fields)
  // Check if person has an active deal (buyer status indicates hot)
  if (person.buyerStatus === 'active') score += 10;
  
  return Math.min(100, score); // Cap at 100
}

function buildSignalReasoning(
  interaction: Interaction,
  person: Person,
  lifeEvents: string[],
  extractedData: AIExtractedData,
  experiences?: Experience[]
): string {
  const parts: string[] = [];
  
  // Interaction type
  parts.push(interaction.type.replace('_', ' '));
  
  // Segment
  if (person.segment) {
    parts.push(`${person.segment}-contact`);
  }
  
  // Experience-based reasoning (higher priority than keyword detection)
  if (experiences && experiences.length > 0) {
    // Sort by magnitude descending
    const sortedExp = [...experiences].sort((a, b) => b.magnitudeScore - a.magnitudeScore);
    const topExperience = sortedExp[0];
    
    // Add experience type and summary
    const typeLabel = topExperience.type.replace('_', ' ');
    parts.push(`${typeLabel}: ${topExperience.summary}`);
    
    // Add magnitude indicator for high-importance experiences
    if (topExperience.magnitudeScore >= 4) {
      parts.push(`(magnitude ${topExperience.magnitudeScore})`);
    }
  } else if (lifeEvents.length > 0) {
    // Fallback to keyword-detected life events
    parts.push(lifeEvents.map(e => e.replace('_', ' ')).join(', '));
  }
  
  // Key topics if available (only if no experiences for brevity)
  if ((!experiences || experiences.length === 0) && extractedData.keyTopics && extractedData.keyTopics.length > 0) {
    parts.push(extractedData.keyTopics.slice(0, 2).join(', '));
  }
  
  // Action items mentioned
  if (extractedData.actionItems && extractedData.actionItems.length > 0) {
    parts.push(`${extractedData.actionItems.length} action item(s)`);
  }
  
  return parts.join(' + ');
}

export async function createFollowUpSignal(
  interaction: Interaction,
  person: Person,
  extractedData: AIExtractedData,
  ctx?: TenantContext,
  experiences?: Experience[]
): Promise<InsertFollowUpSignal | null> {
  const transcript = interaction.transcript || interaction.summary || '';
  
  // Skip if no meaningful content
  if (transcript.length < 20) {
    return null;
  }
  
  // Detect life events from transcript (fallback if no experiences)
  const lifeEvents = detectLifeEvents(transcript);
  
  // Calculate priority score (now experience-aware)
  const priorityScore = calculateSignalPriority(person, interaction, lifeEvents, experiences);
  
  // Build reasoning string (include experience context if available)
  const reasoning = buildSignalReasoning(interaction, person, lifeEvents, extractedData, experiences);
  
  // Link to the highest-magnitude unacknowledged experience if available
  let experienceId: string | undefined;
  if (experiences && experiences.length > 0) {
    // Sort by magnitude descending, then by unacknowledged first
    const sortedExperiences = [...experiences].sort((a, b) => {
      if (a.magnitudeScore !== b.magnitudeScore) {
        return b.magnitudeScore - a.magnitudeScore;
      }
      return (a.acknowledged ? 1 : 0) - (b.acknowledged ? 1 : 0);
    });
    experienceId = sortedExperiences[0]?.id;
  }
  
  // Signal expires in 7 days
  const expiresAt = addDays(new Date(), 7);
  
  return {
    personId: person.id,
    interactionId: interaction.id,
    experienceId,
    reasoning,
    priorityScore,
    status: 'pending',
    expiresAt
  };
}

export async function generateFollowUpDrafts(
  interaction: Interaction,
  person: Person,
  extractedData: AIExtractedData,
  ctx?: TenantContext
): Promise<InsertGeneratedDraft[]> {
  const drafts: InsertGeneratedDraft[] = [];
  
  const transcript = interaction.transcript || interaction.summary || "";
  // Lower threshold to 20 chars to ensure even brief action items get processed
  // e.g., "Connect Dennis with Ricardo; send availability email" is ~55 chars
  if (!transcript || transcript.length < 20) {
    return drafts;
  }

  // Get Nathan's voice profile to personalize drafts
  const voiceContext = await getVoiceContext();

  // Build rich contact context for personalization
  const contactContext = buildContactContext(person);
  
  // Try to find role-based contacts (e.g., "my kitchens contractor")
  const roleBasedContacts = await findRoleBasedContacts(transcript, ctx);
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: buildDraftGenerationPrompt(voiceContext)
        },
        {
          role: "user",
          content: `Person: ${person.name}
${contactContext}
Interaction Type: ${interaction.type}
Date: ${new Date(interaction.occurredAt).toLocaleDateString()}
Key Topics: ${extractedData.keyTopics?.join(", ") || "General conversation"}
Action Items Discussed: ${extractedData.actionItems?.join(", ") || "None specific"}

IMPORTANT CONTEXT FOR HANDWRITTEN NOTE DECISION:
- Interaction type is "${interaction.type}" 
- ${interaction.type === 'voicemail' ? 'This was a VOICEMAIL - do NOT generate handwritten note unless explicitly requested in the transcript' : ''}
- ${interaction.type === 'meeting' || interaction.type === 'in_person' ? 'This was an IN-PERSON meeting - a handwritten note IS appropriate' : ''}
- ${interaction.type === 'call' || interaction.type === 'phone' ? 'This was a phone call - only generate handwritten note if life events mentioned or explicitly requested' : ''}

${roleBasedContacts.length > 0 ? `KNOWN CONTACTS BY ROLE (use these names when user references by role):
${roleBasedContacts.map(c => `- "${c.role}": ${c.name} (${c.occupation})`).join('\n')}` : ''}

Conversation Summary/Transcript:
${transcript.slice(0, 8000)}

Generate follow-up content for this interaction. Remember to scan for third-party mentions who need separate actions.
IMPORTANT: Use ACTUAL NAMES from the contact context above - do not use placeholders like [husband's name] if the spouse name is known.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return drafts;

    const generated = JSON.parse(content);

    // Handle new multi-email format (emails array)
    if (generated.emails && Array.isArray(generated.emails)) {
      for (const email of generated.emails) {
        // Validate required fields
        if (!email.body) continue;
        const subject = email.subject || `Follow-up with ${person.name}`;
        const emailType = email.type || "followup";
        
        // For connection emails, create drafts for both parties
        if (emailType === "connection" && email.person1 && email.person2) {
          const emailTitle = `Introduction: ${email.person1} <> ${email.person2}`;
          
          // Try to find the second person to link the draft to them as well
          let person2Record: Person | null = null;
          try {
            const allPeople = await storage.getAllPeople(ctx);
            const person2NameLower = email.person2.toLowerCase().trim();
            person2Record = allPeople.find(p => 
              p.name.toLowerCase().trim() === person2NameLower ||
              p.name.toLowerCase().includes(person2NameLower) ||
              person2NameLower.includes(p.name.toLowerCase())
            ) || null;
          } catch (e) {
            console.warn(`Could not search for connection party ${email.person2}:`, e);
          }
          
          // Create ONE draft for connection email (linked to primary person only to avoid duplicates)
          drafts.push({
            personId: person.id,
            interactionId: interaction.id,
            type: "email",
            title: emailTitle,
            content: email.body,
            status: "pending",
            metadata: { 
              subject,
              emailType: "connection",
              isConnection: true,
              person1: email.person1,
              person2: email.person2,
              recipientName: email.recipientName || `${email.person1}, ${email.person2}`,
              ...(person2Record && { person2Id: person2Record.id })
            },
          });
        } else {
          // Regular followup or action email
          drafts.push({
            personId: person.id,
            interactionId: interaction.id,
            type: "email",
            title: subject,
            content: email.body,
            status: "pending",
            metadata: { 
              subject,
              emailType,
              recipientName: email.recipientName || person.name,
              ...(emailType === "action" && email.actionDescription && { 
                actionDescription: email.actionDescription 
              })
            },
          });
        }
      }
    }
    // Legacy support: handle old single email format
    else if (generated.email) {
      drafts.push({
        personId: person.id,
        interactionId: interaction.id,
        type: "email",
        title: generated.email.subject,
        content: generated.email.body,
        status: "pending",
        metadata: { subject: generated.email.subject },
      });
    }

    // Server-side validation: Only create handwritten note if trigger rules are met
    // STRICT: Voicemails NEVER get notes unless explicitly_request reason is returned
    // STRICT: Must have a valid reason - don't generate notes with null/missing reason
    const isVoicemail = interaction.type === 'voicemail' || 
      (interaction.summary?.toLowerCase().includes('left a voicemail') ?? false) ||
      (interaction.summary?.toLowerCase().includes('left voicemail') ?? false) ||
      (interaction.transcript?.toLowerCase().includes('left a voicemail') ?? false);
    
    const hasNote = generated.handwrittenNote && 
      generated.handwrittenNote !== null && 
      typeof generated.handwrittenNote === 'string' &&
      generated.handwrittenNote.trim().length > 0;
    
    const hasValidReason = generated.handwrittenNoteReason === 'in_person_meeting' ||
      generated.handwrittenNoteReason === 'life_event' ||
      generated.handwrittenNoteReason === 'explicit_request';
    
    // For voicemails: ONLY allow if reason is explicit_request
    // For other types: allow if there's a valid reason OR interaction is in-person type
    const isInPersonType = interaction.type === 'meeting' || 
      interaction.type === 'in_person' || 
      interaction.type === 'coffee' ||
      interaction.type === 'lunch' ||
      interaction.type === 'dinner';
    
    const shouldCreateNote = hasNote && (
      (isVoicemail && generated.handwrittenNoteReason === 'explicit_request') ||
      (!isVoicemail && (hasValidReason || isInPersonType))
    );
    
    if (shouldCreateNote) {
      drafts.push({
        personId: person.id,
        interactionId: interaction.id,
        type: "handwritten_note",
        title: `Note for ${person.name}`,
        content: generated.handwrittenNote,
        status: "pending",
        metadata: { 
          reason: generated.handwrittenNoteReason || (isInPersonType ? "in_person_meeting" : "unspecified")
        },
      });
    }

    if (generated.tasks && Array.isArray(generated.tasks)) {
      for (const task of generated.tasks) {
        drafts.push({
          personId: person.id,
          interactionId: interaction.id,
          type: "task",
          title: task.title,
          content: task.title,
          status: "pending",
          metadata: { priority: task.priority || "medium" },
        });
      }
    }

    // Process third-party actions - people mentioned in conversation who need follow-up
    // Try to find the actual person record so drafts are properly linked
    // If not found, create a new contact for them
    if (generated.thirdPartyActions && Array.isArray(generated.thirdPartyActions)) {
      for (const action of generated.thirdPartyActions) {
        if (!action.personName || !action.actionType) continue;
        
        // Try to find this person in the database by name (with proper tenant context)
        let thirdPartyPerson: Person | null = null;
        let wasCreated = false;
        try {
          const allPeople = await storage.getAllPeople(ctx);
          const nameLower = action.personName.toLowerCase().trim();
          
          // First try exact match
          thirdPartyPerson = allPeople.find(p => 
            p.name.toLowerCase().trim() === nameLower
          ) || null;
          
          // If no exact match, try partial match on first name or last name
          if (!thirdPartyPerson) {
            const nameParts = nameLower.split(/\s+/);
            thirdPartyPerson = allPeople.find(p => {
              const personParts = p.name.toLowerCase().trim().split(/\s+/);
              // Match if first name matches or last name matches
              return nameParts.some((part: string) => personParts.includes(part) && part.length > 2);
            }) || null;
          }
          
          if (thirdPartyPerson) {
            console.log(`[ThirdParty] Found match for "${action.personName}": ${thirdPartyPerson.name} (${thirdPartyPerson.id})`);
          } else {
            // Create a new contact for this third party
            console.log(`[ThirdParty] Creating new contact for "${action.personName}"`);
            thirdPartyPerson = await storage.createPerson({
              name: action.personName,
              segment: 'D', // New contact default
              notes: `Auto-created from conversation mention. Source: ${person.name} on ${new Date().toLocaleDateString()}`
            }, ctx);
            wasCreated = true;
            console.log(`[ThirdParty] Created contact for "${action.personName}": ${thirdPartyPerson.id}`);
          }
        } catch (e) {
          console.warn(`Could not search/create third-party person ${action.personName}:`, e);
        }
        
        // Use the third party's ID - they should always exist now (found or created)
        const targetPersonId = thirdPartyPerson?.id || person.id;
        const targetPersonName = thirdPartyPerson?.name || action.personName;
        const isLinkedToActualPerson = !!thirdPartyPerson;
        
        if (action.actionType === "handwritten_note") {
          drafts.push({
            personId: targetPersonId,
            interactionId: interaction.id,
            type: "handwritten_note",
            title: isLinkedToActualPerson 
              ? `Note for ${targetPersonName}` 
              : `[ACTION NEEDED] Note for ${action.personName}`,
            content: action.content || `Write a note to ${action.personName}`,
            status: "pending",
            metadata: { 
              thirdParty: true,
              thirdPartyName: action.personName,
              thirdPartyResolved: isLinkedToActualPerson,
              reason: action.reason || "mentioned_in_conversation",
              sourceInteractionPerson: person.name,
              needsManualLinking: !isLinkedToActualPerson
            },
          });
        } else if (action.actionType === "task" || action.actionType === "call" || action.actionType === "email") {
          drafts.push({
            personId: targetPersonId,
            interactionId: interaction.id,
            type: "task",
            title: isLinkedToActualPerson
              ? (action.content || `${action.actionType}: ${targetPersonName}`)
              : `[ACTION NEEDED] ${action.actionType}: ${action.personName}`,
            content: action.content || `Follow up with ${action.personName}: ${action.reason}`,
            status: "pending",
            metadata: { 
              priority: "medium",
              thirdParty: true,
              thirdPartyName: action.personName,
              thirdPartyResolved: isLinkedToActualPerson,
              actionType: action.actionType,
              sourceInteractionPerson: person.name,
              needsManualLinking: !isLinkedToActualPerson
            },
          });
        }
      }
    }

    // Store FORD summary on the interaction if generated
    if (generated.fordSummary) {
      const fordSummary = generated.fordSummary;
      
      // Update interaction with FORD summary
      try {
        const existingData = interaction.aiExtractedData || {};
        await storage.updateInteraction(interaction.id, {
          aiExtractedData: {
            ...existingData,
            fordSummary: {
              family: fordSummary.family,
              occupation: fordSummary.occupation,
              recreation: fordSummary.recreation,
              dreams: fordSummary.dreams,
              lifeChangeSignal: fordSummary.lifeChangeSignal,
              actionItems: fordSummary.actionItems,
              moveScore: fordSummary.moveScore
            }
          }
        }, ctx);
        console.log(`[FORD Summary] Stored for interaction ${interaction.id}: moveScore=${fordSummary.moveScore}`);
        
        // If moveScore suggests pipeline update, update the person
        if (fordSummary.moveScore && person.id) {
          const currentPipeline = person.pipelineStatus;
          const suggestedPipeline = fordSummary.moveScore === 'cold' ? null : fordSummary.moveScore;
          
          // Only upgrade pipeline status, don't downgrade
          if (suggestedPipeline === 'hot' && currentPipeline !== 'hot') {
            console.log(`[FORD Summary] Recommending pipeline upgrade to HOT for ${person.name}`);
          } else if (suggestedPipeline === 'warm' && !currentPipeline) {
            console.log(`[FORD Summary] Recommending pipeline upgrade to WARM for ${person.name}`);
          }
        }
      } catch (e) {
        console.warn("Error storing FORD summary:", e);
      }
    }

    // Validate drafts - remove any with unfilled name/person placeholders
    // BUT allow scheduling placeholders like [Day], [Time range] which are intentional
    const validatedDrafts = drafts.filter(draft => {
      // Only block placeholders for missing person/relationship data
      const badPlaceholderPattern = /\[(?:husband|wife|spouse|partner|their|his|her|blank)'?s?\s*(?:name)?\]/gi;
      const hasBadPlaceholders = badPlaceholderPattern.test(draft.content);
      
      if (hasBadPlaceholders) {
        console.warn(`[Draft Validation] Rejecting draft with missing name placeholders: ${draft.title}`);
        return false;
      }
      return true;
    });

    return validatedDrafts;
  } catch (error) {
    console.error("Error generating follow-up drafts:", error);
    return drafts;
  }
}

export async function processInteraction(interactionId: string, ctx?: TenantContext): Promise<{
  success: boolean;
  extractedData?: AIExtractedData;
  draftsCreated?: number;
  signalCreated?: boolean;
  experiencesExtracted?: number;
  voicePatternsExtracted?: boolean;
  contentTopicsFound?: number;
  error?: string;
}> {
  try {
    const interaction = await storage.getInteraction(interactionId, ctx);
    if (!interaction) {
      return { success: false, error: "Interaction not found" };
    }

    const person = interaction.personId 
      ? (await storage.getPerson(interaction.personId, ctx)) ?? null
      : null;

    // Extract relationship intelligence
    const extractedData = await analyzeConversation(interaction, person);
    
    // Also extract Nathan's voice patterns from the transcript
    const transcript = interaction.transcript || interaction.summary || "";
    let voicePatternsExtracted = false;
    let contentTopicsFound = 0;
    let generatedSummary: string | undefined;
    
    if (transcript && transcript.length >= 200) {
      await extractVoicePatterns(transcript, interaction.title || interactionId, ctx);
      voicePatternsExtracted = true;
      
      // Extract content topics for Content Intelligence Center
      const topicResult = await extractContentTopics(transcript, interactionId, ctx);
      contentTopicsFound = topicResult.topicsFound;
      
      // Generate summary if one doesn't exist
      if (!interaction.summary || interaction.summary.trim().length === 0) {
        generatedSummary = await generateConversationSummary(transcript, person, extractedData);
      }
    }

    await storage.updateInteraction(interactionId, {
      aiExtractedData: extractedData,
      ...(generatedSummary && { summary: generatedSummary }),
    }, ctx);

    if (person && extractedData.processingStatus === "completed") {
      const personUpdates: Partial<Person> = {};

      if (extractedData.fordUpdates?.family && !person.fordFamily) {
        personUpdates.fordFamily = extractedData.fordUpdates.family;
      } else if (extractedData.fordUpdates?.family && person.fordFamily) {
        personUpdates.fordFamily = `${person.fordFamily}\n\n[${new Date().toLocaleDateString()}] ${extractedData.fordUpdates.family}`;
      }

      if (extractedData.fordUpdates?.occupation && !person.fordOccupation) {
        personUpdates.fordOccupation = extractedData.fordUpdates.occupation;
      } else if (extractedData.fordUpdates?.occupation && person.fordOccupation) {
        personUpdates.fordOccupation = `${person.fordOccupation}\n\n[${new Date().toLocaleDateString()}] ${extractedData.fordUpdates.occupation}`;
      }

      if (extractedData.fordUpdates?.recreation && !person.fordRecreation) {
        personUpdates.fordRecreation = extractedData.fordUpdates.recreation;
      } else if (extractedData.fordUpdates?.recreation && person.fordRecreation) {
        personUpdates.fordRecreation = `${person.fordRecreation}\n\n[${new Date().toLocaleDateString()}] ${extractedData.fordUpdates.recreation}`;
      }

      if (extractedData.fordUpdates?.dreams && !person.fordDreams) {
        personUpdates.fordDreams = extractedData.fordUpdates.dreams;
      } else if (extractedData.fordUpdates?.dreams && person.fordDreams) {
        personUpdates.fordDreams = `${person.fordDreams}\n\n[${new Date().toLocaleDateString()}] ${extractedData.fordUpdates.dreams}`;
      }

      // Helper to flatten nested objects/arrays into string array
      const flattenToStrings = (obj: any): string[] => {
        if (!obj) return [];
        if (Array.isArray(obj)) return obj.filter(x => typeof x === 'string');
        if (typeof obj === 'object') {
          const results: string[] = [];
          for (const value of Object.values(obj)) {
            if (typeof value === 'string' && value.length > 0) {
              results.push(value);
            } else if (Array.isArray(value)) {
              results.push(...value.filter(x => typeof x === 'string'));
            }
          }
          return results;
        }
        return [];
      };

      // Handle both lowercase and capitalized field names from AI
      const needsData = (extractedData as any).Needs || extractedData.needs;
      const offersData = (extractedData as any).Offers || extractedData.offers;
      
      const extractedNeeds = flattenToStrings(needsData);
      if (extractedNeeds.length > 0) {
        const existingNeeds = person.needs || [];
        personUpdates.needs = Array.from(new Set([...existingNeeds, ...extractedNeeds]));
      }

      const extractedOffers = flattenToStrings(offersData);
      if (extractedOffers.length > 0) {
        const existingOffers = person.offers || [];
        personUpdates.offers = Array.from(new Set([...existingOffers, ...extractedOffers]));
      }
      
      // Also extract profession from Offers if available
      if (offersData && typeof offersData === 'object') {
        const professionKeys = ['profession', 'Profession', 'TheirProfessionIndustryExpertise', 'ProfessionIndustryExpertise'];
        for (const key of professionKeys) {
          if ((offersData as any)[key]) {
            const profValue = (offersData as any)[key];
            if (typeof profValue === 'string' && !person.profession) {
              personUpdates.profession = profValue;
              break;
            } else if (Array.isArray(profValue) && profValue.length > 0 && !person.profession) {
              personUpdates.profession = profValue[0];
              break;
            }
          }
        }
      }

      if (Object.keys(personUpdates).length > 0) {
        await storage.updatePerson(person.id, personUpdates, ctx);
      }

      // Extract and save meaningful experiences from the conversation
      // This is append-only meaning capture, non-blocking on failures
      let savedExperiences: Experience[] = [];
      try {
        savedExperiences = await createAndSaveExperiences(interaction, person, ctx);
        if (savedExperiences.length > 0) {
          console.log(`[Experience] Extracted ${savedExperiences.length} experience(s) for ${person.name}`);
        }
      } catch (e) {
        console.warn('[Experience] Experience extraction failed (non-blocking):', e);
      }

      // Create Follow-Up Signal instead of auto-generating drafts
      // Only one active signal per person - check if one already exists
      const existingSignal = await storage.getFollowUpSignalByPerson(person.id, ctx);
      let signalCreated = false;
      
      if (!existingSignal) {
        // Pass experiences to signal creation for meaning-based ranking
        const signal = await createFollowUpSignal(interaction, person, extractedData, ctx, savedExperiences);
        if (signal) {
          await storage.createFollowUpSignal(signal, ctx);
          signalCreated = true;
        }
      }

      return {
        success: true,
        extractedData,
        draftsCreated: 0, // No longer auto-generating drafts
        signalCreated,
        experiencesExtracted: savedExperiences.length,
        voicePatternsExtracted,
        contentTopicsFound,
      };
    }

    return {
      success: true,
      extractedData,
      draftsCreated: 0,
      voicePatternsExtracted,
      contentTopicsFound,
    };
  } catch (error) {
    console.error("Error processing interaction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function findReferralMatches(personId: string): Promise<{
  person: Person;
  matchType: "need_to_offer" | "offer_to_need";
  matchReason: string;
}[]> {
  const person = await storage.getPerson(personId);
  if (!person) return [];

  const allPeople = await storage.getAllPeople();
  const matches: {
    person: Person;
    matchType: "need_to_offer" | "offer_to_need";
    matchReason: string;
  }[] = [];

  const personNeeds = person.needs || [];
  const personOffers = person.offers || [];

  for (const other of allPeople) {
    if (other.id === personId) continue;

    const otherNeeds = other.needs || [];
    const otherOffers = other.offers || [];

    for (const need of personNeeds) {
      const needLower = need.toLowerCase();
      for (const offer of otherOffers) {
        if (offer.toLowerCase().includes(needLower) || needLower.includes(offer.toLowerCase())) {
          matches.push({
            person: other,
            matchType: "need_to_offer",
            matchReason: `${person.name} needs "${need}" and ${other.name} offers "${offer}"`,
          });
        }
      }
      if (other.profession && other.profession.toLowerCase().includes(needLower)) {
        matches.push({
          person: other,
          matchType: "need_to_offer",
          matchReason: `${person.name} needs "${need}" and ${other.name} is a ${other.profession}`,
        });
      }
    }

    for (const offer of personOffers) {
      const offerLower = offer.toLowerCase();
      for (const need of otherNeeds) {
        if (need.toLowerCase().includes(offerLower) || offerLower.includes(need.toLowerCase())) {
          matches.push({
            person: other,
            matchType: "offer_to_need",
            matchReason: `${person.name} offers "${offer}" and ${other.name} needs "${need}"`,
          });
        }
      }
    }
  }

  return matches;
}

export type CoachingAnalysis = {
  overallScore: number;
  listeningScore: number;
  questioningScore: number;
  fordCoverage: number;
  strengths: string[];
  improvements: string[];
  missedOpportunities: string[];
  suggestedQuestions: string[];
  keyMoments: {
    timestamp?: string;
    type: "good" | "missed" | "improvement";
    description: string;
  }[];
  analyzedAt: string;
};

export async function analyzeConversationForCoaching(
  interaction: Interaction,
  person: Person | null
): Promise<CoachingAnalysis> {
  const openai = new OpenAI();
  
  const fordNotes = person
    ? [
        person.fordFamily && `Family: ${person.fordFamily}`,
        person.fordOccupation && `Occupation: ${person.fordOccupation}`,
        person.fordRecreation && `Recreation: ${person.fordRecreation}`,
        person.fordDreams && `Dreams: ${person.fordDreams}`,
      ].filter(Boolean).join(', ') || 'None recorded'
    : 'None recorded';
  
  const personContext = person
    ? `Contact: ${person.name}${person.profession ? ` (${person.profession})` : ''}
FORD Notes: ${fordNotes}
Relationship: ${person.segment || 'Unknown'}`
    : 'Unknown contact';

  const prompt = `You are a sales and relationship-building coach analyzing a real estate professional's conversation.

CONTEXT:
${personContext}

CONVERSATION TYPE: ${interaction.type}
${interaction.title ? `TITLE: ${interaction.title}` : ''}

TRANSCRIPT:
${interaction.transcript}

Analyze this conversation using relationship-based selling principles. Evaluate:

1. LISTENING QUALITY (0-100):
   - Did they let the other person talk more than themselves?
   - Did they ask follow-up questions based on what was said?
   - Did they avoid interrupting?

2. QUESTIONING TECHNIQUE (0-100):
   - Did they use open-ended questions vs closed questions?
   - Did they probe deeper into important topics?
   - Did they use questions to understand needs and motivations?

3. FORD COVERAGE (0-100):
   - Family: Did they discuss family topics?
   - Occupation: Did they explore work/career?
   - Recreation: Did they discuss hobbies/interests?
   - Dreams: Did they ask about goals/aspirations?

4. IDENTIFY:
   - 3-5 specific things they did well (with examples from transcript)
   - 2-4 specific areas for improvement
   - 2-3 missed opportunities where they could have asked better questions
   - 4-6 specific questions they could have asked instead

5. KEY MOMENTS:
   - Highlight 3-5 specific moments that were "good", "missed", or "improvement" opportunities

Respond in JSON format:
{
  "overallScore": <0-100>,
  "listeningScore": <0-100>,
  "questioningScore": <0-100>,
  "fordCoverage": <0-100>,
  "strengths": ["strength 1", "strength 2", ...],
  "improvements": ["improvement 1", "improvement 2", ...],
  "missedOpportunities": ["missed 1", "missed 2", ...],
  "suggestedQuestions": ["question 1", "question 2", ...],
  "keyMoments": [
    {"type": "good|missed|improvement", "description": "..."},
    ...
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert sales coach specializing in relationship-based selling. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const analysis = JSON.parse(content);
    
    return {
      overallScore: Math.round(analysis.overallScore || 0),
      listeningScore: Math.round(analysis.listeningScore || 0),
      questioningScore: Math.round(analysis.questioningScore || 0),
      fordCoverage: Math.round(analysis.fordCoverage || 0),
      strengths: analysis.strengths || [],
      improvements: analysis.improvements || [],
      missedOpportunities: analysis.missedOpportunities || [],
      suggestedQuestions: analysis.suggestedQuestions || [],
      keyMoments: (analysis.keyMoments || []).map((m: any) => ({
        type: m.type || "improvement",
        description: m.description || "",
        timestamp: m.timestamp,
      })),
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error analyzing conversation for coaching:", error);
    throw error;
  }
}
