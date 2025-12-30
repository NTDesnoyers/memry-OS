# Flow OS Deployment Guide

## Development vs Production

- **Development (Preview)**: For building features and bug fixes. Has its own database.
- **Production (Deployed)**: Your daily driver with real data. Separate database.

## Fixing the Production Database

### Step 1: Set Environment Variables in Production

In your Replit deployment settings, add these environment variables:

```
DISABLE_SCHEDULERS=true
```

This prevents heavy background tasks (Fathom sync, relationship checker, agent schedulers) from running and crashing your small production instance.

### Step 2: Verify Database Connection

Your production `DATABASE_URL` should be automatically set by Replit to point to your production Postgres database (not the development one). If you see `getaddrinfo ENOTFOUND helium` errors, the production app is incorrectly trying to connect to the development database hostname.

### Step 3: Run Migrations on Production Database

After deploying, run migrations to create the tables in your production database:

```bash
npx drizzle-kit migrate
```

### Step 4: Import Your Data

Your development data has been exported to `exports/dev_data_export.sql` (63MB).

To import into production database:

1. Get your production DATABASE_URL from the deployment environment
2. Run:
   ```bash
   psql $PRODUCTION_DATABASE_URL < exports/dev_data_export.sql
   ```

Alternatively, you can use the Replit Database panel to import the SQL file.

## Health Check

The app now has a `/health` endpoint that returns "ok" when the server is running. This allows Replit to verify your deployment is healthy.

Test it:
```bash
curl https://your-app.replit.app/health
```

## Deployment Testing Workflow

1. Make code changes in development (Preview)
2. Test locally with sample data
3. Deploy to production
4. Verify `/health` endpoint responds
5. Test a few API routes work correctly
6. Use production as your daily driver

## Troubleshooting

### Crash Loop on Deployment
- Ensure `DISABLE_SCHEDULERS=true` is set in production
- Check `/health` endpoint responds quickly

### Database Connection Errors
- Verify `DATABASE_URL` points to production database, not development
- Check the hostname is not "helium" (that's development only)

### Empty Production Database
- Run migrations first: `npx drizzle-kit migrate`
- Import data: `psql $DATABASE_URL < exports/dev_data_export.sql`
