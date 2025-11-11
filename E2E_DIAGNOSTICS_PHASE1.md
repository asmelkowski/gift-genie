# E2E Test Diagnostics - Phase 1 Implementation

## Overview

Phase 1 of E2E test diagnostics has been completed. This provides comprehensive logging and diagnostic infrastructure to identify why Groups page tests fail to load.

## Changes Made

### 1. App Bootstrap Signal (`App.tsx`)
- Added `window.__app_ready` flag that signals when app bootstrap is complete
- Added `data-testid="app-loading"` to loading state for better detection
- Flag set immediately after auth check completes (success or failure)

**Why this matters**: E2E tests can now reliably wait for app initialization instead of using unreliable network wait strategies.

### 2. Base Page Object (`BasePageObject.ts`)
Created a comprehensive base class for all page objects with:

#### Logging Methods
- `log(message, data)` - Timestamped console logging with context data
- Structured format: `[ISO-TIMESTAMP] [E2E] message data`

#### Wait Methods
- `waitForAppReady(timeout)` - Waits for `window.__app_ready` flag
- `waitForNetworkIdle(timeout)` - Waits for network to idle with diagnostics
- `waitForSelector(selector, options)` - Waits for DOM element with error capture
- `navigateTo(url, waitForNavigation)` - Navigation with diagnostics

#### Diagnostic Methods
- `capturePageState()` - Captures comprehensive page state including:
  - Current URL
  - Document ready state
  - Presence of loading/error/empty state indicators
  - Visibility of key test IDs
  - App ready flag status
- `getDiagnostics()` - Full diagnostics including page state, cookies, localStorage
- `takeScreenshot(name)` - Labeled screenshot capture

#### Utility Methods
- `assertCondition(condition, message)` - Assertions with diagnostic context

### 3. Enhanced Page Objects

#### GroupsPage (`GroupsPage.ts`)
- **Extends BasePageObject** for logging support
- **Improved `waitForLoad()`**:
  - First waits for app to be ready
  - Then waits for header (8s timeout instead of hanging on networkidle)
  - Only waits for network idle AFTER page is visible
  - Comprehensive error reporting with full page state
- **New `getPageState()` method**:
  - Checks header, loading, error, empty state visibility
  - Counts visible groups
  - Returns app ready flag status
- **New `waitForGroupsData()` method**:
  - Waits for groups to actually load, not just app ready
  - Checks for loading/error/success states

#### LoginPage (`LoginPage.ts`)
- **Extends BasePageObject** for logging support
- **New `waitForLoginSuccess()` method**:
  - Waits for navigation to `/app/groups`
  - Waits for app bootstrap
  - Verifies authentication with diagnostics
  - Better error messages with page state

#### AppLayoutPage (`AppLayoutPage.ts`)
- **Extends BasePageObject** for logging support
- **New `waitForLayoutReady()` method**:
  - Waits for app ready
  - Waits for user menu to be visible
- **Enhanced `logout()` method**:
  - Waits for redirection to login
  - Better error handling

### 4. Diagnostic Setup Test (`diagnostics.setup.ts`)
New setup test that captures detailed E2E environment info:

#### Test 1: Backend Connectivity
- Checks backend health endpoint status
- Attempts to read health response

#### Test 2: Authentication Endpoint
- Tests `/auth/me` endpoint
- Captures response or error

#### Test 3: App Initialization
- Navigates to home page
- Waits for app bootstrap
- Captures app state including `__app_ready` flag

#### Test 4: Storage State
- Lists all cookies
- Lists localStorage keys

#### Test 5: Groups Page Rendering
- Tests Groups page navigation
- Captures detailed page state

### 5. Updated Auth Setup (`auth.setup.ts`)
- Uses new `LoginPage.waitForLoginSuccess()` method
- Better error handling and logging
- Handles registration and login flows with detailed diagnostics

### 6. Type Declarations (`window.d.ts`)
- Declares `window.__app_ready` type
- Declares `window.__errors` type for future error capture

## How to Use

### Run E2E Tests with Enhanced Diagnostics
```bash
cd frontend
npm run test:e2e
# or with specific test
npm run test:e2e -- --project=authenticated
```

### Interpret Console Output
Look for timestamped messages:
```
[2024-11-11T12:34:56.789Z] [E2E] GroupsPage: waitForLoad() starting...
[2024-11-11T12:34:56.890Z] [E2E] Waiting for app to be ready...
[2024-11-11T12:34:57.234Z] [E2E] ✓ App ready in 344ms
[2024-11-11T12:34:57.235Z] [E2E] GroupsPage: Waiting for groups-page-header...
[2024-11-11T12:34:57.456Z] [E2E] ✓ Selector found in 221ms
```

### Interpret Error Messages
When a test fails, you'll get detailed diagnostics:
```
Groups page failed to load within timeout
Duration: 15234ms
Page state: {
  url: "http://localhost:5173/app/groups",
  headerVisible: false,
  loadingVisible: true,      ← Page stuck in loading
  errorVisible: false,
  emptyStateVisible: false,
  appReady: true,            ← App bootstrapped OK
  numberOfGroups: 0
}
```

## What This Reveals

The diagnostics now show:

1. **App Bootstrap Health**: Whether app successfully initializes
2. **Page Component States**: Which component is visible (loading/error/empty/content)
3. **Test ID Presence**: Confirms test IDs are in DOM
4. **Auth State**: Confirms authentication persisted
5. **API Response Status**: Through network logs in console/trace
6. **Timing Information**: How long each step takes

## Next Steps (Phase 2)

Once diagnostics run, look for patterns:
- **App not ready**: Bootstrap timeout → investigate auth/API
- **Page stuck loading**: Groups API hanging → check backend
- **Page stuck error**: API returned error → check error response
- **Test IDs missing**: Component not rendering → check React warnings
- **Timeout on network wait**: Long API calls → check query/mutation config

## Files Created/Modified

### Created
- `frontend/e2e/page-objects/BasePageObject.ts` - Base class with diagnostics
- `frontend/e2e/setup/diagnostics.setup.ts` - Diagnostic test
- `frontend/src/types/window.d.ts` - Window type declarations

### Modified
- `frontend/e2e/page-objects/GroupsPage.ts` - Enhanced with BasePageObject
- `frontend/e2e/page-objects/LoginPage.ts` - Enhanced with BasePageObject
- `frontend/e2e/page-objects/AppLayoutPage.ts` - Enhanced with BasePageObject
- `frontend/e2e/setup/auth.setup.ts` - Updated to use new methods
- `frontend/src/App.tsx` - Added `__app_ready` flag

## Testing Diagnostics Locally

```bash
# Run all setup tests (includes diagnostics)
cd frontend
npm run test:e2e -- --project=setup

# Or run individual diagnostic test
npm run test:e2e -- diagnostics.setup.ts

# Watch console output for diagnostic logs
# Check test-results/ for detailed trace files
```

## Interpreting Test Results

### Good Sign ✅
```
[E2E] ✓ App ready in 344ms
[E2E] ✓ Selector found in 221ms
[E2E] ✓ Groups page loaded successfully in 565ms
```

### Warning Sign ⚠️
```
[E2E] ⚠ Network did not idle within 5000ms (after 4987ms)
→ Non-fatal, page is visible so continuing
```

### Critical Issue ❌
```
[E2E] ✗ App not ready after 15000ms
Groups page failed to load within timeout
→ App bootstrap failed - check backend/auth
```
