# Flow OS - Relationship Intelligence Platform

## Overview
Flow OS is a single-user personal business operating system designed for real estate professionals focused on relationship-based selling. It integrates Weekly Meeting Agenda (WMA), FORD relationship tracking, client intelligence, business execution, and deal management. The platform acts as a central source of truth for relationship selling workflows, prioritizing efficiency for tasks like WMA completion and FORD interaction logging. It functions as an intelligent reference system based on Getting Things Done (GTD) principles, integrating with external task managers like Todoist. The project aims to provide an AI Chief of Staff experience, offering anticipatory intelligence, network insights, reflective analysis, memory augmentation, decision support, and skill development to enhance relationship management and business strategy.

## User Preferences
Preferred communication style: Simple, everyday language.
The AI assistant is fully agentic and can take actions using 9 tools via OpenAI function calling. It can execute up to 5 sequential tool calls per request for complex operations.
The system learns the user's unique communication style (greetings, sign-offs, expressions, tone notes, compliment patterns, question styles) from conversation transcripts to generate authentic-sounding content.
The system generates drafts of thank-you emails, handwritten notes, and follow-up tasks from conversations, stored for review and editing.

## System Architecture
The project adheres to an event-driven, multi-agent architecture with a focus on real estate orchestration.

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Build Tool**: Vite
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful JSON API (`/api/*` routes)
- **Validation**: Zod schemas shared via `drizzle-zod`

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with `drizzle-kit` for migrations
- **Schema Location**: `shared/schema.ts`
- **Core Tables**: users, people, deals, tasks, meetings, calls, weeklyReviews, notes, listings, emailCampaigns, interactions, generatedDrafts, voiceProfile

### Project Structure
- `client/`: React frontend
- `server/`: Express backend
- `shared/`: Shared schema and types
- `migrations/`: Database migrations

### Key Design Patterns
- **Shared Schema**: Single definition for database schema and TypeScript types.
- **Storage Interface**: Abstracted database operations in `server/storage.ts`.
- **Path Aliases**: `@/` for client, `@shared/` for shared code.
- **Component Library**: shadcn/ui components.
- **Structured Logging**: Use `createLogger('ModuleName')` from `server/logger.ts` instead of console.log. Supports debug/info/warn/error levels.
- **Maintenance Scheduler**: Automatic cleanup of old system_events and agent_actions (7-day retention). API: `/api/maintenance/stats`, `/api/maintenance/cleanup`.

### UI/UX Decisions
The design emphasizes GTD principles, making the system an intelligent reference tool focused on speed for daily reviews and interaction logging. It integrates relationship selling methodologies, including relationship segments (A/B/C/D), transaction stages, FORD notes, core habits, and working lists. Key workflows include weekly planning, daily start-up, and 8x8 campaigns.

### Feature Specifications
Current features include a Contact Due Calculator, D Contact Review, AI Assistant with agentic tools, voice profile learning, generated drafts, sync APIs, **In-App Observer** (queued suggestions in Weekly Review "Insights" tab), **Insight Inbox** (content capture and daily digest), **Guiding Principles Profile** (MTP, mission, values personalization), **Voice Conversation** (real-time voice AI chat via OpenAI Realtime API), **Dormant Lead Revival Engine** (Gmail scanning, dormancy scoring, approval workflow, campaign generation), and **DIA-Style Skill Packs** (Command Palette shortcuts for relationship-compounding actions: Draft Revival, Bulk Outreach, Quick Text). Future features target anticipatory, network, and reflective intelligence, memory augmentation, decision support, and skill development.

### Sphere vs Extended Contacts
**Cloze-like Contact Management (Implemented)**:
- Distinguishes between "Sphere" (active A/B/C/D relationships) and "Extended" (auto-captured from meetings/emails)
- Schema: `inSphere` boolean field, `autoCapturedFrom` text, `firstSeenAt` timestamp on `people` table
- Auto-capture: Fathom/Granola syncs automatically create extended contacts from participant emails
- Manual creation: Conversation log allows creating new contacts on-the-fly when person not found
- People page: Toggle between Sphere/Extended/All with counts; segment filter hidden for extended view
- Design: Extended contacts stay out of the way until promoted to sphere

### Dormant Lead Revival Engine
**Lead Revival System (Implemented)**:
- Gmail scanner identifies dormant contacts (180+ days no interaction)
- Dormancy scoring (0-100): 180+ days = +20, 365+ = +30, 730+ = +40, 1095+ = +50
- Approval workflow: review, approve/dismiss, bulk actions
- One-click campaign generation creates personalized email drafts
- Schema: `dormantOpportunities` table
- API: `/api/dormant-opportunities/*`, `/api/dormant-lead-scanner/*`
- Page: `/revival` for full Revival Opportunities management

### DIA-Style Skill Packs
**Command Palette Skills (Implemented)**:
- Inspired by DIA Browser's "/" command shortcuts
- Access via Command Palette (Cmd+K) → type "/" or scroll to Skills section
- Pruned to relationship-compounding actions only (one-off utilities deferred):
  - `/draft` - Draft Revival Email: Navigate to Revival page
  - `/bulk` - Bulk Lead Outreach: Scan and batch outreach
  - `/text` - Quick Text Client: Draft personalized SMS
- Skills trigger AI Assistant with pre-built prompts
- Extensible architecture for adding new skill packs

### Voice Conversation
**Real-Time Voice AI (Implemented)**:
- Click "Voice" button in AI Assistant to switch to voice mode
- Uses OpenAI Realtime API for low-latency voice-to-voice conversation
- Server-side WebSocket relay at `/api/voice/realtime` proxies to OpenAI
- Audio: PCM16 format at 24kHz, voice activity detection (VAD) for turn-taking
- Components: `server/voice-relay.ts`, `client/src/components/voice-conversation.tsx`
- Personalized with user's Guiding Principles profile via AI Context Service
- Long-term vision: iPhone Action Button, Siri-like shortcuts for "Siri for your people"

### Guiding Principles Profile
**User Core Profile (Implemented)**:
- Multi-step intake wizard at `/intake` captures MTP, mission statement, core values, philosophy, decision framework
- Professional profile: years experience, team structure, goals, specializations, focus areas
- Personal context (FORD): family summary, hobbies, community involvement
- Schema: `userCoreProfile` table linked to `betaUsers`
- API: `GET/PUT /api/profile` for single-user mode
- Settings page shows profile summary with link to edit
- AI Context Service (`server/ai-context.ts`): `getSystemPromptWithProfile()` injects guiding principles into AI prompts

### Insight Inbox
**Content Capture & Daily Digest (Implemented)**:
- Save URLs via Command Palette (Cmd+K) → "Save URL"
- Async processing: fetch HTML → extract content → AI summarize → generate tags
- Verifier pattern validates AI-generated summaries/tags before storage
- Daily digest generation with share suggestions
- Schema: `savedContent`, `dailyDigests`, `aiActions` tables
- API: `/api/content/capture`, `/api/digests/today`, `/api/digests/generate`
- Dashboard widget shows unread count and digest preview

### Context Graph (Decision Traces)
**Organizational World Model (Phase 1 Implemented)**:
- Captures the "event clock" - not just what's true now, but WHY it became true
- Inspired by context graph / decision traces architecture pattern
- Schema: `context_nodes` (graph entities), `context_edges` (typed relationships), `decision_traces` (full reasoning chains)
- Edge types: `informed_by`, `resulted_in`, `led_to`, `contradicts`, `supports`, `triggered`, `references`, `supersedes`
- Service: `server/context-graph.ts` with `recordDecision()`, `linkEntities()`, `getReasoningChain()`
- Auto-recording: Interactions and observer suggestion actions automatically create decision traces
- API: `GET /api/context/:entityType/:entityId`, `GET /api/context/:entityType/:entityId/chain`, `GET /api/context/traces/recent`
- Future: UI for "Why this?" explainer, Context Timeline, simulation/what-if queries

### Observer Feature
**In-App Observer (Refactored for Quiet Intelligence)**:
- WorkflowCoachAgent generates context-aware suggestions based on real data (leads, contacts, tasks)
- Suggestions queue silently in Weekly Review "Insights" tab (no real-time interruptions)
- All 8 suggestion types include transparent "Because..." reasoning + evidence arrays for learnability
- Learns from user feedback (thumbs up/down adjusts pattern scores, suppresses unhelpful suggestions)
- Schema: `observerSuggestions`, `observerPatterns` tables
- API: `/api/observer/suggestions`, `/api/observer/patterns`, `/api/observer/trigger`

**Full-Screen Observation (Future Roadmap)**:
- Toggle-based "Observe Mode" button (not always-on)
- Captures and analyzes entire desktop/screen content
- Requires: Chrome extension or desktop app for screen capture
- Vision AI integration to understand screen context
- Cross-application context awareness (email, calendar, browser, CRM)
- Would leverage the existing suggestion engine and pattern learning infrastructure

### Orchestration Layer
Flow OS is a multi-agent, event-driven system that orchestrates actions while CRMs and external tools remain systems of record.
- **Core Architectural Principles**: Event-Driven, Agent-Based, Dossier Abstraction, Guardrails First, Revenue Focus.
- **Named Agents**: LeadIntakeAgent, NurtureAgent, OpsTransactionAgent, DataContextAgent, MarketingAgent, LifeEventAgent.
- **Event Types**: Lead, Relationship, Transaction, Communication, and Intelligence Events.
- **Dossier Abstraction**: `PersonFullContext` endpoint aggregates all structured and unstructured data for a client/deal.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.

### UI Component Dependencies
- **Radix UI**: Headless components.
- **Lucide React**: Icon library.
- **date-fns**: Date formatting.
- **embla-carousel-react**: Carousel functionality.
- **recharts**: Charts.

### Integrated Services (UI exists, but not fully connected with backend)
- **SendGrid**: Email delivery.
- **Cloze CRM**: Downstream sync.
- **Todoist**: Task management (GTD system of record).
- **Plaud Note**: Voice conversation transcription.
- **Fathom.video**: Meeting recording and transcription.
- **Granola**: Meeting notes.
- **OpenAI/Anthropic/Gemini**: AI processing for voice logs.
- **Gmail/Google Calendar**: Email and scheduling.

## Feature Roadmap
**Planned Features (Inspired by Michael Wade's Workflow)**:

### Near-term
- **Lofty CRM Integration**: Bidirectional sync with Lofty/Chime CRM for leads and contacts
- **iMessage/SMS Sync with Media**: Mac companion app for encrypted backup parsing, photo/video upload to cloud storage with signed URLs (beyond Cloze's text-only sync)
- **Form Intake Hub**: Tally.so-style embedded forms for lead capture with smart routing

### Mid-term
- **System-wide Keyboard Shortcuts**: Raycast-like global hotkeys (e.g., iPhone Action Button → Voice AI)
- **Multi-CRM Orchestration**: Unified interface across Lofty, Cloze, Follow Up Boss
- **Zapier/Make Integration Hub**: Connect to 5000+ apps via no-code automation

### Long-term (AI Chief of Staff Vision)
- **Anticipatory Intelligence**: Proactive suggestions before you need them
- **Network Intelligence**: Map relationship graphs and identify warm introductions
- **Reflective Analysis**: Weekly/monthly performance insights
- **Memory Augmentation**: Never forget a detail about any relationship
- **Decision Support**: AI-powered strategic recommendations
- **Skill Development**: Personalized coaching for relationship selling mastery

## Strategic Positioning

**AI-Native vs AI-Bolted-On** (Inspired by Gavin Baker's "SaaS Death Trap" thesis):

Traditional CRMs (Cloze, Follow Up Boss, Salesforce) are protecting 80%+ margins and reluctantly adding AI features. Flow OS is AI-native with no legacy margins to protect—comfortable at 35-40% gross margins while delivering 10x more value.

**Core Differentiation:**
1. **AI That Takes Action**: Not just data display—AI drafts, sends, schedules with user approval
2. **Verify → Automate Pattern**: Build trust incrementally (suggest → draft → notify → autonomous)
3. **Voice + Relationship Memory**: Voice AI and FORD notes create irreplaceable context
4. **Relationship Selling Focus**: Serve relationship-based real estate professionals perfectly

**See:** `docs/STRATEGIC_ROADMAP.md` for detailed 90-day sprint plan and phase breakdown.
