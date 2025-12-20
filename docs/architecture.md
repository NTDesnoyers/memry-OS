# System Architecture

> Last updated: December 2024

## System Map

### Backend Modules

| Module | File | Responsibility |
|--------|------|----------------|
| **Server Entry** | `server/index.ts` | Express app initialization, middleware setup, starts HTTP server on port 5000 |
| **API Routes** | `server/routes.ts` | All REST API endpoints (~3500 lines), request validation, response handling |
| **Storage Layer** | `server/storage.ts` | Database abstraction via `IStorage` interface, all Drizzle ORM queries |
| **Database Connection** | `server/db.ts` | PostgreSQL connection pool using `DATABASE_URL` |
| **AI Tools** | `server/ai-tools.ts` | OpenAI function calling tools (9 tools: search_people, log_interaction, etc.) |
| **Gmail Client** | `server/gmail-client.ts` | Gmail API integration for sending emails and creating drafts |
| **Todoist Client** | `server/todoist-client.ts` | Todoist API integration for task sync |
| **Vite Config** | `vite.config.ts` | Frontend build configuration, dev server proxy to Express |

### Frontend Modules

| Module | Directory | Responsibility |
|--------|-----------|----------------|
| **App Shell** | `client/src/App.tsx` | Root component, routing setup with Wouter |
| **Pages** | `client/src/pages/` | Route-level components (Dashboard, People, Deals, etc.) |
| **UI Components** | `client/src/components/ui/` | shadcn/ui primitives (Button, Dialog, Card, etc.) |
| **Feature Components** | `client/src/components/` | Domain-specific components (PersonCard, DealPipeline, etc.) |
| **Hooks** | `client/src/hooks/` | Custom React hooks for data fetching and state |
| **Lib** | `client/src/lib/` | Utilities, query client config, API helpers |

### Shared Modules

| Module | File | Responsibility |
|--------|------|----------------|
| **Schema** | `shared/schema.ts` | Drizzle table definitions, Zod validation schemas, TypeScript types |

### Local Sync Agent (Python)

| Module | File | Responsibility |
|--------|------|----------------|
| **Sync Manager** | `local-sync-agent/sync_manager.py` | Unified runner for all sync agents, daemon mode |
| **Sync Client** | `local-sync-agent/sync_client.py` | HTTP client for Ninja OS sync API |
| **Granola Sync** | `local-sync-agent/sync_granola.py` | Reads Granola cache, pushes meeting notes |
| **Plaud Sync** | `local-sync-agent/sync_plaud.py` | Transcribes audio recordings, pushes to API |
| **iMessage Sync** | `local-sync-agent/sync_imessage.py` | Reads macOS Messages database, pushes texts |
| **WhatsApp Sync** | `local-sync-agent/sync_whatsapp.py` | Parses WhatsApp chat exports |
| **Config** | `local-sync-agent/config.py` | Sync agent configuration (URLs, paths, intervals) |

---

## Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Authentication | username, password |
| `people` | Contacts/CRM | name, segment (A/B/C/D), FORD fields, buyer needs |
| `households` | Address groupings | name, address, primaryPersonId |
| `deals` | Pipeline tracking | personId, stage (warm/hot/in_contract/closed), value |
| `tasks` | Follow-up actions | personId, title, dueDate, completed, todoistId |
| `interactions` | Call/meeting/text log | personId, type, transcript, source, occurredAt |
| `generated_drafts` | AI-generated content | personId, type (email/note), content, status |
| `voice_profile` | Learned communication style | category, value, frequency |
| `sync_logs` | External sync tracking | source, status, itemsProcessed |
| `meetings` | Legacy meeting records | personId, transcript, summary |
| `calls` | Legacy call records | personId, duration, notes |
| `notes` | Handwritten notes | personId, content, sentAt |
| `weekly_reviews` | Ninja Nine tracking | weekOf, metrics |
| `listings` | Property listings (Haves) | address, price, status |
| `email_campaigns` | Newsletter campaigns | subject, recipients, sentAt |
| `business_settings` | Annual goals/fees | year, annualGCIGoal, splits |
| `agent_profile` | User info | name, email, brokerage |
| `pie_entries` | Time tracking | date, pTime, iTime, eTime |
| `real_estate_reviews` | Annual review meetings | personId, scheduledDate, status |
| `pricing_reviews` | CMA records | propertyAddress, suggestedPrice |
| `ai_conversations` | AI chat history | messages (JSON), context |

---

## API Endpoints by Domain

### People
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/people` | List all contacts |
| POST | `/api/people` | Create contact |
| GET | `/api/people/:id` | Get contact details |
| PUT | `/api/people/:id` | Update contact |
| DELETE | `/api/people/:id` | Delete contact |
| GET | `/api/people/due-for-contact` | Contacts needing follow-up |

### Deals
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/deals` | List all deals |
| POST | `/api/deals` | Create deal |
| PUT | `/api/deals/:id` | Update deal |
| PUT | `/api/deals/:id/stage` | Move deal stage |

### Tasks
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| PUT | `/api/tasks/:id/complete` | Mark complete |

### Interactions
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/interactions` | List interactions |
| POST | `/api/interactions` | Create interaction |
| POST | `/api/interactions/:id/process` | AI process transcript |
| DELETE | `/api/interactions/:id` | Soft delete |

### Sync API
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/sync/push` | Push items from external source |
| POST | `/api/sync/transcribe` | Transcribe audio + create interaction |
| GET | `/api/sync/search-person` | Find person by phone/email/name |
| GET | `/api/sync/logs` | View sync history |

### AI
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/ai/chat` | Send message to AI assistant |
| GET | `/api/ai/conversations` | List AI conversations |

### Integrations
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/gmail/status` | Check Gmail connection |
| POST | `/api/gmail/send` | Send email |
| GET | `/api/todoist/status` | Check Todoist connection |
| POST | `/api/todoist/tasks` | Create Todoist task |
| POST | `/api/todoist/sync-tasks` | Sync all tasks to Todoist |

---

## Data Flow Diagrams

### Interaction Processing Flow
```
External Source (Granola/Plaud/iMessage/WhatsApp)
       ↓
  Local Sync Agent (Python on Mac)
       ↓
  POST /api/sync/push
       ↓
  Match to Person (by phone/email/name)
       ↓
  Create Interaction Record
       ↓
  Update Person.lastContact
       ↓
  POST /api/interactions/:id/process (AI)
       ↓
  Extract FORD Notes → Update Person
       ↓
  Generate Thank-You Draft → Save to generated_drafts
```

### Task Sync Flow
```
Create Task in Ninja OS
       ↓
  POST /api/todoist/sync-tasks
       ↓
  Create in Todoist with labels
       ↓
  Store todoistId in task record
       ↓
  User completes in Todoist
       ↓
  (Manual sync back or webhook)
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Single PostgreSQL database | Simplicity, Replit-native, supports rollback |
| Drizzle ORM | Type-safe, lightweight, good DX |
| Local sync agents (not webhooks) | Privacy, no external accounts needed, works offline |
| Soft-delete for interactions | Allow recovery, audit trail |
| Voice profile learning | Personalized drafts that sound like the user |
| Todoist as task system-of-record | GTD philosophy - one place for all tasks |
| shadcn/ui components | Accessible, customizable, no vendor lock-in |

---

## File Count Summary

```
client/src/           ~50 files (React components, pages, hooks)
server/               ~10 files (Express backend)
shared/               1 file (schema.ts)
local-sync-agent/     7 files (Python sync scripts)
```

---

*This document should be regenerated when major architectural changes occur.*
