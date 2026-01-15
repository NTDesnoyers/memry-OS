# Memry

**Relationship Intelligence for Real Estate Professionals**

Memry is a multi-tenant SaaS platform that transforms how real estate professionals manage relationships. Instead of treating a CRM as a data graveyard, Memry captures conversations naturally and generates actionable follow-ups automatically.

[Live Demo](https://memryos.io)

## The Problem

Real estate is a relationship business, but most CRMs fail relationship-focused professionals:

- **Logging friction**: Agents skip logging conversations because it's tedious
- **Follow-up gaps**: Great conversations happen, but follow-ups fall through the cracks
- **Generic outreach**: Without context, agents send templated messages that feel impersonal
- **Data decay**: Contact notes become stale because updating them is a chore

## The Solution

Memry inverts the CRM paradigm. Instead of forms and fields, you simply tell the AI what happened:

> "Just grabbed coffee with Sarah Chen. She mentioned her daughter Emma is starting kindergarten next fall and they're thinking about downsizing once the kids are out of the house. She's also training for her first marathon."

Memry automatically:
1. Logs the interaction with timestamp
2. Updates relationship notes (FORD: Family, Occupation, Recreation, Dreams)
3. Creates a follow-up Signal for you to review
4. Generates a contextual draft (email, text, or handwritten note)

## Core Features

### Flow
The conversation timeline. Every interaction is captured and searchable, giving you a complete history of each relationship.

### Signals
The decision inbox. Each conversation creates exactly one Signal—a prompt to take action. You choose: send an email, text, handwritten note, create a task, or skip. No autonomous AI actions; you stay in control.

### Actions
Task management integrated with the relationship context. Tasks know who they're about and why they exist.

### Weekly Review
GTD-inspired weekly planning. Review your sphere, identify who needs attention, and plan your week's relationship investments.

### Contacts
Your sphere organized by relationship depth (A/B/C/D segments) and transaction pipeline status. Due dates surface who you haven't connected with recently.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, TanStack Query, Tailwind CSS v4, shadcn/ui |
| Backend | Node.js, Express, TypeScript (ESM) |
| Database | PostgreSQL with Drizzle ORM |
| AI | OpenAI GPT-4o for conversation processing and draft generation |
| Auth | Replit OpenID Connect |
| Payments | Stripe (checkout, webhooks, customer portal) |

## Architecture Decisions

### Event-Driven Signal System
Rather than autonomous AI actions, every conversation produces a Signal that requires human decision. This keeps the user in control while still providing AI-powered suggestions.

### FORD Framework
Contacts are enriched with Family, Occupation, Recreation, and Dreams notes—the pillars of relationship-based selling. The AI extracts these automatically from conversations.

### Experience Layer
High-magnitude life events (promotions, new babies, moves) are detected and prioritized for follow-up. A friend mentioning their mom passed away gets surfaced differently than someone mentioning they tried a new restaurant.

### Multi-Tenant by Design
All data is scoped by `userId`. The system supports multiple users with complete data isolation.

### Supervised AI
The AI assistant can search, log, and update—but never sends messages without approval. Every draft is reviewed before sending.

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components (shadcn/ui)
│   │   ├── pages/          # Route pages (Flow, Signals, Contacts, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities, API client
├── server/                 # Express backend
│   ├── prompts/            # AI system prompts
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database operations
│   └── ai-tools.ts         # AI function calling tools
├── shared/                 # Shared types and schema
│   └── schema.ts           # Drizzle schema (single source of truth)
└── replit.md               # Project documentation
```

## Key Technical Challenges

### 1. Conversation-to-Action Pipeline
The core challenge was building a reliable pipeline from unstructured conversation logs to actionable follow-ups:
- Natural language processing to extract people, dates, and action items
- FORD categorization (is this about their family or their job?)
- Life event detection with magnitude scoring
- Draft generation that sounds like the user, not a robot

### 2. Signal Deduplication
Preventing signal spam while ensuring nothing falls through the cracks:
- One active signal per person rule
- 7-day expiration with learning layer hooks
- Resolution types that inform future AI behavior

### 3. Multi-Tenant Data Isolation
Every query scoped by userId with a TenantContext pattern:
- `getTenantFilter()` for read operations
- `getEffectiveUserId()` for create operations
- Backward compatibility for founder/legacy data

## What I'd Build Next

**Phase 2: Learning Layer**
- Train on which Signals get resolved vs skipped to improve suggestions
- Learn the user's voice/tone from sent messages for better drafts
- Predictive due dates based on relationship patterns

**Integrations**
- Gmail/Calendar sync for automatic interaction capture
- Todoist/Things 3 export for task management
- CRM sync (Cloze, Follow Up Boss) for teams already invested elsewhere

**Team Features**
- Shared contacts with visibility controls
- Referral routing between team members
- Activity feeds for accountability

## Highlights

- **Supervised AI**: Every AI suggestion requires human approval—no autonomous actions
- **Signal System**: One decision point per conversation, preventing notification fatigue
- **Multi-Tenant Isolation**: Full userId scoping with TenantContext pattern
- **Experience Layer**: Life event detection with magnitude scoring (1-5 scale)
- **Voice Profile Learning**: AI learns user's communication style from sent messages

## Running Locally

### Prerequisites
- Node.js 20+
- PostgreSQL database
- OpenAI API key

### Environment Variables
```bash
DATABASE_URL=postgresql://...      # Required: PostgreSQL connection
OPENAI_API_KEY=sk-...              # Required: AI processing
ANTHROPIC_API_KEY=...              # Optional: Alternative AI
STRIPE_SECRET_KEY=...              # Optional: Payments (disabled in beta)
```

### Setup
```bash
# Clone the repository
git clone https://github.com/NTDesnoyers/memry.git
cd memry

# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server (frontend + backend)
npm run dev
```

The app runs on `http://localhost:5000`. A single `npm run dev` command starts both the Express backend and Vite frontend.

### Exploring the App
Sign in to create an account, then use the AI assistant (bottom-right button) to log your first conversation. The Signal system will generate a follow-up for review.

## Why I Built This

I spent 10+ years in real estate and saw the same pattern repeatedly: agents who were great at building relationships but terrible at systematizing follow-up. They'd have amazing conversations at open houses, networking events, and coffee meetings—then never follow up because "logging it" felt like homework.

Memry is the tool I wished I had. Talk to it like a colleague, and it handles the rest.

---

Built by [Nathan Desnoyers](https://github.com/NTDesnoyers)
