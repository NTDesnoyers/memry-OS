import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { startFathomSyncScheduler } from "./fathom-sync";
import { registerNurtureAgent } from "./nurture-agent";
import { registerLeadIntakeAgent } from "./lead-intake-agent";
import { registerWorkflowCoachAgent } from "./workflow-coach-agent";
import { startRelationshipChecker } from "./relationship-checker";
import { startMaintenanceScheduler } from "./maintenance";
import { setupVoiceRelay } from "./voice-relay";
import { setupAuth, registerAuthRoutes, registerAdminRoutes, authStorage } from "./replit_integrations/auth";
import { initStripe } from "./stripe/initStripe";
import { registerStripeRoutes } from "./stripe/stripeRoutes";
import { WebhookHandlers } from "./stripe/webhookHandlers";
import { startCostAggregationScheduler } from "./cost-aggregation";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// CRITICAL: Stripe webhook must be registered BEFORE express.json() middleware
// Webhooks need raw Buffer, not parsed JSON
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Health check endpoint - must be early for deployment health probes
app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Setup Replit Auth (must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Rate limiting - protect against abuse
  // General API rate limit: 100 requests per minute per IP
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: { message: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
  });
  
  // Stricter rate limit for AI endpoints: 20 requests per minute
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { message: 'AI rate limit exceeded, please wait a moment' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Very strict rate limit for auth endpoints: 10 attempts per 15 minutes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { message: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Apply rate limiters
  app.use('/api', generalLimiter);
  // Auth rate limiting on actual auth endpoints
  app.use('/api/login', authLimiter);
  app.use('/api/callback', authLimiter);
  // AI rate limiting on all AI-related endpoints
  app.use('/api/ai', aiLimiter);
  app.use('/api/assistant', aiLimiter);
  app.use('/api/voice', aiLimiter);
  app.use('/api/chat', aiLimiter);
  app.use('/api/process-interactions', aiLimiter);
  app.use('/api/admin', authLimiter); // Admin actions rate limited
  
  // CSRF Protection middleware - validate origin for state-changing requests
  // This protects against cross-site request forgery attacks
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Only check state-changing methods
    const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!stateChangingMethods.includes(req.method)) {
      return next();
    }
    
    // Skip CSRF for webhooks (they use secret verification)
    if (req.path.startsWith('/webhooks/')) {
      return next();
    }
    
    // Skip CSRF for auth callback (OAuth flow)
    if (req.path === '/callback') {
      return next();
    }
    
    // Validate origin or referer header
    const origin = req.get('origin');
    const referer = req.get('referer');
    const host = req.get('host');
    
    // In development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    
    // Extract origin from referer if origin not present
    let requestOrigin = origin;
    if (!requestOrigin && referer) {
      try {
        requestOrigin = new URL(referer).origin;
      } catch {
        // Invalid referer URL
      }
    }
    
    // CRITICAL: Require Origin or Referer header for state-changing requests
    // Requests without these headers are potentially CSRF attacks
    if (!requestOrigin) {
      log(`CSRF blocked: missing Origin/Referer header on ${req.method} ${req.path}`, 'security');
      return res.status(403).json({ message: 'Request origin required' });
    }
    
    // Validate that request comes from our domain
    if (host) {
      const expectedOrigins = [
        `https://${host}`,
        `http://${host}`, // Allow http in case of proxy
      ];
      
      if (!expectedOrigins.some(expected => requestOrigin === expected)) {
        log(`CSRF blocked: origin=${requestOrigin} expected=${expectedOrigins.join(',')}`, 'security');
        return res.status(403).json({ message: 'Invalid request origin' });
      }
    }
    
    next();
  });
  
  // Global authentication middleware - protect ALL /api routes except auth & health endpoints
  // This ensures no unauthenticated requests can access any data
  // Note: Use paths WITHOUT /api prefix since app.use('/api',...) strips the prefix
  const PUBLIC_API_PATHS = [
    '/login',
    '/logout', 
    '/callback',
    '/auth/user',
    '/webhooks/', // Webhooks use secret verification
  ];
  
  app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
    // Skip auth check for public routes
    // req.path is the path after /api mount point (e.g., '/login' not '/api/login')
    const isPublicRoute = PUBLIC_API_PATHS.some(route => 
      req.path === route || req.path.startsWith(route)
    );
    
    if (isPublicRoute) {
      return next();
    }
    
    // Check if user is authenticated
    const user = req.user as any;
    if (!req.isAuthenticated() || !user?.claims?.sub) {
      log(`Unauthorized access attempt: ${req.method} /api${req.path}`, 'security');
      return res.status(401).json({ message: 'Unauthorized - Please log in' });
    }
    
    // Check user's approval status and subscription (skip for status check and stripe endpoints)
    const SUBSCRIPTION_EXEMPT_PATHS = ['/auth/status', '/stripe/'];
    const isExemptPath = SUBSCRIPTION_EXEMPT_PATHS.some(path => 
      req.path === path || req.path.startsWith(path)
    );
    
    if (!isExemptPath) {
      try {
        const dbUser = await authStorage.getUser(user.claims.sub);
        
        // First check: approval status
        if (!dbUser || dbUser.status !== 'approved') {
          log(`Access denied for pending/denied user: ${user.claims.email}`, 'security');
          return res.status(403).json({ 
            message: 'Access pending approval',
            status: dbUser?.status || 'pending'
          });
        }
        
        // Second check: subscription status (founder exempt)
        const FOUNDER_EMAIL = "nathan@desnoyersproperties.com";
        const isFounder = dbUser.email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
        const hasActiveSubscription = ['active', 'trialing'].includes(dbUser.subscriptionStatus || '');
        
        if (!isFounder && !hasActiveSubscription) {
          log(`Subscription required for user: ${user.claims.email}, status: ${dbUser.subscriptionStatus}`, 'security');
          return res.status(402).json({ 
            message: 'Subscription required',
            subscriptionStatus: dbUser.subscriptionStatus || 'none'
          });
        }
      } catch (error) {
        log(`Error checking user status: ${error}`, 'security');
        return res.status(500).json({ message: 'Error verifying access' });
      }
    }
    
    next();
  });
  
  // Register admin routes (after middleware for proper security checks)
  registerAdminRoutes(app);
  
  // Register Stripe routes
  registerStripeRoutes(app);
  
  // Initialize Stripe (schema, webhooks, backfill)
  await initStripe();
  
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Run cleanup of old deleted interactions on startup
  const runCleanup = async () => {
    try {
      const count = await storage.cleanupOldDeletedInteractions(30);
      if (count > 0) {
        log(`Cleaned up ${count} deleted interaction(s) older than 30 days`);
      }
    } catch (error) {
      console.error('Error cleaning up old deleted interactions:', error);
    }
  };

  // Run cleanup immediately and then every 24 hours
  runCleanup();
  setInterval(runCleanup, 24 * 60 * 60 * 1000);

  // Only start heavy background schedulers if not disabled (for production resource management)
  if (process.env.DISABLE_SCHEDULERS !== 'true') {
    // Start Fathom.video automatic sync scheduler
    startFathomSyncScheduler();

    // Register agents and start schedulers
    registerNurtureAgent();
    registerLeadIntakeAgent();
    registerWorkflowCoachAgent();
    startRelationshipChecker();
    startMaintenanceScheduler(7);
    startCostAggregationScheduler();
    
    // Setup voice relay WebSocket server
    setupVoiceRelay(httpServer);
    
    log('Background schedulers started');
  } else {
    log('Background schedulers disabled (DISABLE_SCHEDULERS=true)');
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
