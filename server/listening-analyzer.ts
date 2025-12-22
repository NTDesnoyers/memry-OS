import OpenAI from "openai";
import { storage } from "./storage";
import type { InsertListeningAnalysis, InsertCoachingInsight } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LISTENING_ANALYSIS_PROMPT = `You are analyzing a conversation transcript to evaluate listening skills using NVC (Nonviolent Communication) and Question-Based principles as internal lenses.

Analyze the HOST's (Nathan's) responses - NOT the guest's. Focus on how Nathan listens and responds.

Extract these dimensions:

1. OBSERVATION VS INTERPRETATION
- Observations: Neutral reflections of what was said ("You mentioned X changed...")
- Interpretations: Jumping to meaning/conclusions ("So the problem is...")
Count each and provide examples.

2. FEELING ACKNOWLEDGMENT
- Count times Nathan names/reflects emotion (explicit or implicit)
- Examples: "That sounds stressful", "It seems like you're feeling unsure"
- Note if emotion is acknowledged BEFORE offering solutions

3. NEED CLARIFICATION
- Count times Nathan helps surface underlying needs (clarity, certainty, safety, timing, control, reassurance)
- Examples: "What's most important to you right now?", "What are you hoping this solves?"
- Count times needs were assumed without checking

4. REQUEST SHAPING
- Count times Nathan confirms what the person is actually asking for
- Examples: "What would be most helpful right now?", "Are you looking for advice or just to talk this through?"

5. QUESTION CLASSIFICATION
Classify Nathan's questions into:
- Exploratory: Opens space ("Can you tell me more about that?")
- Clarifying: Refines understanding ("When you say X, what does that look like?")
- Feeling-based: NVC-aligned ("How did that feel when it happened?")
- Need-based: NVC-aligned ("What matters most to you here?")
- Solution-leading: Premature ("Have you considered doing X?")
- Closed: Yes/No questions that limit depth

6. OVERALL SCORES (1-10)
- Conversation Depth: How deep did the conversation go?
- Trust Building: How much trust was built through listening?

Return JSON:
{
  "observationCount": number,
  "interpretationCount": number,
  "observationExamples": ["quote1", "quote2"],
  "interpretationExamples": ["quote1", "quote2"],
  "feelingAcknowledgments": number,
  "feelingExamples": ["quote1"],
  "emotionBeforeSolution": boolean,
  "needClarifications": number,
  "needExamples": ["quote1"],
  "assumedNeeds": number,
  "requestConfirmations": number,
  "requestExamples": ["quote1"],
  "exploratoryQuestions": number,
  "clarifyingQuestions": number,
  "feelingQuestions": number,
  "needQuestions": number,
  "solutionLeadingQuestions": number,
  "closedQuestions": number,
  "questionExamples": [{"type": "exploratory", "question": "..."}],
  "conversationDepthScore": number,
  "trustBuildingScore": number
}`;

const COACHING_GENERATION_PROMPT = `Based on listening analysis patterns, generate coaching insights.

Rules:
- Frame as OBSERVATIONS and CHOICES, never corrections
- No scores, no NVC jargon, no sales language
- Use language like "You tend to...", "Your strongest conversations happen when..."
- Suggest ONE small change at a time (micro-shifts)
- For question swaps, use format: "When you ask X instead of Y, conversations go deeper"

Types of insights to generate:

1. MICRO SHIFTS (small behavioral suggestions)
Examples:
- "Try reflecting what you hear before offering advice."
- "Try asking what they need before solving."
- "Try naming the emotion you hear and pausing."

2. QUESTION SWAPS (very powerful)
Examples:
- "When you ask 'What's worrying you most?' instead of offering reassurance, people open up more."
- "When you ask 'What would be most helpful right now?' instead of giving advice, trust increases."

3. PATTERN OBSERVATIONS (neutral observations about patterns)
Examples:
- "You often move into problem-solving before checking what the person actually needs."
- "When uncertainty shows up, you tend to skip reflecting emotion and go straight to answers."
- "Your strongest conversations happen when you clarify what the person is asking for before responding."

Return JSON array:
[
  {
    "type": "micro_shift" | "question_swap" | "pattern_observation",
    "category": "emotional_pacing" | "curiosity" | "need_clarification" | "request_shaping" | "observation",
    "insight": "The coaching suggestion in plain language",
    "originalBehavior": "What the user did (optional)",
    "suggestedBehavior": "What they could try (optional)",
    "confidenceScore": 1-100
  }
]`;

export interface ListeningAnalysisResult {
  observationCount: number;
  interpretationCount: number;
  observationExamples: string[];
  interpretationExamples: string[];
  feelingAcknowledgments: number;
  feelingExamples: string[];
  emotionBeforeSolution: boolean;
  needClarifications: number;
  needExamples: string[];
  assumedNeeds: number;
  requestConfirmations: number;
  requestExamples: string[];
  exploratoryQuestions: number;
  clarifyingQuestions: number;
  feelingQuestions: number;
  needQuestions: number;
  solutionLeadingQuestions: number;
  closedQuestions: number;
  questionExamples: Array<{ type: string; question: string }>;
  conversationDepthScore: number;
  trustBuildingScore: number;
}

export async function analyzeListening(
  interactionId: string,
  transcript: string
): Promise<ListeningAnalysisResult | null> {
  if (!transcript || transcript.length < 500) {
    console.log("Transcript too short for listening analysis");
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: LISTENING_ANALYSIS_PROMPT },
        {
          role: "user",
          content: `Analyze the listening skills in this conversation:

---
${transcript.slice(0, 20000)}
---

Focus on Nathan's (the host's) listening behaviors.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const analysis: ListeningAnalysisResult = JSON.parse(content);

    const insertData: InsertListeningAnalysis = {
      interactionId,
      observationCount: analysis.observationCount,
      interpretationCount: analysis.interpretationCount,
      observationExamples: analysis.observationExamples,
      interpretationExamples: analysis.interpretationExamples,
      feelingAcknowledgments: analysis.feelingAcknowledgments,
      feelingExamples: analysis.feelingExamples,
      emotionBeforeSolution: analysis.emotionBeforeSolution,
      needClarifications: analysis.needClarifications,
      needExamples: analysis.needExamples,
      assumedNeeds: analysis.assumedNeeds,
      requestConfirmations: analysis.requestConfirmations,
      requestExamples: analysis.requestExamples,
      exploratoryQuestions: analysis.exploratoryQuestions,
      clarifyingQuestions: analysis.clarifyingQuestions,
      feelingQuestions: analysis.feelingQuestions,
      needQuestions: analysis.needQuestions,
      solutionLeadingQuestions: analysis.solutionLeadingQuestions,
      closedQuestions: analysis.closedQuestions,
      questionExamples: analysis.questionExamples,
      conversationDepthScore: analysis.conversationDepthScore,
      trustBuildingScore: analysis.trustBuildingScore,
    };

    await storage.createListeningAnalysis(insertData);
    console.log(`Listening analysis saved for interaction ${interactionId}`);

    return analysis;
  } catch (error) {
    console.error("Error analyzing listening:", error);
    return null;
  }
}

export async function generateCoachingInsights(
  analysisData: ListeningAnalysisResult[],
  interactionIds: string[]
): Promise<InsertCoachingInsight[]> {
  if (analysisData.length === 0) {
    return [];
  }

  try {
    const aggregatedData = {
      totalConversations: analysisData.length,
      avgObservationRatio:
        analysisData.reduce(
          (sum, a) =>
            sum +
            (a.observationCount /
              (a.observationCount + a.interpretationCount + 1)),
          0
        ) / analysisData.length,
      avgFeelingAcknowledgments:
        analysisData.reduce((sum, a) => sum + a.feelingAcknowledgments, 0) /
        analysisData.length,
      avgNeedClarifications:
        analysisData.reduce((sum, a) => sum + a.needClarifications, 0) /
        analysisData.length,
      avgAssumedNeeds:
        analysisData.reduce((sum, a) => sum + a.assumedNeeds, 0) /
        analysisData.length,
      avgRequestConfirmations:
        analysisData.reduce((sum, a) => sum + a.requestConfirmations, 0) /
        analysisData.length,
      questionBreakdown: {
        exploratory:
          analysisData.reduce((sum, a) => sum + a.exploratoryQuestions, 0) /
          analysisData.length,
        clarifying:
          analysisData.reduce((sum, a) => sum + a.clarifyingQuestions, 0) /
          analysisData.length,
        feelingBased:
          analysisData.reduce((sum, a) => sum + a.feelingQuestions, 0) /
          analysisData.length,
        needBased:
          analysisData.reduce((sum, a) => sum + a.needQuestions, 0) /
          analysisData.length,
        solutionLeading:
          analysisData.reduce((sum, a) => sum + a.solutionLeadingQuestions, 0) /
          analysisData.length,
        closed:
          analysisData.reduce((sum, a) => sum + a.closedQuestions, 0) /
          analysisData.length,
      },
      avgDepthScore:
        analysisData.reduce((sum, a) => sum + (a.conversationDepthScore || 0), 0) /
        analysisData.length,
      avgTrustScore:
        analysisData.reduce((sum, a) => sum + (a.trustBuildingScore || 0), 0) /
        analysisData.length,
      exampleObservations: analysisData
        .flatMap((a) => a.observationExamples || [])
        .slice(0, 5),
      exampleInterpretations: analysisData
        .flatMap((a) => a.interpretationExamples || [])
        .slice(0, 5),
      exampleFeelingAcknowledgments: analysisData
        .flatMap((a) => a.feelingExamples || [])
        .slice(0, 5),
      exampleNeedClarifications: analysisData
        .flatMap((a) => a.needExamples || [])
        .slice(0, 5),
      exampleQuestions: analysisData
        .flatMap((a) => a.questionExamples || [])
        .slice(0, 10),
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: COACHING_GENERATION_PROMPT },
        {
          role: "user",
          content: `Generate coaching insights based on these listening patterns from ${aggregatedData.totalConversations} conversations:

Observation vs Interpretation Ratio: ${(aggregatedData.avgObservationRatio * 100).toFixed(1)}% observations
Average Feeling Acknowledgments per conversation: ${aggregatedData.avgFeelingAcknowledgments.toFixed(1)}
Average Need Clarifications: ${aggregatedData.avgNeedClarifications.toFixed(1)}
Average Assumed Needs: ${aggregatedData.avgAssumedNeeds.toFixed(1)}
Average Request Confirmations: ${aggregatedData.avgRequestConfirmations.toFixed(1)}

Question Types (avg per conversation):
- Exploratory: ${aggregatedData.questionBreakdown.exploratory.toFixed(1)}
- Clarifying: ${aggregatedData.questionBreakdown.clarifying.toFixed(1)}
- Feeling-based: ${aggregatedData.questionBreakdown.feelingBased.toFixed(1)}
- Need-based: ${aggregatedData.questionBreakdown.needBased.toFixed(1)}
- Solution-leading: ${aggregatedData.questionBreakdown.solutionLeading.toFixed(1)}
- Closed: ${aggregatedData.questionBreakdown.closed.toFixed(1)}

Average Conversation Depth Score: ${aggregatedData.avgDepthScore.toFixed(1)}/10
Average Trust Building Score: ${aggregatedData.avgTrustScore.toFixed(1)}/10

Example Observations: ${JSON.stringify(aggregatedData.exampleObservations)}
Example Interpretations: ${JSON.stringify(aggregatedData.exampleInterpretations)}
Example Feeling Acknowledgments: ${JSON.stringify(aggregatedData.exampleFeelingAcknowledgments)}
Example Need Clarifications: ${JSON.stringify(aggregatedData.exampleNeedClarifications)}
Example Questions: ${JSON.stringify(aggregatedData.exampleQuestions)}

Generate 3-5 coaching insights based on these patterns. Focus on the most impactful observations.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const insights: InsertCoachingInsight[] = (parsed.insights || parsed || []).map(
      (insight: {
        type: string;
        category: string;
        insight: string;
        originalBehavior?: string;
        suggestedBehavior?: string;
        confidenceScore?: number;
      }) => ({
        type: insight.type,
        category: insight.category,
        insight: insight.insight,
        originalBehavior: insight.originalBehavior,
        suggestedBehavior: insight.suggestedBehavior,
        supportingExamples: [],
        interactionIds,
        confidenceScore: insight.confidenceScore || 70,
        status: "active",
      })
    );

    for (const insight of insights) {
      await storage.createCoachingInsight(insight);
    }

    console.log(`Generated ${insights.length} coaching insights`);
    return insights;
  } catch (error) {
    console.error("Error generating coaching insights:", error);
    return [];
  }
}

export async function analyzeAllConversationsForListening(): Promise<{
  analyzed: number;
  insights: number;
}> {
  const interactions = await storage.getInteractionsWithTranscripts();
  const analysisResults: ListeningAnalysisResult[] = [];
  const interactionIds: string[] = [];
  let analyzed = 0;

  for (const interaction of interactions) {
    if (!interaction.transcript || interaction.transcript.length < 500) {
      continue;
    }

    const existing = await storage.getListeningAnalysisByInteraction(interaction.id);
    if (existing) {
      continue;
    }

    const result = await analyzeListening(interaction.id, interaction.transcript);
    if (result) {
      analysisResults.push(result);
      interactionIds.push(interaction.id);
      analyzed++;
    }

    if (analyzed >= 20) break;
  }

  let insightsCount = 0;
  if (analysisResults.length >= 3) {
    const insights = await generateCoachingInsights(analysisResults, interactionIds);
    insightsCount = insights.length;
  }

  return { analyzed, insights: insightsCount };
}
