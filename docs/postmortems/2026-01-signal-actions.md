# POSTMORTEM: Signal → Action Visibility Failure

**Date**: January 2026  
**Severity**: P1 (User-visible trust failure)  
**Status**: Resolved

## Summary

Users reported that resolving a signal (e.g., clicking "Text") did not result in a visible action. Backend logic and database writes were correct, but the UI failed to update.

## Root Cause

A React Query cache key mismatch:

- Signal resolution invalidated `["/api/drafts"]`
- Drafts page queried `["/api/generated-drafts"]`

As a result, the cache was never invalidated and the UI did not re-render.

## Why This Was Dangerous

- The system did the correct work
- But appeared broken to the user
- This mimicked earlier trust-destroying bugs where "nothing happened"

This was not a logic bug — it was a **contract violation** between producer and consumer.

## Timeline

1. User resolves signal → backend creates draft in DB ✅
2. Backend returns success ✅
3. Signal disappears from Signals page (optimistic update) ✅
4. `signals.tsx` invalidates `["/api/drafts"]` ❌ (wrong key)
5. `drafts.tsx` queries `["/api/generated-drafts"]` (unchanged)
6. User sees empty Actions page → trust failure

## Fix

### Immediate
Changed `signals.tsx` line 160 from:
```typescript
queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
```
To:
```typescript
queryClient.invalidateQueries({ queryKey: ["/api/generated-drafts"] });
```

### Preventive: Centralized Query Keys
Created `client/src/lib/queryKeys.ts`:
```typescript
export const queryKeys = {
  signals: () => ["/api/signals"],
  generatedDrafts: () => ["/api/generated-drafts"],
  tasks: () => ["/api/tasks"],
  // ...
};
```

## Preventive Measures

1. **All query keys now live in `queryKeys.ts`**
2. **Inline query keys are forbidden**
3. **Every mutation must invalidate the exact consumer key**
4. **Code review rule**: Check cache invalidation matches consumer query key

## Key Lesson

> **Correctness is not enough. Visibility is part of the contract.**

If the user cannot see the result of their action immediately, the system is effectively lying — even if the data is correct.

## Related Incidents

- P0 Signal Contract (2026-01): Interactions not creating signals
- This incident (P1): Signals not showing as actions

Both share the same root pattern: **Contract violations that appear as "nothing happened"**.

## The Cache Law (Non-Negotiable)

Every API endpoint must define ONE canonical query key.
All reads AND all invalidations must reference that key.

No exceptions. No aliases. No "close enough."
