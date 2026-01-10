import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { authStorage } from '../replit_integrations/auth/storage';
import type { SubscriptionStatus } from '@shared/models/auth';
import { createLogger } from '../logger';

const logger = createLogger('Stripe');

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    
    const stripe = await getUncachableStripeClient();
    const event = stripe.webhooks.constructEvent(
      payload.toString(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
    
    await WebhookHandlers.handleStripeEvent(event);
  }

  static async handleStripeEvent(event: any): Promise<void> {
    logger.info(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await WebhookHandlers.handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await WebhookHandlers.handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await WebhookHandlers.handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await WebhookHandlers.handlePaymentFailed(invoice);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        await WebhookHandlers.handleInvoicePaid(invoice);
        break;
      }

      default:
        logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  static async handleCheckoutComplete(session: any): Promise<void> {
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const userId = session.metadata?.userId;

    if (!userId) {
      logger.warn('Checkout complete but no userId in metadata');
      return;
    }

    logger.info(`Checkout complete for user ${userId}`);

    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

    await authStorage.updateSubscription(userId, {
      stripeCustomerId: customerId,
      subscriptionId: subscriptionId,
      subscriptionStatus: mapStripeStatus(subscription.status),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    });

    logger.info(`User ${userId} subscription activated`);
  }

  static async handleSubscriptionUpdate(subscription: any): Promise<void> {
    const customerId = subscription.customer;
    const user = await authStorage.getUserByStripeCustomerId(customerId);

    if (!user) {
      logger.warn(`No user found for Stripe customer ${customerId}`);
      return;
    }

    await authStorage.updateSubscription(user.id, {
      subscriptionId: subscription.id,
      subscriptionStatus: mapStripeStatus(subscription.status),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    });

    logger.info(`Updated subscription status for user ${user.id}: ${subscription.status}`);
  }

  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const customerId = subscription.customer;
    const user = await authStorage.getUserByStripeCustomerId(customerId);

    if (!user) {
      logger.warn(`No user found for Stripe customer ${customerId}`);
      return;
    }

    await authStorage.updateSubscription(user.id, {
      subscriptionStatus: 'canceled',
      canceledAt: new Date(),
    });

    logger.info(`Subscription canceled for user ${user.id}`);
  }

  static async handlePaymentFailed(invoice: any): Promise<void> {
    const customerId = invoice.customer;
    const user = await authStorage.getUserByStripeCustomerId(customerId);

    if (!user) {
      logger.warn(`No user found for Stripe customer ${customerId}`);
      return;
    }

    await authStorage.updateSubscription(user.id, {
      subscriptionStatus: 'past_due',
    });

    logger.info(`Payment failed for user ${user.id}, marked as past_due`);
  }

  static async handleInvoicePaid(invoice: any): Promise<void> {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    if (!subscriptionId) return;

    const user = await authStorage.getUserByStripeCustomerId(customerId);
    if (!user) return;

    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

    await authStorage.updateSubscription(user.id, {
      subscriptionStatus: mapStripeStatus(subscription.status),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });

    logger.info(`Invoice paid for user ${user.id}, subscription updated`);
  }
}

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'none';
  }
}
