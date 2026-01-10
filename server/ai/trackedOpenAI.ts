import OpenAI from "openai";
import { storage, type TenantContext } from "../storage";
import { createLogger } from "../logger";
import type { InsertAiUsageLog } from "@shared/schema";

const logger = createLogger("TrackedOpenAI");

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-5": { input: 1500, output: 6000 },
  "gpt-4o": { input: 250, output: 1000 },
  "gpt-4o-mini": { input: 15, output: 60 },
  "gpt-4-turbo": { input: 1000, output: 3000 },
  "gpt-4.1": { input: 200, output: 800 },
  "gpt-4.1-mini": { input: 40, output: 160 },
  "gpt-4.1-nano": { input: 10, output: 40 },
  "o3-mini": { input: 110, output: 440 },
};

export interface TrackingContext {
  ctx?: TenantContext;
  userEmail?: string;
  feature: string;
}

async function logUsage(
  tracking: TrackingContext,
  model: string,
  promptTokens: number,
  completionTokens: number,
  durationMs: number,
  success: boolean,
  errorMessage?: string,
  metadata?: Record<string, unknown>
) {
  try {
    const costs = MODEL_COSTS[model] || MODEL_COSTS["gpt-4o"];
    const estimatedCost = Math.round(
      (promptTokens * costs.input + completionTokens * costs.output) / 1000
    );

    const usage: InsertAiUsageLog = {
      userId: tracking.ctx?.userId || null,
      userEmail: tracking.userEmail || tracking.ctx?.email || null,
      feature: tracking.feature,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCost,
      durationMs,
      success,
      errorMessage: errorMessage || null,
      metadata: metadata || null,
    };

    await storage.logAiUsage(usage);
    logger.debug(
      `${tracking.feature}: ${model} ${promptTokens + completionTokens} tokens, cost: ${estimatedCost} micro-cents`
    );
  } catch (error: any) {
    logger.error(`Failed to log AI usage: ${error.message}`);
  }
}

const baseOpenai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function trackedChatCompletion(
  tracking: TrackingContext,
  params: OpenAI.ChatCompletionCreateParamsNonStreaming
): Promise<OpenAI.ChatCompletion> {
  const start = Date.now();
  let success = true;
  let errorMessage: string | undefined;

  try {
    const result = await baseOpenai.chat.completions.create(params);
    const durationMs = Date.now() - start;

    await logUsage(
      tracking,
      params.model,
      result.usage?.prompt_tokens || 0,
      result.usage?.completion_tokens || 0,
      durationMs,
      true
    );

    return result;
  } catch (error: any) {
    success = false;
    errorMessage = error.message;
    const durationMs = Date.now() - start;

    await logUsage(tracking, params.model, 0, 0, durationMs, false, errorMessage);

    throw error;
  }
}

export async function* trackedChatCompletionStream(
  tracking: TrackingContext,
  params: OpenAI.ChatCompletionCreateParamsStreaming
): AsyncGenerator<OpenAI.ChatCompletionChunk> {
  const start = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    const stream = await baseOpenai.chat.completions.create(params);

    for await (const chunk of stream) {
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens || 0;
        completionTokens = chunk.usage.completion_tokens || 0;
      }
      yield chunk;
    }

    const durationMs = Date.now() - start;

    if (promptTokens === 0) {
      const inputText = params.messages
        .map((m) => (typeof m.content === "string" ? m.content : ""))
        .join(" ");
      promptTokens = Math.ceil(inputText.length / 4);
    }

    await logUsage(
      tracking,
      params.model,
      promptTokens,
      completionTokens,
      durationMs,
      true
    );
  } catch (error: any) {
    const durationMs = Date.now() - start;
    await logUsage(tracking, params.model, 0, 0, durationMs, false, error.message);
    throw error;
  }
}

export const openai = baseOpenai;
