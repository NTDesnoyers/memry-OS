import * as client from "openid-client";
import { Strategy, type VerifyFunction, type VerifyFunctionWithRequest } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { createLogger } from "../../logger";

const logger = createLogger("Auth");

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUserWithTracking(claims: any, sessionId?: string) {
  try {
    logger.info(`Auth callback: upserting user id=${claims["sub"]} email=${claims["email"]}`);
    
    const { user, isNewUser } = await authStorage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
    
    logger.info(`Auth callback: user upserted successfully id=${user.id} email=${user.email} status=${user.status} isNewUser=${isNewUser}`);
    
    // Track login vs signup event
    try {
      await authStorage.recordBetaEvent({
        userId: user.id,
        sessionId,
        eventType: isNewUser ? 'user_signup' : 'user_login',
        properties: { provider: 'replit' },
      });
      logger.info(`Auth event recorded: ${isNewUser ? 'user_signup' : 'user_login'} for userId=${user.id}`);
    } catch (trackError: any) {
      // Don't fail auth if tracking fails, but log it
      logger.warn(`Failed to track auth event: ${trackError.message}`);
    }
    
    return { user, isNewUser };
  } catch (error: any) {
    logger.error(`Auth callback: FAILED to upsert user id=${claims["sub"]} email=${claims["email"]} error=${error.message}`);
    logger.error(`Auth callback: Stack trace: ${error.stack}`);
    
    // Track failed login attempt
    try {
      await authStorage.recordBetaEvent({
        sessionId,
        eventType: 'login_failed',
        properties: { 
          reason: error.message,
          stage: 'auth_callback',
          attemptedEmail: claims["email"],
        },
      });
    } catch (trackError: any) {
      logger.warn(`Failed to track login_failed event: ${trackError.message}`);
    }
    
    throw error;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  // Custom verify function that receives request for session access
  const verifyWithRequest: VerifyFunctionWithRequest = async (
    req,
    tokens,
    verified
  ) => {
    // Get sessionId from the Express request
    const sessionId = req?.sessionID;
    
    try {
      const user = {};
      const claims = tokens.claims() as Record<string, any> || {};
      const sub = claims["sub"] || "unknown";
      const email = claims["email"] || "unknown";
      logger.info(`Auth verify: processing login for sub=${sub} email=${email} sessionId=${sessionId || 'none'}`);
      
      updateUserSession(user, tokens);
      await upsertUserWithTracking(claims, sessionId);
      
      logger.info(`Auth verify: login successful for email=${email}`);
      verified(null, user);
    } catch (error: any) {
      logger.error(`Auth verify: login FAILED error=${error.message}`);
      verified(error, undefined);
    }
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
          passReqToCallback: true, // Enable access to Express request for sessionId
        },
        verifyWithRequest
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
