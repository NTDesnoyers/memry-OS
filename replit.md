# Ninja OS - Ninja Selling Operating System

## Overview

Ninja OS is a single-user personal business operating system built for real estate professionals following the Ninja Selling methodology. The application unifies Weekly Meeting Agenda (WMA), FORD relationship tracking, client intelligence, business execution tracking, and deal management into one cohesive platform.

The app serves as the source of truth for Ninja Selling workflows, prioritizing speed and efficiency: Weekly Meeting Agenda completion in under 10 minutes, FORD interaction logging in under 60 seconds. This is a personal productivity tool with no multi-user features, public access, gamification, or pipeline UI.

## User Preferences

Preferred communication style: Simple, everyday language.

## Ninja Selling Methodology

Ninja Selling is a relationship-first, process-driven sales system. Agents increase income per hour by focusing on people they know, delivering value, and following consistent daily/weekly habits rather than chasing leads with pressure tactics.

### Core Philosophy
- **Serve, don't sell**: Focus on solving problems and adding value so business is attracted, not pushed
- **Abundance mindset**: Plenty of business exists; stay in flow with people and listen for life changes that create housing needs
- **Process over personality**: Simple, repeatable routines (Ninja Nine, Hot/Warm Lists, real estate reviews) drive results via systems, not motivation spikes

### Mindset, Skillset, Actions
- **Mindset**: Gratitude, affirmations, positive focus, clarity about life goals and ideal week
- **Skillset**: Ninja Consultation, Ten-Step Buyer Process, FORD conversations, personality styles (Power/Party/Peace/Perfection)
- **Actions**: Ninja Nine habits and weekly planning that turn mindset and skills into consistent contact and transaction flow

### Relationship Segments (A/B/C/D) - "Who are they to me?"
- **A – Advocates**: Raving fans who refer consistently
- **B – Fans**: Like and trust you, refer occasionally
- **C – Network**: Acquaintances, light relationship; keep in flow
- **D – 8×8**: New or target relationships; develop using 8-touch, 8-week campaign

### Transaction Stages - "Where are they in a transaction?"
- **Warm**: Likely to buy/sell within ~12 months; life change brewing
- **Hot**: Likely to buy/sell in ~90 days; clear motivation and timeline
- **In Contract**: Under contract / pending
- **Closed**: Closed buyer or seller
- **Lost**: Transacted with someone else or timing canceled

**Design rule**: A/B/C/D = long-term relationship value; Warm/Hot/In Contract/Closed = current transaction status

### FORD Notes (Core Relationship Fields)
- **Family**: Spouse, children, parents, pets, family dynamics
- **Occupation**: Job, career, company, work situation
- **Recreation**: Hobbies, interests, sports, travel, activities
- **Dreams**: Goals, aspirations, future plans, bucket list items

FORD notes are viewed before calls and handwritten notes. Watch for **changes** in FORD as triggers for Warm/Hot status (new baby, job change, retirement, marriage/divorce, relocation).

### Ninja Nine: Daily & Weekly Habits

**Daily (5)**
1. Gratitudes / affirmations / positive reading
2. Show up and stay on agenda (time block; work "on" business before email)
3. Write 2 personal, handwritten notes
4. Focus on your Hot List
5. Focus on your Warm List

**Weekly (4)**
6. Make weekly customer service calls (to active and recent clients)
7. Schedule/conduct two real estate reviews (annual home value check-up)
8. Have 50 live interviews (voice or face-to-face FORD conversations)
9. Update and clean database (contact info, tags, stages, FORD notes)

### Core Working Lists

**Hot List**
- People likely to buy/sell in ~90 days
- Driven by high "pain or pleasure" (strong motivation)
- Daily focus: "Who can I write a contract with this week?"
- Needs: quick access, clear reason on list, next actions, last touch date

**Warm List**
- People likely to buy/sell within ~12 months
- Something in FORD is changing but timing is softer
- Tag with the change (e.g., "expecting baby," "job hunt," "downsizing in 2025")

**Your 50**
- Top 50 relationships (A/B advocates, high lifetime value)
- Intentional frequent flow; ensure they never feel neglected
- Priority for notes, invites, and personal touches

### Key Workflows to Support

**Weekly Planning Meeting** (1 hour, look back then forward)
- Review prior week Ninja Nine metrics
- Scan Hot/Warm Lists: who needs conversation? Who moves stages?
- Choose 2 people for real estate reviews
- Plan 50 live interviews and Hour of Power blocks

**Daily Start-Up Routine**
- Capture gratitudes/affirmations
- Open Today view: Hot List, Warm List, Your 50
- Suggest 2 contacts for handwritten notes

**8×8 Campaign for D Contacts**
- 8 consecutive weeks, 1 touch per week (mix of phone, text, email, mail, in-person)
- Track current step (1-8), suggested next touch type
- Success outcome: book in-person meeting, move to Warm or A/B

### Speed Priorities
- **Fast (one-click, multiple times daily)**: Today dashboard, Hot List, Warm List, Your 50, Live interview counter
- **Comprehensive (deeper views)**: Full contact profile, detailed pipeline, real estate review builder, campaign builders

### Terminology Quick Reference
| Term | Meaning |
|------|---------|
| Ninja Nine | 5 daily + 4 weekly success habits |
| Hot List | Buy/sell in ~90 days |
| Warm List | Buy/sell in ~12 months |
| Your 50 | Top 50 relationships for frequent contact |
| A/B/C/D | Relationship categories (Advocates → 8×8 targets) |
| FORD | Family, Occupation, Recreation, Dreams |
| Live Interviews | 50 weekly FORD conversations |
| 8×8 | 8 touches in 8 weeks for new relationships |
| Real Estate Review | Annual home equity/value check-in |

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
- **Core Tables**: users, people, deals, tasks, meetings, calls, weeklyReviews, notes, listings, emailCampaigns

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
- **SendGrid**: Email delivery for Haves & Wants newsletter (user dismissed integration setup - will configure later)
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