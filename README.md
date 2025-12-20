# Ninja OS

A personal business operating system for real estate professionals following the Ninja Selling methodology. Combines relationship management, conversation intelligence, and task automation into a unified platform.

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Main Flows](#main-flows)
- [Getting Started](#getting-started)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Local Sync Agent](#local-sync-agent)

---

## Overview

### Purpose
Ninja OS serves as the source of truth for Ninja Selling workflows, prioritizing speed and efficiency:
- Weekly Meeting Agenda completion in under 10 minutes
- FORD interaction logging in under 60 seconds
- Automatic relationship intelligence extraction from conversations

### Design Philosophy
Following GTD (Getting Things Done) principles, Ninja OS is **intelligent reference material**, not a task manager:
- Stores relationship data, FORD notes, transaction history
- Calculates when contacts are due based on segment frequency rules
- Generates follow-up tasks and exports to Todoist
- Keeps execution in Todoist, intelligence in Ninja OS

### Key Concepts
| Term | Description |
|------|-------------|
| **FORD** | Family, Occupation, Recreation, Dreams - core relationship fields |
| **Segments** | A (monthly), B (every 2 months), C (quarterly), D (develop/delete) |
| **Hot List** | Likely to transact in ~90 days |
| **Warm List** | Likely to transact in ~12 months |
| **Your 50** | Top 50 relationships for frequent contact |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Dashboard│ │  People  │ │  Deals   │ │   AI    │           │
│  │          │ │  Manager │ │ Pipeline │ │Assistant│           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                              ↓                                   │
│                     TanStack Query (State)                       │
└─────────────────────────────────────────────────────────────────┘
                               ↓ HTTP
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Express)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │   API    │ │  Sync    │ │    AI    │ │External │           │
│  │  Routes  │ │   API    │ │Processing│ │ Integs  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                              ↓                                   │
│                     Storage Layer (Drizzle)                      │
└─────────────────────────────────────────────────────────────────┘
                               ↓ SQL
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                          │
│  people │ interactions │ deals │ tasks │ drafts │ sync_logs    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Local Sync Agent (Python)                       │
│  Runs on Mac, pushes to cloud via /api/sync/*                   │
│  ┌────────┐ ┌───────┐ ┌──────────┐ ┌──────────┐                │
│  │Granola │ │ Plaud │ │ iMessage │ │ WhatsApp │                │
│  └────────┘ └───────┘ └──────────┘ └──────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components (shadcn/ui)
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities, API client
├── server/                 # Express backend
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database access layer
│   ├── db.ts               # Database connection
│   ├── ai-tools.ts         # AI function calling tools
│   ├── gmail-client.ts     # Gmail integration
│   └── todoist-client.ts   # Todoist integration
├── shared/                 # Shared code
│   └── schema.ts           # Drizzle schema + Zod types
├── local-sync-agent/       # Python sync scripts
│   ├── sync_manager.py     # Unified sync manager
│   ├── sync_granola.py     # Granola meetings
│   ├── sync_plaud.py       # Plaud recordings
│   ├── sync_imessage.py    # iMessage texts
│   └── sync_whatsapp.py    # WhatsApp exports
└── migrations/             # Database migrations
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool + dev server |
| Tailwind CSS v4 | Styling |
| shadcn/ui | Component library (Radix primitives) |
| TanStack Query | Server state management |
| Wouter | Lightweight routing |
| React Hook Form + Zod | Form handling + validation |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express | HTTP server |
| TypeScript (ESM) | Type safety |
| Drizzle ORM | Database queries + migrations |
| Zod | Request validation |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary database |
| Drizzle Kit | Schema migrations |

### AI & Integrations
| Integration | Purpose |
|-------------|---------|
| OpenAI GPT-4o | AI processing, function calling |
| OpenAI Whisper | Audio transcription |
| Anthropic Claude | Alternative AI provider |
| Gmail API | Send emails, create drafts |
| Todoist API | Task sync (GTD system) |
| Google Calendar | Scheduling |
| Google Sheets | Data import/export |

### Local Sync Agent
| Technology | Purpose |
|------------|---------|
| Python 3.9+ | Sync scripts runtime |
| requests | HTTP client |

---

## Main Flows

### 1. People Management
```
Create Person → Set Segment (A/B/C/D) → Add FORD Notes → Track Contact Frequency
                                                              ↓
                              When overdue → Generate "Contact Due" task
```

### 2. Interaction Logging
```
Log Call/Meeting/Text → Link to Person → Update lastContact → Store Transcript
                                                                    ↓
                                              AI Processing → Extract FORD → Update Person
```

### 3. Deal Pipeline
```
Create Deal (linked to Person) → Warm → Hot → In Contract → Closed
                                   ↓      ↓
                            (90-day focus) (daily focus)
```

### 4. Task Flow
```
Create Task → Set Due Date/Priority → Execute → Mark Complete
      ↓                                              ↓
  Sync to Todoist                              Update in Both Systems
```

### 5. AI Assistant (Agentic)
```
User Query → AI Analyzes → Calls Tools (up to 5 sequential) → Returns Result
                               ↓
            Tools: search_people, log_interaction, create_task,
                   update_deal_stage, get_hot_warm_lists, etc.
```

### 6. External Sync
```
Local Mac Agent → Read Source Data → Push to /api/sync/push → Match to Person
                                                                    ↓
                                              Create Interaction → Update lastContact
```

### 7. Draft Generation
```
Interaction Processed → Extract Voice Profile → Generate Thank-You Email
                                                       ↓
                              Generate Handwritten Note → Queue for Review
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (provided by Replit)
- OpenAI API key

### Environment Variables
```bash
DATABASE_URL          # PostgreSQL connection string (auto-provided)
OPENAI_API_KEY        # For AI processing and transcription
ANTHROPIC_API_KEY     # Optional: Alternative AI provider
```

### Installation
```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`.

---

## Development

### Commands
```bash
npm run dev          # Start development server (frontend + backend)
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio (database GUI)
npm run build        # Build for production
npm run start        # Start production server
```

### Adding a New Feature

1. **Schema First**: Define types in `shared/schema.ts`
2. **Storage Layer**: Add queries in `server/storage.ts`
3. **API Routes**: Add endpoints in `server/routes.ts`
4. **Frontend**: Create components in `client/src/`

### Code Conventions
- Use existing shadcn/ui components from `client/src/components/ui/`
- Follow existing patterns for API calls (TanStack Query hooks)
- Add `data-testid` attributes to interactive elements
- Use Zod schemas for validation (shared between frontend/backend)

---

## Testing

### Running Tests
```bash
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run with coverage report
```

### Test Structure
```
tests/
├── api/             # API endpoint tests
│   ├── people.test.ts
│   ├── interactions.test.ts
│   ├── deals.test.ts
│   └── sync.test.ts
├── storage/         # Database layer tests
└── helpers/         # Test utilities
```

### Main Test Flows
1. **People CRUD**: Create, read, update, search, segment filtering
2. **Interaction Logging**: Create interaction, auto-update lastContact
3. **Deal Pipeline**: Stage transitions, history tracking
4. **Task Management**: Create, complete, query overdue
5. **Sync API**: Push items, person matching, deduplication

---

## Deployment

### Replit Deployment
1. Click **Deploy** in the Replit interface
2. The app will be built and deployed to a `.replit.app` domain
3. Database is automatically provisioned

### Environment Setup
- Development secrets are configured in Replit Secrets
- Production uses the same database (Neon-backed PostgreSQL)

### Health Check
The deployment includes automatic health checks on the root endpoint.

---

## Local Sync Agent

The local sync agent runs on your Mac to bridge local apps into Ninja OS.

### Supported Sources
| Source | Data Type | Requirements |
|--------|-----------|--------------|
| Granola | Meeting notes | Granola app installed |
| Plaud | Voice recordings | Audio files |
| iMessage | Text messages | Full Disk Access permission |
| WhatsApp | Chat exports | Manual export from phone |

### Setup
```bash
cd local-sync-agent
pip install -r requirements.txt

# Edit config.py with your Ninja OS URL
# NINJA_OS_URL = "https://your-app.replit.app"
```

### Usage
```bash
# Run all syncs once
python sync_manager.py

# Run continuously (every 15 minutes)
python sync_manager.py --daemon

# Sync specific sources
python sync_manager.py --sources granola imessage
```

### Running as Background Service
See `local-sync-agent/README.md` for Launch Agent setup instructions.

---

## API Reference

### Core Endpoints

#### People
- `GET /api/people` - List all people
- `POST /api/people` - Create person
- `GET /api/people/:id` - Get person
- `PUT /api/people/:id` - Update person
- `DELETE /api/people/:id` - Delete person
- `GET /api/people/due-for-contact` - Get people needing contact

#### Interactions
- `GET /api/interactions` - List interactions
- `POST /api/interactions` - Create interaction
- `POST /api/interactions/:id/process` - AI process transcript

#### Deals
- `GET /api/deals` - List deals
- `POST /api/deals` - Create deal
- `PUT /api/deals/:id/stage` - Update deal stage

#### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id/complete` - Mark complete

#### Sync API
- `POST /api/sync/push` - Push items from external source
- `POST /api/sync/transcribe` - Transcribe audio + create interaction
- `GET /api/sync/search-person` - Find person by phone/email/name
- `GET /api/sync/logs` - View sync history

#### AI Assistant
- `POST /api/ai/chat` - Send message to AI assistant

---

## Contributing

1. Check existing patterns before adding new code
2. Use TypeScript strictly (no `any` unless necessary)
3. Add tests for new features
4. Update this README when adding major features

---

## License

Private - All rights reserved.
