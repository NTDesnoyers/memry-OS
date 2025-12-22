# Ninja OS - Ninja Selling Operating System

## Overview
Ninja OS is a single-user personal business operating system designed for real estate professionals utilizing the Ninja Selling methodology. It unifies Weekly Meeting Agenda (WMA), FORD relationship tracking, client intelligence, business execution tracking, and deal management into one platform. The application serves as the source of truth for Ninja Selling workflows, emphasizing speed and efficiency for tasks like WMA completion and FORD interaction logging. It is primarily an intelligent reference material system, adhering to Getting Things Done (GTD) principles, and integrates with external task managers like Todoist for task execution. The project aims to provide an AI Chief of Staff experience, offering anticipatory intelligence, network insights, reflective analysis, memory augmentation, decision support, and skill development to enhance relationship management and business strategy.

## User Preferences
Preferred communication style: Simple, everyday language.

### AI Assistant (Agentic Mode)
The AI assistant is fully agentic and can take actions using 9 tools via OpenAI function calling. It can execute up to 5 sequential tool calls per request for complex operations.

### Voice Profile Learning
The system learns the user's unique communication style (greetings, sign-offs, expressions, tone notes, compliment patterns, question styles) from conversation transcripts to generate authentic-sounding content.

### AI-Generated Drafts
The system generates drafts of thank-you emails, handwritten notes, and follow-up tasks from conversations, stored for review and editing.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Build Tool**: Vite
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful JSON API (`/api/*` routes)
- **Validation**: Zod schemas shared via `drizzle-zod`

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with `drizzle-kit` for migrations
- **Schema Location**: `shared/schema.ts` (shared between client/server)
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

### Build System
- **Development**: Vite for frontend, `tsx` for backend.
- **Production**: `esbuild` for server, Vite for client.

### UI/UX Decisions
The design philosophy is driven by GTD principles, making the system intelligent reference material rather than a task manager. It prioritizes speed for key workflows like daily reviews and interaction logging. The application integrates Ninja Selling methodologies, including relationship segments (A/B/C/D), transaction stages (Warm/Hot/In Contract/Closed), FORD notes (Family, Occupation, Recreation, Dreams), Ninja Nine habits (daily/weekly), and core working lists (Hot List, Warm List, Your 50). Key workflows supported are weekly planning meetings, daily start-up routines, and 8x8 campaigns.

### Feature Specifications
Key features include a Contact Due Calculator, D Contact Review system, AI Assistant with agentic tools, voice profile learning, generated drafts, and sync APIs for external sources. Future features aim for anticipatory intelligence, network intelligence, reflective intelligence (AI chief of staff), memory augmentation, decision support, and skill development.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.

### UI Component Dependencies
- **Radix UI**: Headless components.
- **Lucide React**: Icon library.
- **date-fns**: Date formatting.
- **embla-carousel-react**: Carousel functionality.
- **recharts**: Charts.

### Planned Integrations (UI exists, not yet connected)
- **SendGrid**: Email delivery.
- **Cloze CRM**: Downstream sync.
- **Todoist**: Task management (GTD system of record).
- **Plaud Note**: Voice conversation transcription.
- **Fathom.video**: Meeting recording and transcription.
- **Granola**: Meeting notes.
- **OpenAI/Anthropic/Gemini**: AI processing for voice logs.
- **Gmail/Google Calendar**: Email and scheduling.