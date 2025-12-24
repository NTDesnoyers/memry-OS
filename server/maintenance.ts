import { db } from './db';
import { systemEvents, agentActions } from '@shared/schema';
import { lt, sql } from 'drizzle-orm';
import { createLogger } from './logger';

const logger = createLogger('Maintenance');

interface CleanupResult {
  eventsDeleted: number;
  actionsDeleted: number;
  archivedTo?: string;
}

export async function cleanupOldEvents(retentionDays: number = 7): Promise<CleanupResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  logger.info(`Cleaning up events older than ${retentionDays} days (before ${cutoffDate.toISOString()})`);

  const eventsResult = await db.delete(systemEvents)
    .where(lt(systemEvents.createdAt, cutoffDate))
    .returning({ id: systemEvents.id });

  const actionsResult = await db.delete(agentActions)
    .where(lt(agentActions.createdAt, cutoffDate))
    .returning({ id: agentActions.id });

  const result = {
    eventsDeleted: eventsResult.length,
    actionsDeleted: actionsResult.length,
  };

  logger.info(`Cleanup complete`, result);
  return result;
}

export async function getEventStats(): Promise<{
  systemEvents: { total: number; last24h: number; last7d: number };
  agentActions: { total: number; last24h: number; last7d: number };
}> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const eventsResult = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE created_at >= ${oneDayAgo}) as last_24h,
      COUNT(*) FILTER (WHERE created_at >= ${sevenDaysAgo}) as last_7d
    FROM system_events
  `);
  const eventsStats = eventsResult.rows[0] as { total: string; last_24h: string; last_7d: string } | undefined;

  const actionsResult = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE created_at >= ${oneDayAgo}) as last_24h,
      COUNT(*) FILTER (WHERE created_at >= ${sevenDaysAgo}) as last_7d
    FROM agent_actions
  `);
  const actionsStats = actionsResult.rows[0] as { total: string; last_24h: string; last_7d: string } | undefined;

  return {
    systemEvents: {
      total: parseInt(eventsStats?.total || '0'),
      last24h: parseInt(eventsStats?.last_24h || '0'),
      last7d: parseInt(eventsStats?.last_7d || '0'),
    },
    agentActions: {
      total: parseInt(actionsStats?.total || '0'),
      last24h: parseInt(actionsStats?.last_24h || '0'),
      last7d: parseInt(actionsStats?.last_7d || '0'),
    },
  };
}

export async function vacuumTables(): Promise<void> {
  logger.info('Running VACUUM ANALYZE on event tables...');
  await db.execute(sql`VACUUM ANALYZE system_events`);
  await db.execute(sql`VACUUM ANALYZE agent_actions`);
  logger.info('VACUUM complete');
}

let cleanupInterval: NodeJS.Timeout | null = null;

export function startMaintenanceScheduler(retentionDays: number = 7): void {
  logger.info(`Starting maintenance scheduler (retention: ${retentionDays} days)`);
  
  cleanupInterval = setInterval(async () => {
    try {
      await cleanupOldEvents(retentionDays);
    } catch (error) {
      logger.error('Maintenance cleanup failed', error);
    }
  }, 24 * 60 * 60 * 1000);
  
  setTimeout(async () => {
    try {
      await cleanupOldEvents(retentionDays);
    } catch (error) {
      logger.error('Initial maintenance cleanup failed', error);
    }
  }, 60000);
}

export function stopMaintenanceScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('Maintenance scheduler stopped');
  }
}
