# Ninja OS - Ninja Selling Operating System

## Overview

Ninja OS is a single-user personal business operating system built for real estate professionals following the Ninja Selling methodology. The application unifies Weekly Meeting Agenda (WMA), FORD relationship tracking, client intelligence, business execution tracking, and deal management into one cohesive platform.

The app serves as the source of truth for Ninja Selling workflows, prioritizing speed and efficiency: Weekly Meeting Agenda completion in under 10 minutes, FORD interaction logging in under 60 seconds. This is a personal productivity tool with no multi-user features, public access, gamification, or pipeline UI.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Build Tool**: Vite
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful JSON API with `/api/*` routes
- **Validation**: Zod schemas shared between frontend and backend via drizzle-zod

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Core Tables**: users, people, deals, tasks, meetings, calls, weeklyReviews, notes

### Project Structure
```
├── client/           # React frontend application
│   ├── src/
│   │   ├── components/  # UI components (shadcn/ui)
│   │   ├── pages/       # Route components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities and query client
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database access layer
│   └── db.ts         # Database connection
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle schema + Zod validation
└── migrations/       # Database migrations
```

### Key Design Patterns
- **Shared Schema**: Database schema and TypeScript types are defined once in `shared/schema.ts` and used by both frontend and backend
- **Storage Interface**: `server/storage.ts` provides a clean abstraction over database operations
- **Path Aliases**: `@/` for client code, `@shared/` for shared code
- **Component Library**: shadcn/ui components in `client/src/components/ui/`

### Build System
- Development: Vite dev server with HMR for frontend, tsx for backend
- Production: esbuild bundles server, Vite builds client to `dist/public`

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage (available but not currently implemented)

### Planned Integrations (UI exists, not yet connected)
- **Cloze CRM**: Downstream sync for relationship data
- **Todoist**: Task management (GTD system of record)
- **Plaud Note**: Voice conversation transcription
- **Fathom.video**: Meeting recording and transcription
- **Granola**: Meeting notes
- **OpenAI/Anthropic/Gemini**: AI processing for voice logs
- **Gmail/Google Calendar**: Email and scheduling integration

### UI Component Dependencies
- **Radix UI**: Headless component primitives
- **Lucide React**: Icon library
- **date-fns**: Date formatting
- **embla-carousel-react**: Carousel functionality
- **recharts**: Charts (via shadcn/ui chart component)