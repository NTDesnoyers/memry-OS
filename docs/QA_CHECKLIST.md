# Ninja OS QA Checklist

Use this checklist before each release to ensure quality and catch issues early.

---

## Responsibility Matrix

### What the AI Agent Can Do

| Check | How It Helps |
|-------|-------------|
| Database health | Run queries to find orphans, check schema integrity |
| API endpoint testing | Call endpoints and verify responses |
| Code review | Spot bugs, security issues, missing error handling |
| Log analysis | Read logs and identify errors/patterns |
| Performance audits | Run Lighthouse and report scores |
| Security scanning | Run npm audit for vulnerabilities |
| Migration verification | Test that migrations run cleanly |
| UI smoke tests | Take screenshots, verify pages load |

### What You Need To Do

| Check | Why It's You |
|-------|-------------|
| OAuth flows | Requires your real Google/Meta credentials |
| Voice conversation | Requires you speaking and listening |
| AI quality judgment | You know if drafts sound like "you" |
| Real email/post sending | Your accounts, your approval |
| User experience feel | Is it intuitive? Only you can tell |
| Beta user feedback | Conversations with your testers |

### Collaborative Checks

| Check | How It Works |
|-------|-------------|
| Manual workflow testing | AI guides, you click through and report |
| Edge case discovery | You describe scenarios, AI tests the code |
| Bug fixes | You report, AI diagnoses and fixes |

---

## Daily/Per-Feature Checks

Quick smoke test after any change:

- [ ] App loads without errors
- [ ] Dashboard renders correctly
- [ ] AI Assistant responds to a simple command
- [ ] Settings page shows profile and connections
- [ ] No unexpected error toasts

---

## Automated Tests & Build Verification

Run these commands before any release (AI can run these for you):

### Build Verification
```bash
# Check for TypeScript errors
npm run check

# Build the application
npm run build

# Run linting (if configured)
npm run lint
```

**Expected results:**
- [ ] No TypeScript errors
- [ ] Build completes successfully
- [ ] No linting errors

### Database Migrations
```bash
# Check migration status
npx drizzle-kit push --dry-run

# Apply migrations (if needed)
npx drizzle-kit push
```

**Expected results:**
- [ ] No pending migrations (or apply them)
- [ ] Schema matches database

### Failure Triage
If any automated checks fail:
1. Read the error message carefully
2. Ask the AI to diagnose and fix
3. Re-run the failing check
4. Don't release until all pass

---

## Pre-Release Checklist

### 1. Core Workflows

**Onboarding & Profile**
- [ ] Intake wizard completes all steps
- [ ] Profile saves and displays correctly
- [ ] Guiding Principles appear in AI context

**Contact Management**
- [ ] CSV import works with sample file
- [ ] Contacts display with correct data
- [ ] Contact search functions properly
- [ ] FORD notes save and retrieve

**Integrations**
- [ ] Gmail OAuth connects successfully
- [ ] Gmail OAuth disconnects cleanly
- [ ] Meta/Instagram connects (sandbox or real)
- [ ] Meta/Instagram disconnects and clears tokens
- [ ] Todoist sync works (if configured)

**AI Features**
- [ ] AI Assistant executes commands correctly
- [ ] Voice conversation starts and stops cleanly
- [ ] Observer suggestions appear appropriately
- [ ] Suggestion feedback (thumbs up/down) saves
- [ ] Generated drafts are coherent and relevant

**Dormant Lead Revival**
- [ ] Gmail scan finds dormant contacts
- [ ] Approval workflow functions
- [ ] Campaign generation creates sensible drafts

**Social Media Posting**
- [ ] Connection status displays correctly
- [ ] AI can check connection status
- [ ] Post creation works (test with sandbox)

---

### 2. Database Health

Run these checks (AI can help):

- [ ] `drizzle-kit push` runs without errors
- [ ] No orphan records (deals without people)
- [ ] No orphan drafts (drafts without interactions)
- [ ] Foreign key relationships intact
- [ ] No duplicate entries in unique fields

**Sample queries to run:**
```sql
-- Find orphan deals
SELECT * FROM deals WHERE person_id NOT IN (SELECT id FROM people);

-- Find orphan drafts  
SELECT * FROM generated_drafts WHERE interaction_id NOT IN (SELECT id FROM interactions);

-- Check for duplicate emails
SELECT email, COUNT(*) FROM people GROUP BY email HAVING COUNT(*) > 1;
```

---

### 3. API Validation

Test key endpoints (AI can help):

- [ ] `GET /api/people` returns contact list
- [ ] `GET /api/profile` returns user profile
- [ ] `POST /api/ai/chat` responds to messages
- [ ] `GET /api/meta/status` returns connection state
- [ ] Invalid requests return 400 (not 500)
- [ ] Missing auth returns 401

---

### 4. OAuth Flow Testing

**Gmail OAuth (You must test):**
- [ ] Fresh connect redirects to Google
- [ ] Callback saves tokens correctly
- [ ] Token refresh works (test after 1 hour)
- [ ] Disconnect clears all tokens
- [ ] Error handling when user denies access

**Meta OAuth (You must test):**
- [ ] Fresh connect redirects to Facebook
- [ ] Callback saves tokens and account info
- [ ] Instagram account detected correctly
- [ ] Disconnect clears connection
- [ ] Error messages for invalid states

---

### 5. AI-Specific Testing

**Quality Checks (You must judge):**
- [ ] Drafts sound natural and match your voice
- [ ] Suggestions are relevant to your data
- [ ] No hallucinated contact names or facts
- [ ] Action items are actionable
- [ ] Email drafts have appropriate tone

**Technical Checks (AI can help):**
- [ ] AI commands execute without errors
- [ ] Tool calls return expected results
- [ ] Error handling for failed API calls
- [ ] Rate limiting doesn't break experience

---

### 6. Performance Checks

- [ ] Dashboard loads in < 3 seconds
- [ ] Contact list renders smoothly (100+ contacts)
- [ ] AI responses arrive in < 10 seconds
- [ ] No memory leaks during long sessions
- [ ] Voice conversation has acceptable latency

---

### 7. Security Checks

Weekly or pre-major-release:

- [ ] Run `npm audit` - no critical vulnerabilities
- [ ] API keys not exposed in client code
- [ ] Tokens stored securely (not in localStorage)
- [ ] Error messages don't leak sensitive data
- [ ] File uploads have size limits
- [ ] OAuth tokens have appropriate scopes

---

## Weekly Maintenance

### Log Review (AI can help)
- [ ] Review application logs for recurring errors
- [ ] Check for failed AI tool calls
- [ ] Look for OAuth token refresh failures
- [ ] Monitor slow database queries

### Security Scan
```bash
# Check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Review any remaining issues manually
```
- [ ] No critical vulnerabilities
- [ ] No high-severity issues (or documented exceptions)

### Performance Check
- [ ] Dashboard loads quickly (< 3 seconds)
- [ ] Database queries performing well
- [ ] No memory growth over time

### Business Metrics
- [ ] Review AI suggestion approval rates
- [ ] Check daily active usage patterns
- [ ] Collect and triage beta feedback
- [ ] Document "magic moment" stories from users

---

## Pre-Beta Release Gate

Before inviting new testers:

- [ ] All core workflow checks pass
- [ ] No critical bugs in backlog
- [ ] Onboarding flow is polished
- [ ] Error messages are user-friendly
- [ ] Help text exists for key features
- [ ] Feedback widget is prominent

---

## Bug Severity Guide

| Severity | Definition | Response Time |
|----------|------------|---------------|
| Critical | App crashes, data loss, security breach | Same day |
| High | Major feature broken, no workaround | 1-2 days |
| Medium | Feature impaired but workaround exists | 1 week |
| Low | Cosmetic issues, minor inconvenience | Backlog |

---

*Last Updated: December 2024*
