import { storage, TenantContext } from "./storage";
import { FollowUpSignal, Person, InsertGeneratedDraft } from "@shared/schema";
import { openai } from "./ai/trackedOpenAI";

type DraftType = 'text' | 'email' | 'handwritten_note';

export async function generateFollowUpDraftFromSignal(
  signal: FollowUpSignal,
  person: Person,
  draftType: DraftType,
  ctx?: TenantContext
): Promise<void> {
  const firstName = person.name?.split(' ')[0] || 'there';
  
  const interactionContext = signal.interactionId 
    ? await storage.getInteraction(signal.interactionId, ctx)
    : null;
  
  const recentInteractions = await storage.getInteractionsByPerson(person.id, ctx);
  const lastInteraction = recentInteractions[0];
  
  const contextSummary = interactionContext?.summary || lastInteraction?.summary || signal.reasoning;
  
  try {
    if (draftType === 'text') {
      const draft = await generateTextDraft(person, firstName, contextSummary);
      await storage.createGeneratedDraft({
        personId: person.id,
        interactionId: signal.interactionId,
        type: 'text',
        title: `Text to ${firstName}`,
        content: draft,
        status: 'pending',
        metadata: { 
          signalId: signal.id,
          signalReasoning: signal.reasoning
        }
      }, ctx);
    } else if (draftType === 'email') {
      const { subject, body } = await generateEmailDraft(person, firstName, contextSummary);
      await storage.createGeneratedDraft({
        personId: person.id,
        interactionId: signal.interactionId,
        type: 'email',
        title: subject,
        content: body,
        status: 'pending',
        metadata: { 
          subject,
          signalId: signal.id,
          signalReasoning: signal.reasoning
        }
      }, ctx);
    } else if (draftType === 'handwritten_note') {
      const note = await generateHandwrittenNoteDraft(person, firstName, contextSummary);
      await storage.createGeneratedDraft({
        personId: person.id,
        interactionId: signal.interactionId,
        type: 'handwritten_note',
        title: `Note to ${firstName}`,
        content: note,
        status: 'pending',
        metadata: { 
          signalId: signal.id,
          signalReasoning: signal.reasoning
        }
      }, ctx);
    }
  } catch (error: any) {
    console.error(`Failed to generate ${draftType} draft for signal:`, error.message);
    throw error;
  }
}

async function generateTextDraft(
  person: Person,
  firstName: string,
  context: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional real estate agent drafting casual text messages to clients and contacts. 
        
Generate a SHORT, friendly text message (1-3 sentences max) that:
- Sounds natural and casual, like a real text
- Has a soft call-to-action (not pushy)
- No formal signature or greeting like "Dear" or "Best regards"
- Can include simple emoji if appropriate (1 max)
- Doesn't sound like marketing
- Just starts talking, no "Hi [Name]," unless it flows naturally

Example good texts:
- "Hey! Was thinking about our conversation the other day. Want to grab coffee this week to catch up?"
- "Quick thought - I just drove past that property on Oak St. Still interested in that neighborhood?"
- "Just wanted to say congrats again on the new job! Let me know if you need any recommendations for the area."`
      },
      {
        role: "user",
        content: `Contact: ${person.name}
Context from recent interaction: ${context}

Generate a casual follow-up text message.`
      }
    ],
    temperature: 0.8,
    max_tokens: 200
  });

  return response.choices[0]?.message?.content?.trim() || `Hey ${firstName}! Wanted to follow up - let me know if you'd like to connect soon.`;
}

async function generateEmailDraft(
  person: Person,
  firstName: string,
  context: string
): Promise<{ subject: string; body: string }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional real estate agent drafting follow-up emails to clients and contacts.

Generate a professional but warm email that:
- Has a clear, specific subject line
- Opens with a personal touch referencing the recent interaction
- Is concise (3-5 paragraphs max)
- Has a soft call-to-action
- Signs off professionally

Return JSON with "subject" and "body" fields.`
      },
      {
        role: "user",
        content: `Contact: ${person.name}
Context from recent interaction: ${context}

Generate a follow-up email.`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 500
  });

  try {
    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        subject: parsed.subject || `Following up - ${firstName}`,
        body: parsed.body || `Hi ${firstName},\n\nJust wanted to follow up on our recent conversation.\n\nBest regards`
      };
    }
  } catch (e) {
    console.error("Failed to parse email draft response:", e);
  }
  
  return {
    subject: `Following up - ${firstName}`,
    body: `Hi ${firstName},\n\nJust wanted to follow up on our recent conversation. Let me know if you'd like to connect.\n\nBest regards`
  };
}

async function generateHandwrittenNoteDraft(
  person: Person,
  firstName: string,
  context: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional real estate agent drafting a handwritten thank-you note.

Generate a SHORT, sincere handwritten note (3-5 sentences) that:
- Feels personal and genuine
- References something specific from the interaction
- Expresses appreciation
- Leaves a positive impression
- Is brief enough to write by hand on a card`
      },
      {
        role: "user",
        content: `Contact: ${person.name}
Context from recent interaction: ${context}

Generate a handwritten thank-you note.`
      }
    ],
    temperature: 0.7,
    max_tokens: 200
  });

  return response.choices[0]?.message?.content?.trim() || 
    `${firstName} - \n\nThank you for taking the time to meet with me. I really enjoyed our conversation and look forward to staying in touch.\n\nWarmly`;
}
