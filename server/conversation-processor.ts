import OpenAI from "openai";
import { storage } from "./storage";
import type { Interaction, Person, AIExtractedData, InsertGeneratedDraft, VoiceProfile, ContentTopic } from "@shared/schema";

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

const SYSTEM_PROMPT = `You are an intelligent relationship assistant for a real estate professional following the Ninja Selling methodology. Your job is to analyze conversation transcripts and extract valuable relationship intelligence.

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
  source?: string
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
            await storage.upsertVoicePattern(category, value, 'conversation', source);
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
  interactionId: string
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
    const existingTopics = await storage.getAllContentTopics();
    
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
          interactionId
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
        });
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

  context += `\n\nIMPORTANT: Match Nathan's natural speaking style. Use his typical expressions and tone. The content should sound authentically like him.`;
  
  return context;
}

export async function generateFollowUpDrafts(
  interaction: Interaction,
  person: Person,
  extractedData: AIExtractedData
): Promise<InsertGeneratedDraft[]> {
  const drafts: InsertGeneratedDraft[] = [];
  
  const transcript = interaction.transcript || interaction.summary || "";
  if (!transcript || transcript.length < 50) {
    return drafts;
  }

  // Get Nathan's voice profile to personalize drafts
  const voiceContext = await getVoiceContext();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are an assistant helping Nathan, a real estate professional, write thoughtful follow-up communications. Generate genuine, warm content that references specific details from conversations.

For each conversation, generate:

1. **Thank-you Email** (professional but warm, 2-3 paragraphs)

2. **Handwritten Note** - CRITICAL GUIDELINES:
   - Start with ONE of these openers: "Thank you...", "It was great seeing you...", or "Congratulations..."
   - Keep it 2-3 sentences ONLY (this must fit on a small note card)
   - Focus entirely on the OTHER PERSON (not the writer)
   - Highlight something positive you admire about them based on the conversation
   - Always end with a P.S. that includes a soft call to action (e.g., "P.S. Let's grab coffee soon!" or "P.S. I'll send that info over this week!")
   
   Example format:
   "Thank you for sharing about [specific thing]. I really admire [positive quality about them].
   
   P.S. [Soft call to action]!"

3. **Tasks** - Any follow-up tasks based on action items discussed

Return JSON with:
{
  "email": {
    "subject": "...",
    "body": "..."
  },
  "handwrittenNote": "...",
  "tasks": [
    { "title": "...", "priority": "high/medium/low" }
  ]
}${voiceContext}`
        },
        {
          role: "user",
          content: `Person: ${person.name}
Interaction Type: ${interaction.type}
Date: ${new Date(interaction.occurredAt).toLocaleDateString()}
Key Topics: ${extractedData.keyTopics?.join(", ") || "General conversation"}
Action Items Discussed: ${extractedData.actionItems?.join(", ") || "None specific"}

Conversation Summary/Transcript:
${transcript.slice(0, 8000)}

Generate follow-up content for this interaction.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return drafts;

    const generated = JSON.parse(content);

    if (generated.email) {
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

    if (generated.handwrittenNote) {
      drafts.push({
        personId: person.id,
        interactionId: interaction.id,
        type: "handwritten_note",
        title: `Note for ${person.name}`,
        content: generated.handwrittenNote,
        status: "pending",
        metadata: {},
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

    return drafts;
  } catch (error) {
    console.error("Error generating follow-up drafts:", error);
    return drafts;
  }
}

export async function processInteraction(interactionId: string): Promise<{
  success: boolean;
  extractedData?: AIExtractedData;
  draftsCreated?: number;
  voicePatternsExtracted?: boolean;
  contentTopicsFound?: number;
  error?: string;
}> {
  try {
    const interaction = await storage.getInteraction(interactionId);
    if (!interaction) {
      return { success: false, error: "Interaction not found" };
    }

    const person = interaction.personId 
      ? (await storage.getPerson(interaction.personId)) ?? null
      : null;

    // Extract relationship intelligence
    const extractedData = await analyzeConversation(interaction, person);
    
    // Also extract Nathan's voice patterns from the transcript
    const transcript = interaction.transcript || interaction.summary || "";
    let voicePatternsExtracted = false;
    let contentTopicsFound = 0;
    let generatedSummary: string | undefined;
    
    if (transcript && transcript.length >= 200) {
      await extractVoicePatterns(transcript, interaction.title || interactionId);
      voicePatternsExtracted = true;
      
      // Extract content topics for Content Intelligence Center
      const topicResult = await extractContentTopics(transcript, interactionId);
      contentTopicsFound = topicResult.topicsFound;
      
      // Generate summary if one doesn't exist
      if (!interaction.summary || interaction.summary.trim().length === 0) {
        generatedSummary = await generateConversationSummary(transcript, person, extractedData);
      }
    }

    await storage.updateInteraction(interactionId, {
      aiExtractedData: extractedData,
      ...(generatedSummary && { summary: generatedSummary }),
    });

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
        await storage.updatePerson(person.id, personUpdates);
      }

      const drafts = await generateFollowUpDrafts(interaction, person, extractedData);
      for (const draft of drafts) {
        await storage.createGeneratedDraft(draft);
      }

      return {
        success: true,
        extractedData,
        draftsCreated: drafts.length,
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
