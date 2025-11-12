# E2E Test Debugging Guide

Quick reference for understanding and interpreting E2E test diagnostics.

## Running E2E Tests

```bash
cd frontend

# Run all E2E tests
npm run test:e2e

# Run only setup tests (faster, includes diagnostics)
npm run test:e2e -- --project=setup

# Run only authenticated tests
npm run test:e2e -- --project=authenticated

# Run a specific test file
npm run test:e2e -- e2e/groups/create-group.spec.ts

# Run with UI (interactive)
npm run test:e2e -- --ui
```

## Understanding Diagnostic Output

### Successful Test

```
[2024-11-11T12:34:56.789Z] [E2E] GroupsPage: waitForLoad() starting...
[2024-11-11T12:34:56.890Z] [E2E] Waiting for app to be ready...
[2024-11-11T12:34:57.234Z] [E2E] ✓ App ready in 344ms
[2024-11-11T12:34:57.235Z] [E2E] GroupsPage: Waiting for groups-page-header...
[2024-11-11T12:34:57.456Z] [E2E] ✓ Selector found in 221ms
[2024-11-11T12:34:58.456Z] [E2E] ✓ Groups page loaded successfully in 565ms
```

**What it means**: ✅ Everything working correctly

- App bootstrap: 344ms (normal)
- Page header found: 221ms (normal)
- Total load: 565ms (normal)

### Failed Test - App Bootstrap

```
[E2E] Waiting for app to be ready...
[E2E] ✗ App not ready after 15000ms

App failed to bootstrap within 15000ms
Page state: {
  url: "http://localhost:5173/app/groups",
  appReady: false,
  readyState: "complete"
}
```

**What it means**: ❌ App couldn't initialize

- `appReady: false` → `window.__app_ready` was never set
- Likely causes:
  - Backend `/auth/me` call failed
  - Network connectivity issue
  - Backend is down

**How to fix**:

1. Check backend health: `curl http://localhost:8000/health`
2. Check auth endpoint: `curl http://localhost:8000/auth/me`
3. Check backend logs: `docker logs gift-genie-backend`

### Failed Test - Page Not Rendering

```
[E2E] GroupsPage: Waiting for groups-page-header...
[E2E] ✗ Groups page failed to load after 15000ms

Groups page failed to load within timeout
Duration: 15000ms
Page state: {
  url: "http://localhost:5173/app/groups",
  headerVisible: false,
  loadingVisible: true,     ← PROBLEM
  errorVisible: false,
  emptyStateVisible: false,
  appReady: true,           ← App is ready
  numberOfGroups: 0
}
```

**What it means**: ❌ Page stuck in loading state

- App bootstrapped OK
- But Groups page won't render
- Likely causes:
  - Groups API endpoint hanging
  - API authentication failing
  - React component error

**How to fix**:

1. Check Groups API response: `curl http://localhost:8000/api/groups` (with auth)
2. Check browser console in test video for React errors
3. Check backend logs for API errors

### Failed Test - API Error

```
Page state: {
  headerVisible: false,
  loadingVisible: false,
  errorVisible: true,       ← PROBLEM
  errorText: "Failed to load groups",
  appReady: true
}
```

**What it means**: ❌ Page showed error state

- App bootstrapped
- Groups API returned error
- Error message visible

**How to fix**:

1. Read the error text for details
2. Check the Groups API endpoint: `curl http://localhost:8000/api/groups`
3. Check response status and body
4. Check backend logs for what caused the error

## Viewing Detailed Test Results

### Console Output

Tests print timestamped logs to console:

```bash
npm run test:e2e 2>&1 | grep "\[E2E\]"
```

### Test Artifacts

Located in `test-results/`:

- `test-results/*.png` - Failed test screenshots
- `test-results/*.webm` - Test videos showing what browser saw
- `test-results/trace.zip` - Playwright trace (can view with `npx playwright show-trace`)
- `test-results/junit.xml` - CI-compatible test report

### HTML Report

```bash
npx playwright show-report test-results/
```

## Common Issues and Fixes

### Issue: Network idle timeout

```
⚠ Network did not idle within 5000ms (after 4987ms)
→ Non-fatal, page is visible so continuing
```

✅ **Not a problem** - Network still active but page is visible and interactive

### Issue: Timeout on login

```
LoginPage: Waiting for login to complete...
→ Waiting for navigation to /app/groups...
✗ Login failed after 20000ms
```

❌ **Problem**: Login succeeded but Groups page won't load

- Same diagnostics as "Page Not Rendering" above
- Check Groups API endpoint

### Issue: Intermittent failures

```
Test passed in run 1
Test failed in run 2
Test passed in run 3
```

❌ **Indicates**: Flaky test, not deterministic failure

- May indicate timing issue
- May indicate stale auth state
- Re-run test a few times to confirm

## Debugging Workflow

### Step 1: Run test and capture output

```bash
npm run test:e2e 2>&1 | tee test-output.log
```

### Step 2: Check diagnostic logs

Look for:

- ✓ or ✗ indicators
- Timing information (too slow?)
- Error messages

### Step 3: Identify failure point

- App bootstrap? → Backend issue
- Page rendering? → API issue
- Component visibility? → React issue

### Step 4: Check artifacts

- View screenshot at `test-results/`
- Watch video to see what happened
- Check trace for network calls

### Step 5: Fix and re-run

Once you identify the issue:

1. Fix the underlying problem
2. Re-run test: `npm run test:e2e`
3. Verify it passes consistently

## Interpreting Page State

```typescript
interface PageState {
  url: string; // Current URL
  headerVisible: boolean; // Is groups-page-header visible?
  loadingVisible: boolean; // Is loading-state visible?
  errorVisible: boolean; // Is error-state visible?
  emptyStateVisible: boolean; // Is empty-state visible?
  appReady: boolean; // Did app bootstrap complete?
  numberOfGroups: number; // How many groups loaded?
}
```

**One of these should be true** (mutually exclusive states):

- `headerVisible: true` ✅ Page rendered successfully
- `loadingVisible: true` ⏳ Page stuck loading
- `errorVisible: true` ❌ API returned error
- `emptyStateVisible: true` ✅ Page rendered, no data (OK)

## Performance Baseline

Typical timings on local development:

- App bootstrap: 300-500ms
- Page navigation: 200-400ms
- Groups data load: 500-1000ms
- **Total: 1-2 seconds**

If you're seeing longer times, something might be slow:

- > 5s bootstrap → Backend issue
- > 10s page load → API issue
- > 15s timeout → Hang/error

## Getting Help

When reporting a flaky E2E test failure:

1. Include the diagnostic output (console logs)
2. Include the page state from error message
3. Mention if it's intermittent or consistent
4. Include test output screenshot/video link

Example:

```
Test: "should create a new group"
Status: Failed (consistent)
Duration: 15000ms

Page state when failed:
- appReady: true ✓
- headerVisible: false ✗
- loadingVisible: true
- URL: http://localhost:5173/app/groups

Issue: Page stuck in loading state despite app being ready
Hypothesis: Groups API endpoint hanging
```

## Quick Debugging Commands

```bash
# Check backend health
curl http://localhost:8000/health

# Check auth endpoint (requires cookie)
curl -b ".auth/user.json" http://localhost:8000/auth/me

# Check groups endpoint (requires auth)
# (First get auth cookie from local storage in browser)
curl http://localhost:8000/api/groups \
  -H "Cookie: <auth-cookie>"

# View latest test results
open test-results/index.html

# Run tests in UI mode (interactive)
npm run test:e2e -- --ui

# Run test with debug logs
DEBUG=pw:api npm run test:e2e
```

## Next Steps

For issues that don't match common patterns, check:

1. `E2E_DIAGNOSTICS_PHASE1.md` - How diagnostics work
2. `PHASE1_COMPLETION_SUMMARY.md` - What was implemented
3. Test videos in `test-results/` - See actual browser behavior
4. Backend logs: `docker logs gift-genie-backend`
5. Frontend logs: Check browser console in Playwright trace
