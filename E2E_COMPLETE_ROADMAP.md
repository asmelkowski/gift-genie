# E2E Test Failure Resolution - Complete Roadmap

## Overview

This document provides a complete roadmap for diagnosing and fixing E2E test failures, from Phase 1 (diagnostics) through Phase 2 (fixes) to successful implementation.

---

## Problem Statement

### Current Status
- ❌ 5 E2E tests consistently failing
- ❌ Tests timeout waiting for Groups page header
- ❌ Page snapshots show login page instead of authenticated Groups page
- ❌ Auth setup works, but authenticated tests can't access protected routes

### Root Cause
Auth state from `.auth/user.json` not persisting when E2E tests load authenticated pages.

### Impact
Cannot verify critical user journeys:
- Group creation
- Group management
- Logout functionality
- Protected route access

---

## Complete Solution Roadmap

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: DIAGNOSTICS (Completed ✅)                            │
│  ─────────────────────────────────────────────────────────────  │
│  • BasePageObject infrastructure                                │
│  • App bootstrap signal (window.__app_ready)                    │
│  • Enhanced page objects with logging                           │
│  • Diagnostic setup test                                        │
│  • Comprehensive documentation                                  │
│                                                                 │
│  What It Reveals:                                              │
│  • App bootstrap status                                        │
│  • Page component state (loading/error/empty/content)          │
│  • Auth state (cookies, localStorage)                          │
│  • API response status                                         │
│  • Timing for each operation                                   │
│                                                                 │
│  Files Ready:                                                  │
│  ✓ E2E_DIAGNOSTICS_PHASE1.md (usage guide)                    │
│  ✓ PHASE1_COMPLETION_SUMMARY.md (overview)                    │
│  ✓ frontend/E2E_DEBUGGING_GUIDE.md (quick ref)                │
└─────────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1 EXECUTION: Collect Diagnostics                         │
│  ─────────────────────────────────────────────────────────────  │
│  When: Before starting Phase 2                                  │
│  How: npm run test:e2e -- --project=setup                      │
│  Output: Console logs with [E2E] prefix                         │
│  Goal: Identify specific auth issue                             │
│                                                                 │
│  What to Look For:                                             │
│  1. Does app bootstrap complete? (appReady: true/false)        │
│  2. What page renders? (login/groups/loading/error)            │
│  3. Does /auth/me pass or fail?                               │
│  4. Are cookies present?                                       │
│  5. Is auth store in localStorage?                             │
└─────────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────┐
│  ANALYSIS: Determine Fix Category                               │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  If diagnostics show...              Then fix...               │
│  ───────────────────────────────────────────────────────────  │
│  • appReady: false                    → Backend auth issue     │
│  • Page shows login                   → Auth state lost        │
│  • headerVisible: false               → API call hanging       │
│  • /auth/me returns 401/403           → API headers or session│
│  • No auth in localStorage            → Frontend loading      │
│  • No cookies                         → Session/cookie issue  │
│                                                                 │
│  Likely Issue: Auth state not persisting from .auth/user.json  │
└─────────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: IMPLEMENT FIXES (Ready for execution)                 │
│  ─────────────────────────────────────────────────────────────  │
│  Files Ready:                                                   │
│  ✓ E2E_PHASE2_PLAN.md (complete fix strategy)                 │
│                                                                 │
│  Multi-Track Approach:                                         │
│                                                                 │
│  Track A: Frontend Auth State Handling (2-3 hrs)              │
│  ├─ A1: Verify useAuthStore loads from localStorage            │
│  ├─ A2: Check auth store persistence                           │
│  └─ A3: Verify API client sends auth headers                   │
│                                                                 │
│  Track B: Backend Session Validation (2-3 hrs)                │
│  ├─ B1: Verify /auth/me accepts stored cookies                │
│  ├─ B2: Check CORS allows credentials                          │
│  └─ B3: Verify session TTL is sufficient                       │
│                                                                 │
│  Track C: E2E Test Auth Setup (1-2 hrs)                        │
│  ├─ C1: Enhance auth.setup.ts verification                     │
│  └─ C2: Add auth state validation helpers                      │
│                                                                 │
│  Implementation Order:                                         │
│  1. Phase 2A: Run diagnostics and document findings (1-2 hrs)  │
│  2. Phase 2B: Implement frontend fixes (2-3 hrs)              │
│  3. Phase 2C: Implement backend fixes (2-3 hrs)               │
│  4. Phase 2D: Integration & verification (1-2 hrs)            │
│                                                                 │
│  Total: 6-10 hours estimated                                   │
└─────────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────┐
│  VERIFICATION: Confirm Fixes Work                               │
│  ─────────────────────────────────────────────────────────────  │
│  Tests: npm run test:e2e                                        │
│  Requirements:                                                  │
│  ✓ All authenticated tests pass                                │
│  ✓ Tests pass 3+ consecutive runs (no flakes)                 │
│  ✓ No timeouts on Groups page                                  │
│  ✓ Auth redirects work correctly                              │
│  ✓ Logout functionality verified                              │
└─────────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────┐
│  SUCCESS: E2E Tests Passing ✅                                  │
│  ─────────────────────────────────────────────────────────────  │
│  ✓ All 5 failing tests now pass                               │
│  ✓ Auth state persists correctly                              │
│  ✓ Protected routes work as expected                          │
│  ✓ No regressions in other auth flows                         │
│  ✓ CI/CD pipeline green                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Diagnostics (Completed)

### What Was Built
- ✅ BasePageObject with comprehensive logging
- ✅ App bootstrap signal (`window.__app_ready`)
- ✅ Enhanced page objects for all flows
- ✅ Diagnostic setup test
- ✅ Three comprehensive documentation files

### How to Run
```bash
cd frontend
npm run test:e2e -- --project=setup
```

### What to Look For
Timestamped console logs like:
```
[2024-11-11T12:34:56.789Z] [E2E] GroupsPage: waitForLoad() starting...
[2024-11-11T12:34:57.234Z] [E2E] ✓ App ready in 344ms
[2024-11-11T12:34:57.456Z] [E2E] ✗ Groups page failed to load after 15000ms
[E2E] Page state: {
  appReady: true,
  headerVisible: false,
  loadingVisible: false,
  errorVisible: false,
  visibleText: "Login"  ← Auth state not persisting!
}
```

### Expected Finding
**Confirmed**: Auth state not persisting. Tests show login page instead of Groups page.

---

## Phase 2: Fixes (Ready to Execute)

### When to Start
After running Phase 1 diagnostics and confirming root cause.

### Quick Start
```bash
# 1. Run diagnostics and document
cd frontend && npm run test:e2e -- --project=setup 2>&1 | tee diagnostics.log

# 2. Review the Phase 2 plan
cat E2E_PHASE2_PLAN.md

# 3. Implement fixes based on findings
# (Check which track: A/B/C applies)

# 4. Verify fixes work
npm run test:e2e
for i in {1..3}; do npm run test:e2e; done
```

### Three Tracks to Fix

**Track A: Frontend Auth** (Most likely)
- Check useAuthStore loads from localStorage
- Verify API client sends auth headers
- Ensure CSRF token persists

**Track B: Backend Auth** (If Track A doesn't fix it)
- Verify CORS allows credentials
- Check session validation
- Ensure backend accepts stored cookies

**Track C: E2E Setup** (Fallback)
- Enhance auth.setup.ts to validate auth was saved
- Add state verification calls
- Better logging of auth state

### Timeline Estimate
- Phase 2A (Diagnostics): 1-2 hours
- Phase 2B (Frontend): 2-3 hours
- Phase 2C (Backend): 2-3 hours (if needed)
- Phase 2D (Verification): 1-2 hours

**Total: 6-10 hours to complete**

---

## Documentation Files

### Phase 1 Documentation
1. **E2E_DIAGNOSTICS_PHASE1.md**
   - How diagnostics work
   - What each component does
   - How to interpret console output
   - Common issues and solutions

2. **PHASE1_COMPLETION_SUMMARY.md**
   - What was built
   - How it helps debug
   - Before/after comparison
   - Key improvements

3. **frontend/E2E_DEBUGGING_GUIDE.md**
   - Quick reference guide
   - Running tests
   - Interpreting output
   - Common issues
   - Debugging commands

### Phase 2 Documentation
1. **E2E_PHASE2_PLAN.md**
   - Complete fix strategy
   - Multi-track approach
   - Detailed procedures for each fix
   - Implementation order
   - Success criteria

---

## How to Use This Roadmap

### For Immediate Use
1. Read this file to understand the complete flow
2. Skim E2E_PHASE2_PLAN.md for overall strategy
3. Run Phase 1 diagnostics: `npm run test:e2e -- --project=setup`
4. Compare diagnostic output to expected findings
5. Start Phase 2 with appropriate track

### For Reference During Work
- Keep E2E_DEBUGGING_GUIDE.md open for quick commands
- Follow Phase 2 Plan step-by-step
- Use investigation flowchart to narrow down issues
- Check success criteria to verify each fix

### For Troubleshooting
- Phase 1 shows what's wrong
- Phase 2 Plan shows how to fix it
- Debugging Guide shows how to verify
- Investigation flowchart shows where to look next

---

## Success Criteria

### Phase 1 Complete ✅
- [x] Diagnostics infrastructure implemented
- [x] Console shows [E2E] logs
- [x] Page state captured at failures
- [x] Auth state visible in diagnostics

### Phase 2 In Progress
- [ ] Run Phase 1 diagnostics
- [ ] Identify specific auth issue
- [ ] Implement appropriate fix
- [ ] Tests pass consistently (3+ runs)
- [ ] No regressions
- [ ] Documentation updated

### Final Success ✅
- [ ] All 5 E2E tests passing
- [ ] Auth state persisting correctly
- [ ] No test flakes (3+ consistent passes)
- [ ] CI/CD pipeline green
- [ ] Root cause documented

---

## Files Involved

### Phase 1 (Already Done)
- ✓ frontend/e2e/page-objects/BasePageObject.ts
- ✓ frontend/e2e/setup/diagnostics.setup.ts
- ✓ frontend/src/types/window.d.ts
- ✓ frontend/src/App.tsx (added bootstrap signal)
- ✓ Enhanced all page objects
- ✓ Documentation files

### Phase 2 (To Be Modified)
**Frontend**:
- src/App.tsx (auth check logic)
- src/hooks/useAuthStore.ts (store loading)
- src/lib/api.ts (auth headers)
- e2e/setup/auth.setup.ts (verification)
- e2e/page-objects/AppLayoutPage.ts (validation)

**Backend** (if needed):
- src/main.py (CORS/middleware)
- src/presentation/api/auth.py (auth endpoints)
- src/infrastructure/auth/session.py (session handling)

---

## Key Commands

### Run Diagnostics
```bash
cd frontend
npm run test:e2e -- --project=setup
```

### View Diagnostic Output
```bash
npm run test:e2e -- --project=setup 2>&1 | grep "\[E2E\]"
```

### Run Specific Tests
```bash
npm run test:e2e -- e2e/groups/create-group.spec.ts
npm run test:e2e -- --project=authenticated
```

### Check for Flakes
```bash
for i in {1..3}; do npm run test:e2e; done
```

### View Reports
```bash
npx playwright show-report test-results/
```

---

## Common Issues During Phase 2

### Issue: Auth works in manual testing but fails in E2E
→ Check if browser context storage differs from manual browser
→ Verify cookies are persisted correctly in `.auth/user.json`

### Issue: Tests pass sometimes but not always
→ Indicates flaky test, not deterministic failure
→ Run 5+ times to confirm fix actually works

### Issue: Fixing frontend doesn't help
→ Indicates backend issue
→ Check backend logs: `docker logs gift-genie-backend`
→ Test backend directly with curl

### Issue: Fixing backend doesn't help
→ Indicates E2E setup issue
→ Verify auth.setup.ts actually saves state
→ Check storage state in browser

---

## Next Steps

### Right Now ✅
- [x] Phase 1 diagnostics infrastructure complete
- [x] All files committed and documented
- [ ] **ACTION: Run Phase 1 diagnostics**

### Today
- [ ] Execute: `cd frontend && npm run test:e2e -- --project=setup`
- [ ] Capture: Console output to file
- [ ] Analyze: Diagnostic output
- [ ] Document: Specific auth issue found

### This Week
- [ ] Start Phase 2 with appropriate track
- [ ] Implement fixes based on diagnostics
- [ ] Verify with re-runs
- [ ] Update documentation

### This Sprint
- [ ] All 5 tests passing consistently
- [ ] Root cause documented
- [ ] CI/CD pipeline verified
- [ ] Ready for production

---

## Support & Escalation

### If You Get Stuck
1. Check E2E_DEBUGGING_GUIDE.md for quick answers
2. Review E2E_PHASE2_PLAN.md investigation flowchart
3. Look at diagnostic output for specific clues
4. Check backend logs for API errors
5. Verify browser cookies in test artifacts

### Expected Outcomes

**Best Case** (4-6 hours):
- Fix is frontend auth store loading
- Single code change fixes it
- Tests pass immediately after fix

**Typical Case** (6-10 hours):
- Multiple issues across frontend/backend
- Need to track down each piece
- Verify with multiple test runs

**Complex Case** (10+ hours):
- Issue requires architectural change
- Need to refactor auth handling
- Extensive testing to verify safety

---

## Summary

This complete roadmap provides:
- ✅ Phase 1: Diagnostic infrastructure (done)
- ✅ Phase 2: Comprehensive fix plan (ready)
- ✅ Documentation: 5 detailed guides
- ✅ Tools: Logging, page state capture, verification methods
- ✅ Strategy: Multi-track approach with flowchart
- ✅ Timeline: 6-10 hours estimated

**Next action**: Run Phase 1 diagnostics to reveal the specific auth issue, then follow Phase 2 plan to fix it.

**Expected outcome**: All E2E tests passing with auth state persisting correctly.
