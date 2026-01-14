import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DateInferenceResult {
  inferredDate: Date | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export async function inferConversationDate(
  transcript: string,
  anchorDate: Date = new Date()
): Promise<DateInferenceResult> {
  if (!transcript || transcript.length < 50) {
    return { inferredDate: null, confidence: 'low', reasoning: 'Transcript too short' };
  }

  const snippet = transcript.slice(0, 2000);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You analyze conversation transcripts to determine WHEN the conversation occurred.

CRITICAL DISTINCTION:
- "Conversation occurred date" = when THIS conversation happened (what we want)
- "Events mentioned" = things discussed in the conversation (ignore these for dating)

Examples:
- "I talked to him yesterday about..." → Conversation was YESTERDAY
- "He told me last night that..." → Conversation was LAST NIGHT  
- "He said he bought a house last week" → This is a mentioned event, NOT when the conversation happened

Look for phrases like:
- "yesterday", "last night", "this morning", "earlier today"
- "on Monday", "last Tuesday", "this past weekend"
- Explicit dates mentioned at start/intro

The anchor date (today) is: ${anchorDate.toISOString().split('T')[0]}

Return JSON:
{
  "daysAgo": number | null,
  "confidence": "high" | "medium" | "low",
  "reasoning": "brief explanation"
}

- daysAgo: 0 for today, 1 for yesterday, 2 for two days ago, etc. null if can't determine
- confidence: high = explicit statement, medium = implied, low = uncertain
- reasoning: why you chose this date`
        },
        {
          role: "user",
          content: `Analyze this transcript and determine when the conversation occurred:\n\n${snippet}`
        }
      ],
      temperature: 0.3,
      max_tokens: 150,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { inferredDate: null, confidence: 'low', reasoning: 'No response from AI' };
    }

    const parsed = JSON.parse(content);
    
    if (parsed.daysAgo === null || parsed.daysAgo === undefined) {
      return { 
        inferredDate: null, 
        confidence: parsed.confidence || 'low',
        reasoning: parsed.reasoning || 'Could not determine date'
      };
    }

    const inferredDate = new Date(anchorDate);
    inferredDate.setDate(inferredDate.getDate() - parsed.daysAgo);
    inferredDate.setHours(12, 0, 0, 0);

    return {
      inferredDate,
      confidence: parsed.confidence || 'medium',
      reasoning: parsed.reasoning || `Inferred ${parsed.daysAgo} days ago`
    };
  } catch (error) {
    console.warn('[DateInference] Failed to infer date:', error);
    return { inferredDate: null, confidence: 'low', reasoning: 'Inference failed' };
  }
}
