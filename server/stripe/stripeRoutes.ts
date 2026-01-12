import type { Express, Request, Response } from 'express';
import { getUncachableStripeClient, getStripePublishableKey } from './stripeClient';
import { authStorage } from '../replit_integrations/auth/storage';
import { isAuthenticated } from '../replit_integrations/auth/replitAuth';
import { createLogger } from '../logger';

const logger = createLogger('Stripe');

const FOUNDER_EMAIL = "nathan@desnoyersproperties.com";
const BETA_PRICE_AMOUNT = 2900;

export function registerStripeRoutes(app: Express): void {
  app.get('/api/stripe/publishable-key', async (req: Request, res: Response) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error: any) {
      logger.error(`Error getting publishable key: ${error.message}`);
      res.status(500).json({ error: 'Failed to get Stripe key' });
    }
  });

  app.post('/api/stripe/create-checkout-session', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const user = await authStorage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (userEmail?.toLowerCase() === FOUNDER_EMAIL.toLowerCase()) {
        return res.status(400).json({ error: 'Founder account does not require subscription' });
      }

      if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
        return res.status(400).json({ error: 'Already subscribed' });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
          metadata: { userId: user.id },
        });
        customerId = customer.id;

        await authStorage.updateSubscription(user.id, {
          stripeCustomerId: customerId,
          subscriptionStatus: 'none',
        });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Memry Founding Agent Beta',
              description: 'Monthly subscription for relationship-based real estate agents',
            },
            unit_amount: BETA_PRICE_AMOUNT,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${baseUrl}/?subscription=success`,
        cancel_url: `${baseUrl}/?subscription=canceled`,
        metadata: { userId: user.id },
      });

      logger.info(`Created checkout session for user ${userId}`);
      res.json({ url: session.url });
    } catch (error: any) {
      logger.error(`Error creating checkout session: ${error.message}`);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  app.post('/api/stripe/create-portal-session', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: 'No subscription found' });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/settings`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      logger.error(`Error creating portal session: ${error.message}`);
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  });

  app.get('/api/stripe/subscription-status', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isFounder = user.email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase();

      res.json({
        subscriptionStatus: user.subscriptionStatus,
        currentPeriodEnd: user.currentPeriodEnd,
        trialEnd: user.trialEnd,
        canceledAt: user.canceledAt,
        isFounder,
        hasActiveSubscription: isFounder || user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing',
      });
    } catch (error: any) {
      logger.error(`Error getting subscription status: ${error.message}`);
      res.status(500).json({ error: 'Failed to get subscription status' });
    }
  });
}
