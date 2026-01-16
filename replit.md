# Memry - Relationship Intelligence Platform

## Overview
Memry is a multi-tenant SaaS platform for real estate professionals, focusing on enhancing relationship-based selling. It integrates workflows like Weekly Meeting Agenda (WMA), FORD relationship tracking, client intelligence, business execution, and deal management. The platform aims to be a central source of truth for relationship selling, improving efficiency and supporting GTD principles. Its ambition is to act as an AI Chief of Staff, providing anticipatory intelligence, network insights, and decision support to optimize relationship management and business strategy.

## User Preferences
Preferred communication style: Simple, everyday language.
Documentation requirement: Always update replit.md with new features, architectural changes, and important decisions before marking tasks complete. User should not need to prompt for documentation updates.
The AI assistant is fully agentic and can take actions using 9 tools via OpenAI function calling. It can execute up to 5 sequential tool calls per request for complex operations.
The system learns the user's unique communication style (greetings, sign-offs, expressions, tone notes, compliment patterns, question styles) from conversation transcripts to generate authentic-sounding content.
The system generates drafts of thank-you emails, handwritten notes, and follow-up tasks from conversations, stored for review and editing.

## System Architecture
Memry uses an event-driven, multi-agent architecture tailored for real estate orchestration.

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
- **Multi-Tenancy**: Data isolation using `userId` with `TenantContext` pattern.
- **Structured Logging**: Centralized logging via `server/logger.ts`.
- **Maintenance Scheduler**: Automatic cleanup of old system events and agent actions.

### UI/UX Decisions
The design prioritizes speed for daily reviews and interaction logging, emphasizing GTD principles. It integrates relationship selling methodologies, including relationship segments (A/B/C/D), transaction stages, FORD notes, and key habits. Workflows support weekly planning, daily start-up, and 8x8 campaigns.

### Feature Specifications
- **AI Assistant**: Agentic tools, voice profile learning, generated drafts, sync APIs.
- **In-App Observer**: Queued suggestions in Weekly Review "Insights" tab with transparent reasoning.
- **Insight Inbox**: Content capture, AI summarization, and daily digest generation.
- **Guiding Principles Profile**: User's core profile for AI context personalization.
- **Voice Conversation**: Real-time voice AI chat using OpenAI Realtime API.
- **Dormant Lead Revival Engine**: Gmail scanning, dormancy scoring, approval workflow, and one-click campaign generation.
- **DIA-Style Skill Packs**: Command Palette shortcuts for relationship-compounding actions.
- **Context Graph**: Captures "event clock" and decision traces for actions and interactions.
- **Experience Layer v1**: Semantic meaning extraction for signals and drafts, processing conversations into experiences (life_event, achievement, struggle, transition) with magnitude scores. High-magnitude unacknowledged experiences prioritize signals.
- **Phase 1 Signal System (Supervised)**: A fully supervised signal-based follow-up system where conversations create signals, users resolve them, and then drafts are generated (no autonomous drafts). Only one active signal per person is allowed, and signals expire after 7 days.
- **AI Assistant Mode-Based Input System**: Ensures explicit mode declaration (`log_conversation`, `quick_update`, `ask_search`) for AI assistant inputs, enforcing contracts to prevent critical data loss, especially for `log_conversation` actions.
- **Action vs Reflection Mode Architecture**: 
  - **Action Mode (log_conversation)**: Ephemeral thread. After successful log_interaction, thread resets immediately (no history save). Enforces "one conversation per thread" rule to eliminate silent failure risk. Backend emits `conversation_logged` SSE event; frontend only resets when ALL expected logs are received (prevents partial-failure resets).
  - **Reflection Mode (ask_search)**: Persistent thread. Saved to conversation history on close/minimize. Resumable for ongoing research or multi-turn conversations.

### Orchestration Layer
Memry is a multi-agent, event-driven system orchestrating actions while CRMs remain systems of record. It adheres to principles like Event-Driven, Agent-Based, Dossier Abstraction, Guardrails First, and Revenue Focus, utilizing named agents and various event types.

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
- **Stripe**: Beta billing with checkout, webhooks, and customer portal.

### Billing & Access Control
- **Beta Pricing**: $29/month via Stripe Checkout (currently disabled - free beta).
- **Access Gate**: Approved status required.
- **Beta Email Whitelist**: For auto-approval of invited users.

### AI Cost Tracking
- **Usage Logging**: All OpenAI calls tracked and aggregated daily.
- **Weekly Export**: Data exported to Google Sheets.

### Authentication Flow Architecture
- **Single `useAuth()` Call**: Auth state resolved once in AuthenticatedApp component.
- **Prop Drilling**: `userEmail` passed to ProtectedRoute to prevent duplicate `useAuth()` calls.
- **Loading State Gate**: Router only renders after auth state is fully resolved.