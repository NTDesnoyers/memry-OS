# Flow OS - Relationship Intelligence Platform

## Overview
Flow OS is a multi-tenant SaaS platform designed for real estate professionals to enhance relationship-based selling. It integrates key workflows such as Weekly Meeting Agenda (WMA), FORD relationship tracking, client intelligence, business execution, and deal management. The platform aims to be a central source of truth for relationship selling, improving efficiency for tasks like WMA completion and FORD interaction logging. Based on Getting Things Done (GTD) principles, it functions as an intelligent reference system, integrating with external task managers. The project's ambition is to provide an AI Chief of Staff experience, offering anticipatory intelligence, network insights, reflective analysis, memory augmentation, decision support, and skill development to optimize relationship management and business strategy.

## User Preferences
Preferred communication style: Simple, everyday language.
The AI assistant is fully agentic and can take actions using 9 tools via OpenAI function calling. It can execute up to 5 sequential tool calls per request for complex operations.
The system learns the user's unique communication style (greetings, sign-offs, expressions, tone notes, compliment patterns, question styles) from conversation transcripts to generate authentic-sounding content.
The system generates drafts of thank-you emails, handwritten notes, and follow-up tasks from conversations, stored for review and editing.

## System Architecture
Flow OS uses an event-driven, multi-agent architecture specifically tailored for real estate orchestration.

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
- **Multi-Tenancy**: Data isolation using `userId` for beta users, with backward compatibility for founder data.
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

### Orchestration Layer
Flow OS is a multi-agent, event-driven system orchestrating actions while CRMs remain systems of record. It adheres to principles like Event-Driven, Agent-Based, Dossier Abstraction, Guardrails First, and Revenue Focus. It utilizes named agents (e.g., LeadIntakeAgent, NurtureAgent) and various event types (Lead, Relationship, Transaction, Communication, Intelligence Events).

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