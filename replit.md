# Ninja OS - Relationship Intelligence Platform

## Overview
Ninja OS is a single-user personal business operating system designed for real estate professionals using the Ninja Selling methodology. It integrates Weekly Meeting Agenda (WMA), FORD relationship tracking, client intelligence, business execution, and deal management. The platform acts as a central source of truth for Ninja Selling workflows, prioritizing efficiency for tasks like WMA completion and FORD interaction logging. It functions as an intelligent reference system based on Getting Things Done (GTD) principles, integrating with external task managers like Todoist. The project aims to provide an AI Chief of Staff experience, offering anticipatory intelligence, network insights, reflective analysis, memory augmentation, decision support, and skill development to enhance relationship management and business strategy.

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
The design emphasizes GTD principles, making the system an intelligent reference tool focused on speed for daily reviews and interaction logging. It integrates Ninja Selling methodologies, including relationship segments (A/B/C/D), transaction stages, FORD notes, Ninja Nine habits, and core working lists. Key workflows include weekly planning, daily start-up, and 8x8 campaigns.

### Feature Specifications
Current features include a Contact Due Calculator, D Contact Review, AI Assistant with agentic tools, voice profile learning, generated drafts, sync APIs, **In-App Observer** (data-driven suggestion overlay), **Insight Inbox** (content capture and daily digest), **Guiding Principles Profile** (MTP, mission, values personalization), and **Voice Conversation** (real-time voice AI chat via OpenAI Realtime API). Future features target anticipatory, network, and reflective intelligence, memory augmentation, decision support, and skill development.

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

### Observer Feature
**In-App Observer (Implemented)**:
- WorkflowCoachAgent generates context-aware suggestions based on real data (leads, contacts, tasks)
- Floating overlay in bottom-right corner with accept/snooze/dismiss controls
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
Ninja OS is a multi-agent, event-driven system that orchestrates actions while CRMs and external tools remain systems of record.
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