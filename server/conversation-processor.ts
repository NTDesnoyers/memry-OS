import OpenAI from "openai";
import { storage } from "./storage";
import type { Interaction, Person, AIExtractedData, InsertGeneratedDraft } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are an assistant helping a real estate professional write thoughtful follow-up communications. Generate genuine, warm content that references specific details from conversations.

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
}`
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

    const extractedData = await analyzeConversation(interaction, person);

    await storage.updateInteraction(interactionId, {
      aiExtractedData: extractedData,
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
      };
    }

    return {
      success: true,
      extractedData,
      draftsCreated: 0,
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
