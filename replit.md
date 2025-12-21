# Ninja OS - Ninja Selling Operating System

## Overview

Ninja OS is a single-user personal business operating system built for real estate professionals following the Ninja Selling methodology. The application unifies Weekly Meeting Agenda (WMA), FORD relationship tracking, client intelligence, business execution tracking, and deal management into one cohesive platform.

The app serves as the source of truth for Ninja Selling workflows, prioritizing speed and efficiency: Weekly Meeting Agenda completion in under 10 minutes, FORD interaction logging in under 60 seconds. This is a personal productivity tool with no multi-user features, public access, gamification, or pipeline UI.

### Design Philosophy: GTD + Intelligent Reference Material
Following Getting Things Done (GTD) principles, Ninja OS is **intelligent reference material**, NOT a task manager. The system:
- Stores relationship data, FORD notes, transaction history, and contact frequency rules
- Calculates when contacts are due based on segment (A=monthly, B=every 2 months, C=quarterly)
- Generates tasks for "contact this person" based on rules
- **Exports tasks to Todoist** where all life tasks are managed in one place
- Keeps the user's attention in Todoist for execution, returns here for reference and intelligence

## User Preferences

Preferred communication style: Simple, everyday language.

### AI Assistant (Agentic Mode)
The AI assistant is fully agentic - it can take actions, not just give advice. Using OpenAI function calling, it has 9 tools:
- **search_people**: Find contacts by name, email, segment, or any attribute
- **get_person_details**: View complete person record including FORD notes and deals
- **update_person**: Modify segment, FORD notes, buyer needs, contact info
- **create_person**: Add new contacts to the database
- **log_interaction**: Record calls, meetings, emails, texts with automatic last-contact update
- **create_task**: Create follow-up tasks with due dates and priorities
- **update_deal_stage**: Move deals through warm → hot → in_contract → closed
- **get_hot_warm_lists**: Retrieve current Hot and Warm lists
- **get_todays_tasks**: Get tasks due today or overdue

The AI executes up to 5 sequential tool calls per request, allowing complex multi-step operations like "find Miguel, log a call, and create a follow-up task for next week".

### Voice Profile Learning
The system learns Nathan's unique communication style from conversation transcripts. It extracts:
- **Greetings**: How Nathan opens conversations ("Hey there!", "How's it going?")
- **Sign-offs**: How he closes conversations
- **Expressions**: Common phrases he uses ("That's awesome", "Definitely", "All right")
- **Tone Notes**: Observations about his style (casual, enthusiastic, conversational)
- **Compliment Patterns**: How he gives praise
- **Question Styles**: How he asks questions and shows interest

This voice profile is used when generating emails, handwritten notes, and marketing content to sound authentically like Nathan rather than generic AI-generated content.

### AI-Generated Drafts
After processing conversations, the system generates:
- **Thank-you Emails**: Professional but warm 2-3 paragraph emails
- **Handwritten Notes**: 2-3 sentences starting with "Thank you/It was great/Congratulations", focused on the other person, ending with a P.S. call to action
- **Follow-up Tasks**: Action items extracted from conversations

Drafts are stored in the `generated_drafts` table and can be reviewed/edited before sending.

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

### Relationship Segments (A/B/C/D) - Contact Frequency Categories
Segments define required contact frequency, not permanent relationship status. People can move between segments.

- **A – Raving Fans**: Contact once per month (call or text)
- **B – Strong Relationships**: Contact every 2 months
- **C – Network**: Contact quarterly (once every 3 months)
- **D – Develop or Delete**: Fresh contacts in database; nurture via 8×8 campaign or remove

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
- **Core Tables**: users, people, deals, tasks, meetings, calls, weeklyReviews, notes, listings, emailCampaigns, interactions, generatedDrafts, voiceProfile

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

## Roadmap

### Completed Features
- Contact Due Calculator (Hot=weekly, Warm=monthly, A/B/C/D segment-based)
- D Contact Review system (stale tracking, low engagement detection, 8×8 campaigns)
- AI Assistant with 9 agentic tools
- Voice profile learning from conversations
- Generated drafts (emails, handwritten notes)
- Sync API for external sources (Granola, Plaud, iMessage, WhatsApp)

### Future Features (Low Priority)
- **Personal Brand Landing Page**: Custom website integrated with Ninja OS, using voice profile for authentic copy
- **Lofty API Integration**: Sync leads from Lofty CRM into People database

### Potential Next Features
- **Your 50 List**: Tag and track top 50 priority relationships with dedicated view
- **Todoist Sync**: Export generated tasks to Todoist (GTD system of record)
- **Mobile-Optimized FORD Logging**: 60-second interaction logging flow
- **Real Estate Review Workflow**: Annual home equity check-in generator
- **Hot/Warm Dashboard Widget**: Quick-glance counts and overdue alerts on main dashboard
- **Interaction Response Tracking**: Mark interactions as "got response" to power engagement scoring
- **WhatsApp/Beeper Real-Time Sync**: Options include Beeper integration (unified inbox for all messaging apps) or WhatsApp Web bridge for automated sync. Manual export method already works via local-sync-agent.