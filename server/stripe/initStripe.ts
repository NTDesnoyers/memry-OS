import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { createLogger } from '../logger';

const logger = createLogger('Stripe');

export async function initStripe(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.warn('DATABASE_URL not found, skipping Stripe initialization');
    return;
  }

  try {
    logger.info('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    logger.info('Stripe schema ready');

    const stripeSync = await getStripeSync();

    logger.info('Setting up managed webhook...');
    const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
    if (domains.length === 0) {
      logger.warn('No REPLIT_DOMAINS found, skipping webhook setup');
      return;
    }

    const webhookBaseUrl = `https://${domains[0]}`;
    try {
      const result = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`
      );
      const webhook = result?.webhook || result;
      logger.info(`Webhook configured: ${webhook?.url || webhookBaseUrl + '/api/stripe/webhook'}`);
    } catch (webhookError: any) {
      logger.warn(`Webhook setup skipped: ${webhookError.message}`);
    }

    logger.info('Syncing Stripe data in background...');
    stripeSync.syncBackfill()
      .then(() => {
        logger.info('Stripe data synced');
      })
      .catch((err: Error) => {
        logger.error(`Error syncing Stripe data: ${err.message}`);
      });
  } catch (error: any) {
    logger.error(`Failed to initialize Stripe: ${error.message}`);
  }
}
