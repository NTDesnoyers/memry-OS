import { db } from "./db";
import { aiUsageLogs, aiCostDailySummary } from "@shared/schema";
import { eq, and, gte, lte, lt, sql } from "drizzle-orm";
import { createLogger } from "./logger";
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { exportWeeklyCostSummary, isGoogleSheetsConnected } from "./google-sheets";

const logger = createLogger("CostAggregation");

export async function aggregateDailyCosts(dateStr?: string) {
  const targetDate = dateStr 
    ? new Date(dateStr) 
    : subDays(new Date(), 1);
  
  const dateKey = format(targetDate, "yyyy-MM-dd");
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  logger.info(`Aggregating costs for ${dateKey}`);

  try {
    const logs = await db.select()
      .from(aiUsageLogs)
      .where(
        and(
          gte(aiUsageLogs.createdAt, dayStart),
          lt(aiUsageLogs.createdAt, dayEnd)
        )
      );

    if (logs.length === 0) {
      logger.info(`No usage logs found for ${dateKey}`);
      return;
    }

    const userSummaries = new Map<string, {
      userId: string | null;
      userEmail: string | null;
      totalPromptTokens: number;
      totalCompletionTokens: number;
      totalTokens: number;
      totalCost: number;
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      featureBreakdown: Record<string, { requests: number; tokens: number; cost: number }>;
      modelBreakdown: Record<string, { requests: number; tokens: number; cost: number }>;
    }>();

    for (const log of logs) {
      const key = log.userId || log.userEmail || "anonymous";
      
      if (!userSummaries.has(key)) {
        userSummaries.set(key, {
          userId: log.userId,
          userEmail: log.userEmail,
          totalPromptTokens: 0,
          totalCompletionTokens: 0,
          totalTokens: 0,
          totalCost: 0,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          featureBreakdown: {},
          modelBreakdown: {},
        });
      }

      const summary = userSummaries.get(key)!;
      
      summary.totalPromptTokens += log.promptTokens;
      summary.totalCompletionTokens += log.completionTokens;
      summary.totalTokens += log.totalTokens;
      summary.totalCost += log.estimatedCost;
      summary.totalRequests += 1;
      
      if (log.success) {
        summary.successfulRequests += 1;
      } else {
        summary.failedRequests += 1;
      }

      if (!summary.featureBreakdown[log.feature]) {
        summary.featureBreakdown[log.feature] = { requests: 0, tokens: 0, cost: 0 };
      }
      summary.featureBreakdown[log.feature].requests += 1;
      summary.featureBreakdown[log.feature].tokens += log.totalTokens;
      summary.featureBreakdown[log.feature].cost += log.estimatedCost;

      if (!summary.modelBreakdown[log.model]) {
        summary.modelBreakdown[log.model] = { requests: 0, tokens: 0, cost: 0 };
      }
      summary.modelBreakdown[log.model].requests += 1;
      summary.modelBreakdown[log.model].tokens += log.totalTokens;
      summary.modelBreakdown[log.model].cost += log.estimatedCost;
    }

    for (const [, summary] of Array.from(userSummaries.entries())) {
      const whereConditions = [eq(aiCostDailySummary.date, dateKey)];
      
      if (summary.userId) {
        whereConditions.push(eq(aiCostDailySummary.userId, summary.userId));
      } else {
        whereConditions.push(sql`${aiCostDailySummary.userId} IS NULL`);
        if (summary.userEmail) {
          whereConditions.push(eq(aiCostDailySummary.userEmail, summary.userEmail));
        } else {
          whereConditions.push(sql`${aiCostDailySummary.userEmail} IS NULL`);
        }
      }

      const existingRecord = await db.select()
        .from(aiCostDailySummary)
        .where(and(...whereConditions))
        .limit(1);

      if (existingRecord.length > 0) {
        await db.update(aiCostDailySummary)
          .set({
            totalPromptTokens: summary.totalPromptTokens,
            totalCompletionTokens: summary.totalCompletionTokens,
            totalTokens: summary.totalTokens,
            totalCost: summary.totalCost,
            totalRequests: summary.totalRequests,
            successfulRequests: summary.successfulRequests,
            failedRequests: summary.failedRequests,
            featureBreakdown: summary.featureBreakdown,
            modelBreakdown: summary.modelBreakdown,
            updatedAt: new Date(),
          })
          .where(eq(aiCostDailySummary.id, existingRecord[0].id));
      } else {
        await db.insert(aiCostDailySummary).values({
          date: dateKey,
          userId: summary.userId,
          userEmail: summary.userEmail,
          totalPromptTokens: summary.totalPromptTokens,
          totalCompletionTokens: summary.totalCompletionTokens,
          totalTokens: summary.totalTokens,
          totalCost: summary.totalCost,
          totalRequests: summary.totalRequests,
          successfulRequests: summary.successfulRequests,
          failedRequests: summary.failedRequests,
          featureBreakdown: summary.featureBreakdown,
          modelBreakdown: summary.modelBreakdown,
        });
      }
    }

    logger.info(`Aggregated ${logs.length} logs for ${userSummaries.size} user(s) on ${dateKey}`);
  } catch (error: any) {
    logger.error(`Error aggregating costs for ${dateKey}: ${error.message}`);
    throw error;
  }
}

export async function exportWeeklyToSheets() {
  const connected = await isGoogleSheetsConnected();
  if (!connected) {
    logger.info("Google Sheets not connected - skipping weekly export");
    return;
  }

  const lastWeekEnd = endOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 });
  
  const startDate = format(lastWeekStart, "yyyy-MM-dd");
  const endDate = format(lastWeekEnd, "yyyy-MM-dd");
  
  logger.info(`Exporting weekly costs from ${startDate} to ${endDate}`);

  try {
    const summaries = await db.select()
      .from(aiCostDailySummary)
      .where(
        and(
          gte(aiCostDailySummary.date, startDate),
          lte(aiCostDailySummary.date, endDate)
        )
      );

    if (summaries.length === 0) {
      logger.info("No cost summaries found for last week");
      return;
    }

    await exportWeeklyCostSummary(summaries);
    logger.info(`Weekly export complete: ${summaries.length} records`);
  } catch (error: any) {
    logger.error(`Weekly export failed: ${error.message}`);
  }
}

export function startCostAggregationScheduler() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 5, 0, 0);
  
  const msUntilMidnight = midnight.getTime() - now.getTime();
  
  logger.info(`Cost aggregation scheduler starting, first run in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);

  setTimeout(() => {
    aggregateDailyCosts().catch(err => logger.error(`Aggregation failed: ${err.message}`));
    
    setInterval(() => {
      aggregateDailyCosts().catch(err => logger.error(`Aggregation failed: ${err.message}`));
      
      if (new Date().getDay() === 1) {
        exportWeeklyToSheets().catch(err => logger.error(`Weekly export failed: ${err.message}`));
      }
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);

  if (now.getHours() >= 1) {
    logger.info("Running initial aggregation for yesterday's data");
    aggregateDailyCosts().catch(err => logger.error(`Initial aggregation failed: ${err.message}`));
  }
}
