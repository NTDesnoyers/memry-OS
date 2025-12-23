# Ninja OS - Relationship Intelligence Platform

## Massive Transformative Purpose (MTP)
"Rewiring how opportunity flows by building the connective intelligence that enables human potential to scale in the age of abundance."

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

## Feature Roadmap

### Client-Facing AI Chatbot (Future)
A client-facing AI assistant trained in the user's voice with access to real estate knowledge:
- **Voice-Trained Model**: Uses learned voice profile to respond authentically
- **Real Estate Knowledge Base**: Access to market data, property info, and common Q&A
- **SMS/Phone Integration**: Clients can text a dedicated phone number
- **Embedded Chat Widget**: Chat embedded in digital Real Estate Review landing pages
  - "Ask me questions about this" prompt on review pages
  - Context-aware: knows which property/review the client is viewing
  - Answers questions about market data, property details, pricing strategy
- **Group Chat Visibility**: User sees all client questions and AI responses in real-time
- **Human Override**: User can step in to correct or add context when needed
- **Conversation Logging**: All client interactions logged for:
  - Adding to person's timeline/FORD notes
  - Training data for model improvement
  - Quality assurance and follow-up identification
- **Implementation Considerations**: Twilio for SMS, fine-tuned model, moderation layer

### Life Event Monitor Agent (Future)
An agentic AI that monitors public social media of existing contacts (friends/sphere) for life changes that signal real estate needs:

**Family & Household Changes**
- Increase in family size (new baby, blended family, caregiving for relatives)
- Children age 10 and under (school districts, yard space, safety needs)
- Teenage children (more space, school changes, activity proximity)
- Children recently left home (downsizing, lifestyle shift)

**Financial & Career Triggers**
- Company expansion / career growth (income increase, relocation, upgrade)
- Company downsizing / job loss (forced move, cost reduction)
- Substantial inheritance received (opportunity-based move or investment)
- Living "below their means" (capacity and desire to upgrade)
- Dream for "wake-up money" (investment real estate intent)

**Life Transitions**
- Getting married (combining households)
- Getting divorced (household split)
- Divorced AND remarried (complex but high move probability)
- Dream to live "anywhere" (remote work, lifestyle relocation)

**Property & Location Signals**
- Lived in same house 8+ years (equity buildup + readiness for change)
- Own a building lot (intent to build or sell)
- Long commute (time pain → relocation motivation)

**Technical Implementation**
- Store contacts' social media URLs in People database
- Periodic AI agent scans public profiles for keywords/patterns
- Classifies changes and alerts user with context and suggested outreach
- Respects platform ToS and privacy considerations
- For friends/sphere only - relationship-based, not surveillance

### Industry Overlay Architecture (Future)
The core of the system is **Relationship Intelligence Software** - applicable to any relationship-based profession. The current implementation is a "Ninja Selling" overlay for real estate professionals.

**Modular Overlay System**
- **Core Platform**: Universal relationship intelligence engine (FORD tracking, contact cadence, life event monitoring, AI analysis)
- **Industry Skins/Overlays**: Configurable UI, terminology, workflows, and triggers for specific industries
- **First Overlay**: Ninja Selling for Real Estate (current implementation)

**Potential Industry Overlays**
- **Financial Advisors**: Client wealth events, retirement triggers, inheritance planning signals
- **Insurance Agents**: Life change triggers, family expansion, asset acquisition signals
- **Wealth Management**: Portfolio events, liquidity needs, generational wealth transfer
- **Executive Recruiters**: Career transition signals, company changes, skill development
- **B2B Sales**: Company growth signals, funding rounds, leadership changes
- **Professional Services** (Lawyers, Accountants): Business lifecycle events, compliance triggers

**Implementation Strategy**
- Industry overlays may require outside help: employees or high-level agentic AIs
- Each overlay needs domain expertise for trigger definitions and workflow design
- Core relationship intelligence remains universal across overlays

### Enterprise Application Vision (Future)
Scaling relationship intelligence from individual practitioners to organizations.

**Enterprise Use Cases**

1. **Sales Team Intelligence**
   - Unified relationship graph across entire sales organization
   - Warm handoffs between team members with full context
   - Team-wide life event monitoring and lead distribution
   - Coaching insights aggregated across team performance

2. **Customer Success at Scale**
   - Proactive churn prediction via relationship health scoring
   - Automated relationship handoffs during team transitions
   - Customer journey intelligence with relationship context
   - Multi-stakeholder relationship mapping within accounts

3. **Professional Services Firms**
   - Partner relationship networks with referral tracking
   - Client relationship continuity across personnel changes
   - Cross-selling intelligence based on relationship patterns
   - Rainmaker coaching and skill development at scale

4. **Financial Institutions**
   - Advisor-client relationship health monitoring
   - Life event-based product recommendations
   - Compliance-aware relationship documentation
   - Multi-generational family relationship mapping

5. **Healthcare Networks**
   - Patient relationship management for concierge practices
   - Referral network intelligence for specialists
   - Care team coordination with relationship context

**Enterprise Features Required**
- Multi-user access with role-based permissions
- Team relationship graphs with shared/private segments
- Admin dashboards for coaching and performance insights
- API integrations for CRM systems (Salesforce, HubSpot)
- SSO/SAML authentication
- Audit trails and compliance reporting
- White-label/custom branding options

**Go-to-Market Considerations**
- Start with individual practitioners (current)
- Expand to small teams (2-10 users)
- Scale to enterprise (multi-team, org-wide)
- Potential SaaS pricing: per-seat + AI usage tiers