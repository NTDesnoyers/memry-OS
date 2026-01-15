# Memry - Relationship Intelligence Platform

## Overview
Memry (formerly Flow OS, domain: memryos.io) is a multi-tenant SaaS platform designed for real estate professionals to enhance relationship-based selling. It integrates key workflows such as Weekly Meeting Agenda (WMA), FORD relationship tracking, client intelligence, business execution, and deal management. The platform aims to be a central source of truth for relationship selling, improving efficiency for tasks like WMA completion and FORD interaction logging. Based on Getting Things Done (GTD) principles, it functions as an intelligent reference system, integrating with external task managers. The project's ambition is to provide an AI Chief of Staff experience, offering anticipatory intelligence, network insights, reflective analysis, memory augmentation, decision support, and skill development to optimize relationship management and business strategy.

## User Preferences
Preferred communication style: Simple, everyday language.
The AI assistant is fully agentic and can take actions using 9 tools via OpenAI function calling. It can execute up to 5 sequential tool calls per request for complex operations.
The system learns the user's unique communication style (greetings, sign-offs, expressions, tone notes, compliment patterns, question styles) from conversation transcripts to generate authentic-sounding content.
The system generates drafts of thank-you emails, handwritten notes, and follow-up tasks from conversations, stored for review and editing.

## System Architecture
Memry uses an event-driven, multi-agent architecture specifically tailored for real estate orchestration.

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful JSON API

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Core Tables**: users, people, deals, tasks, meetings, calls, weeklyReviews, notes, listings, emailCampaigns, interactions, generatedDrafts, voiceProfile

### Key Design Patterns
- **Shared Schema**: Single definition for database schema and TypeScript types.
- **Multi-Tenancy**: Data isolation using `userId` with `TenantContext` pattern:
  - All tenant-scoped storage methods accept optional `ctx?: TenantContext` parameter
  - `getTenantContext(req)` extracts user context from authenticated requests
  - `getTenantFilter(table, ctx)` returns WHERE filter for `userId = ctx.userId OR userId IS NULL`
  - `getEffectiveUserId(ctx)` returns userId for CREATE operations
  - Backward compatibility: allows `userId IS NULL` for founder/legacy data
- **Structured Logging**: Centralized logging via `server/logger.ts`.
- **Maintenance Scheduler**: Automatic cleanup of old system events and agent actions.

### UI/UX Decisions
The design emphasizes GTD principles, focusing on speed for daily reviews and interaction logging. It integrates relationship selling methodologies, including relationship segments (A/B/C/D), transaction stages, FORD notes, and key habits. Workflows support weekly planning, daily start-up, and 8x8 campaigns. The system distinguishes between "Sphere" (active relationships) and "Extended" (auto-captured) contacts.

### Feature Specifications
- **Contact Due Calculator & D Contact Review**
- **AI Assistant**: Agentic tools, voice profile learning, generated drafts, sync APIs.
- **In-App Observer**: Queued suggestions in the Weekly Review "Insights" tab with transparent reasoning.
- **Insight Inbox**: Content capture, AI summarization, and daily digest generation.
- **Guiding Principles Profile**: User's core profile (MTP, mission, values) for AI context personalization.
- **Voice Conversation**: Real-time voice AI chat using OpenAI Realtime API.
- **Dormant Lead Revival Engine**: Gmail scanning for dormant contacts, dormancy scoring, approval workflow, and one-click campaign generation.
- **DIA-Style Skill Packs**: Command Palette shortcuts for relationship-compounding actions (e.g., `/draft`, `/bulk`, `/text`).
- **Context Graph**: Captures "event clock" and decision traces, recording reasoning chains for actions and interactions.
- **Experience Layer v1**: Semantic meaning extraction replacing keyword-based signals:
  - **Table**: experiences (personId, interactionId, type, summary, emotionalValence, magnitudeScore, acknowledged, confidenceScore)
  - **Types**: life_event, achievement, struggle, transition
  - **Magnitude Scale**: 5=life-altering (death, divorce), 4=major milestone (promotion, home purchase), 3=notable transition (new job), 2=everyday (vacation), 1=ambient context
  - **Flow**: Conversations → AI extraction (gpt-4o-mini) → Experiences → Signals → Drafts
  - **Priority**: High-magnitude unacknowledged experiences get signal priority; resolution marks experience acknowledged
  - **Draft Integration**: Experience summary passed to draft generator for grounded, non-generic follow-ups
  - **Files**: server/conversation-processor.ts, server/signal-draft-generator.ts, shared/schema.ts
- **Phase 1 Signal System (Supervised)**: Fully supervised signal-based follow-up system
  - **Architecture**: log conversation → signal created → user resolves → draft created (no autonomous drafts)
  - **Signal Resolution Types**: text, email, handwritten_note, task, skip (5 options)
  - **One Signal Per Person Rule**: Only one active signal per person (prevents spam)
  - **Expiration**: Signals expire after 7 days but remain in DB for future learning layer
  - **Entry Points**: All 3 endpoints return `signalCreated` status:
    - `/api/voice-memories` (voice memory)
    - `/api/voice-memories/quick-log` (quick voice log)
    - `log_interaction` tool (AI assistant)
  - **No Auto-Drafts**: Fallback draft generation removed from all endpoints
  - **UX**: Immediate query invalidation on all resolution types with sonnerToast feedback
  - **Files**: server/routes.ts, client/src/pages/signals.tsx, server/signal-draft-generator.ts

### Orchestration Layer
Memry is a multi-agent, event-driven system orchestrating actions while CRMs remain systems of record. It adheres to principles like Event-Driven, Agent-Based, Dossier Abstraction, Guardrails First, and Revenue Focus. It utilizes named agents (e.g., LeadIntakeAgent, NurtureAgent) and various event types (Lead, Relationship, Transaction, Communication, Intelligence Events).

## External Dependencies

### Database
- **PostgreSQL**: Primary database.

### UI Component Dependencies
- **Radix UI**: Headless components.
- **Lucide React**: Icon library.
- **date-fns**: Date formatting.
- **embla-carousel-react**: Carousel functionality.
- **recharts**: Charts.

### Integrated Services
- **SendGrid**: Email delivery.
- **Cloze CRM**: Downstream sync.
- **Todoist**: Task management.
- **Plaud Note**: Voice conversation transcription.
- **Fathom.video**: Meeting recording and transcription.
- **Granola**: Meeting notes.
- **OpenAI/Anthropic/Gemini**: AI processing for voice logs.
- **Gmail/Google Calendar**: Email and scheduling.
- **Stripe**: Beta billing ($29/month) with checkout, webhooks, and customer portal.

### Billing & Access Control
- **Beta Pricing**: $29/month via Stripe Checkout (currently disabled - free beta)
- **Access Gate**: Approved status required (founder exempt: nathan@desnoyersproperties.com)
- **HTTP Status Codes**: 401 (unauthorized) → 403 (pending approval) → 402 (subscription required) → access
- **Webhook Events**: checkout.session.completed, invoice.payment_failed, customer.subscription.deleted
- **Stripe Files**: server/stripe/stripeClient.ts, stripeRoutes.ts, webhookHandlers.ts, initStripe.ts

### Beta Email Whitelist
- **Purpose**: Pre-approve emails for instant beta access before users sign up
- **Auto-Approval**: Whitelisted emails are automatically approved on sign-in with signupSource='invited'
- **Admin UI**: /admin/beta dashboard includes whitelist management section
- **API Endpoints**: GET/POST/DELETE /api/beta/whitelist (admin only)
- **Table**: beta_whitelist (id, email, addedBy, note, usedAt, createdAt)
- **Files**: shared/models/auth.ts, server/replit_integrations/auth/storage.ts

### AI Cost Tracking
- **Usage Logging**: All OpenAI calls tracked via server/ai/trackedOpenAI.ts wrapper
- **Daily Aggregation**: Runs at 12:05 AM, aggregates into aiCostDailySummary table
- **Weekly Export**: Monday scheduler exports previous week to Google Sheets (requires COST_SPREADSHEET_ID env var)
- **Keying Logic**: Disambiguates by userId, or by userEmail when userId is null
- **Implementation**: server/cost-aggregation.ts, server/google-sheets.ts

### Authentication Flow Architecture
- **Single useAuth() Call**: Auth state is resolved once in AuthenticatedApp component
- **Prop Drilling for Protected Routes**: userEmail is passed as prop to Router → ProtectedRoute to avoid duplicate useAuth() calls
- **React Error #310 Prevention**: ProtectedRoute does NOT call useAuth() directly; receives userEmail via props to maintain consistent hook counts during navigation
- **Loading State Gate**: Router only renders after auth state is fully resolved (isLoading === false)
- **Key Files**: client/src/App.tsx, client/src/components/protected-route.tsx

## Recent Changes (Jan 2026)

### Beta Dashboard Data Accuracy (Jan 15, 2026)
- **Issue**: Dashboard showed 0 conversations/follow-ups for all users
- **Root Cause**: Analytics queried `beta_events` tracking table instead of actual data tables
- **Fix**: Updated `getBetaUsers()`, `getBetaStats()`, `getAdminBetaStats()` to query:
  - `interactions` table for conversation counts (excluding soft-deleted)
  - `follow_up_signals` table for follow-up counts
  - Status derived from having any interactions (activated) vs none (signed_up)
- **Files**: server/replit_integrations/auth/storage.ts

### Auth SessionId Tracking (Jan 15, 2026)
- **Issue**: SessionId not captured for login/signup events
- **Fix**: Implemented `passReqToCallback: true` with `VerifyFunctionWithRequest` type signature
- **Result**: All auth events now capture Express `req.sessionID`
- **Files**: server/replit_integrations/auth/replitAuth.ts

### Signal Skip Optimistic Update (Jan 15, 2026)
- **Issue**: Skip action felt slow - user had to wait for API roundtrip before card disappeared
- **Fix**: Added optimistic update pattern to `resolveMutation`:
  - `onMutate`: Immediately removes signal from cache before API call
  - `onError`: Rollback restores signal if API fails
  - Shortened undo toast from 5s to 3s
- **Files**: client/src/pages/signals.tsx

### First-Run Activation Gate (Jan 15, 2026)
- **Purpose**: Force new users to discover and use AI assistant for first conversation log
- **Detection**: `isNewUser = !isLoading && interactions.length === 0 && !isFounder`
- **Activation Definition**: Any interaction exists (not AI-specific) - intentional for Phase 1
- **Gate UI** (minimal V1):
  - Headline: "Log your last conversation"
  - Subtext: "This is how Memry works. Takes about 30 seconds."
  - Instruction: "Tap the AI button in the bottom-right corner to start."
- **Hidden when gate active**: Manual log button, search bar, interaction list
- **Visible**: Sidebar navigation, AI assistant button (part of Layout)
- **Bypass**: Founder (nathan@desnoyersproperties.com) sees normal Flow page
- **Files**: client/src/pages/flow.tsx