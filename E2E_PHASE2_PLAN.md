# E2E Test Fixes - Phase 2 Plan

## Executive Summary

**Root Cause Identified**: Auth state from `.auth/user.json` is not persisting when E2E tests load authenticated pages, causing tests to redirect to login instead of showing Groups page.

**Goal**: Fix auth state persistence so stored auth credentials work reliably in E2E tests.

**Approach**:
1. Verify root cause with Phase 1 diagnostics
2. Fix auth state handling in frontend and/or backend
3. Verify tests pass consistently

---

## Current Problem

### Symptoms
- Auth setup succeeds (can log in, creates `.auth/user.json`)
- Authenticated tests start with stored auth
- Tests redirect to login instead of showing Groups page
- Timeout waiting for Groups page header that never appears

### What Error Contexts Show
Page snapshots from failed tests show **Login page** instead of **Groups page**, even though tests are supposed to be authenticated.

### Investigation Needed
Phase 1 diagnostics will reveal:
1. Is `/auth/me` accepting the stored auth?
2. Are cookies being sent correctly?
3. Is CSRF token validation the issue?
4. Is backend session validation failing?

---

## Phase 2: Multi-Track Fix Strategy

### Track A: Frontend Auth State Handling

#### A1: Verify Stored Auth State is Used
**File**: `frontend/src/App.tsx`

**Current issue**: App bootstrap checks `/auth/me`, but might not use stored auth state from Playwright.

**Investigation**:
- Check if `useAuthStore` loads from localStorage on app start
- Verify stored cookies are sent with `/auth/me` request
- Check if CSRF token from stored state is being used

**Fix approach**:
```typescript
// In App.tsx useEffect
useEffect(() => {
  const checkAuth = async () => {
    // 1. Check if auth already in store (from localStorage)
    const storedAuth = useAuthStore.getState();
    if (storedAuth.isAuthenticated()) {
      this.log('[Auth] Found stored auth state, using it');
      // Don't need to call /auth/me if we have valid stored state
      setIsBootstrapped(true);
      return;
    }

    // 2. If no stored state, call /auth/me
    try {
      const response = await api.get('/auth/me');
      // ... existing code
    } catch (error) {
      // ... existing code
    }
  };
  checkAuth();
}, []);
```

#### A2: Verify useAuthStore Implementation
**File**: `frontend/src/hooks/useAuthStore.ts`

**Check**:
- Does store load from localStorage on init?
- Does store persist to localStorage on login?
- Does CSRF token persist correctly?

**Potential fix**:
```typescript
// Store should auto-load from localStorage
const useAuthStore = create<AuthState>(
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: 'auth-store',  // localStorage key
      storage: localStorage, // or sessionStorage
    }
  )
);
```

#### A3: Verify API Client Uses Auth Headers
**File**: `frontend/src/lib/api.ts`

**Check**:
- Are cookies sent with every request? (credentials: 'include')
- Is CSRF token added to request headers?
- Are auth headers being set correctly?

**Potential fix**:
```typescript
const api = axios.create({
  // ... config
  withCredentials: true,  // Send cookies
});

// Add interceptor to include CSRF token
api.interceptors.request.use((config) => {
  const csrfToken = useAuthStore.getState().csrfToken;
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

---

### Track B: Backend Auth Validation

#### B1: Verify Session Validation
**File**: `backend/src/presentation/api/auth.py` (or similar)

**Check**:
- Does `/auth/me` accept cookies from E2E tests?
- Is session cookie validation working?
- Are CSRF tokens being validated correctly?

**Investigation commands**:
```bash
# Check if backend accepts stored cookies
curl -b ".auth/cookies.txt" http://localhost:8000/auth/me

# Check if CSRF token is required/working
curl -b ".auth/cookies.txt" \
  -H "X-CSRF-Token: <token>" \
  http://localhost:8000/auth/me
```

#### B2: Verify CORS and Cookie Settings
**File**: `backend/src/main.py` (FastAPI setup)

**Check**:
- CORS allows credentials: `credentials=True`
- Cookie SameSite settings allow test environment
- Cookie domain/path configured correctly for tests

**Potential fix**:
```python
# In FastAPI CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://frontend:5173"],
    allow_credentials=True,  # Important for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# In session/cookie setup
SessionConfig(
    cookie_secure=False,  # OK for test environment
    cookie_samesite="lax",  # Allow cross-tab
    cookie_httponly=True,
)
```

#### B3: Verify Session Persistence
**Check**:
- Are sessions stored (Redis/DB)?
- Can backend find session from E2E test cookies?
- Is session TTL causing expiration during test?

---

### Track C: E2E Test Auth Setup Improvements

#### C1: Enhance Auth Setup Test
**File**: `frontend/e2e/setup/auth.setup.ts`

**Improvements**:
```typescript
// After successful login, verify auth persists
setup('authenticate', async ({ page }) => {
  // ... existing login code ...

  // After login, verify state was saved
  const cookies = await page.context().cookies();
  console.log('[Auth Setup] Cookies saved:', cookies.map(c => c.name).join(', '));

  // Verify localStorage has auth state
  const authState = await page.evaluate(() => {
    return localStorage.getItem('auth-store');
  });
  console.log('[Auth Setup] Auth store saved:', !!authState);

  // Verify /auth/me works with stored state
  try {
    const response = await page.request.get('/auth/me');
    console.log('[Auth Setup] /auth/me status:', response.status);
  } catch (error) {
    console.error('[Auth Setup] /auth/me failed:', error);
  }

  // Save state
  await page.context().storageState({ path: authFile });
});
```

#### C2: Add Auth State Validation in Tests
**File**: `frontend/e2e/page-objects/AppLayoutPage.ts` (or new helper)

**Add method**:
```typescript
async verifyAuthState(reason: string) {
  const cookies = await this.page.context().cookies();
  const storage = await this.page.evaluate(() => localStorage);

  this.log(`${reason} - Auth state check`, {
    hasCookies: cookies.length > 0,
    cookieNames: cookies.map(c => c.name),
    hasAuthStore: 'auth-store' in storage,
  });

  // Verify /auth/me passes
  const response = await this.page.request.get('/auth/me');
  this.log(`${reason} - /auth/me response: ${response.status}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Auth validation failed: ${error}`);
  }
}
```

---

## Investigation Flowchart

```
Start E2E Test with Stored Auth
         ↓
    [Phase 1 Diagnostics]
         ↓
   Check Page State
    ↙         ↘
 LOGIN PAGE   GROUPS PAGE
    ↓            ↓
   FAIL        SUCCESS
    ↓            ↓
   Why?       [End]
  ↙  ↘
App  Backend
Ready  Auth?
 ↓      ↓
 ✓      ✗ → Fix Backend Auth
 ↓      ↓
 Check Auth Store
 ↓
 Has Auth?
 ↙    ↘
Yes    No → Fix Frontend Auth Loading
 ↓     ↓
Check /auth/me
 ↙     ↘
Pass   Fail → Fix API Headers or Backend Session
 ↓     ↓
Cookies?
 ↙     ↘
Yes    No → Fix Playwright Cookie Handling
 ↓     ↓
CSRF Token?
 ↙     ↘
Yes    No → Fix CSRF Token Handling
 ↓     ↓
All OK
 ↓
Re-run Tests
 ↓
Should Pass ✓
```

---

## Detailed Fix Procedures

### Fix #1: Frontend Auth Store Loading

**If diagnostics show**: Auth state not in localStorage

**Steps**:
1. Check `useAuthStore.ts` has persistence middleware
2. Verify localStorage key is 'auth-store'
3. Ensure store initializes from localStorage on app load
4. Test with: `npm run test:e2e -- --project=setup`

**Expected result**: Auth state persists in localStorage across page reloads

---

### Fix #2: API Client Auth Headers

**If diagnostics show**: `/auth/me` returns 401/403

**Steps**:
1. Check `api.ts` has `withCredentials: true`
2. Add CSRF token to request headers
3. Verify auth interceptor is working
4. Test with: `npm run test:e2e -- --project=authenticated`

**Expected result**: `/auth/me` succeeds with stored credentials

---

### Fix #3: Backend Session Validation

**If diagnostics show**: Backend rejects stored session

**Steps**:
1. Check backend session middleware is enabled
2. Verify CORS allows credentials
3. Check session store (Redis/DB) is working
4. Verify session TTL is sufficient for tests
5. Test with: `curl -b cookies http://localhost:8000/auth/me`

**Expected result**: Backend accepts and validates session cookies

---

### Fix #4: E2E Test Auth State Handling

**If diagnostics show**: Tests don't properly load stored auth

**Steps**:
1. Update `auth.setup.ts` to validate auth was saved
2. Add `verifyAuthState()` calls before accessing authenticated pages
3. Add logging to capture auth state at each step
4. Test with: `npm run test:e2e -- --project=authenticated`

**Expected result**: Tests properly use stored auth credentials

---

## Implementation Order

### Phase 2A: Diagnostics Collection (1-2 hours)
1. Run Phase 1 diagnostics: `npm run test:e2e -- --project=setup`
2. Examine console output for auth state info
3. Check if `/auth/me` passes or fails
4. Document findings in issue/PR description

**Deliverable**: Clear diagnostic output showing what's failing

### Phase 2B: Frontend Fixes (2-3 hours)
If diagnostics show frontend issue:
1. Fix auth store loading (if needed)
2. Fix API client auth headers (if needed)
3. Add better auth state logging
4. Re-run diagnostics to verify

**Deliverable**: Auth state properly persisting in frontend

### Phase 2C: Backend Fixes (2-3 hours)
If diagnostics show backend issue:
1. Verify CORS settings allow credentials
2. Check session middleware is working
3. Verify session validation logic
4. Test with curl commands

**Deliverable**: Backend accepting stored session credentials

### Phase 2D: Integration & Verification (1-2 hours)
1. Run full E2E test suite
2. Verify all authenticated tests pass
3. Run 3+ times to confirm no flakes
4. Update documentation

**Deliverable**: All E2E tests passing consistently

---

## Testing the Fixes

### Test Individual Fixes
```bash
# After each fix, run diagnostics
cd frontend
npm run test:e2e -- --project=setup 2>&1 | grep "\[E2E\]"

# Check specific test
npm run test:e2e -- e2e/groups/create-group.spec.ts

# Run multiple times to check for flakes
for i in {1..3}; do npm run test:e2e; done
```

### Verify Auth State at Each Step
```bash
# Check localStorage has auth
npm run test:e2e -- --project=setup 2>&1 | grep "Auth store"

# Check /auth/me passes
npm run test:e2e -- --project=setup 2>&1 | grep "/auth/me"

# Check cookies are present
npm run test:e2e -- --project=setup 2>&1 | grep "Cookies"
```

---

## Success Criteria

✅ **Phase 1 Diagnostics Complete**
- Console shows detailed logs for each step
- Page state captured at failure points
- Auth state visible in diagnostics

✅ **Auth State Persists**
- Stored auth credentials used by tests
- `/auth/me` accepts stored session
- No redirects to login for authenticated tests

✅ **All E2E Tests Pass**
- All authenticated tests pass consistently
- No timeouts on Groups page
- Tests pass 3+ consecutive runs

✅ **Root Cause Fixed**
- Auth state properly loaded in frontend
- Backend accepting stored credentials
- CSRF tokens working correctly
- Session validation succeeding

---

## Files to Examine/Modify

### Frontend
- `src/App.tsx` - App bootstrap and auth check
- `src/hooks/useAuthStore.ts` - Auth state management
- `src/lib/api.ts` - API client configuration
- `e2e/setup/auth.setup.ts` - Auth setup test
- `e2e/page-objects/AppLayoutPage.ts` - Auth verification helpers

### Backend
- `src/main.py` - CORS and middleware setup
- `src/presentation/api/auth.py` - Auth endpoints
- `src/infrastructure/auth/session.py` - Session management
- `src/domain/entities/user.py` - User entity

### Configuration
- `playwright.config.ts` - E2E test configuration
- `docker-compose.yml` - Services configuration

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Auth changes break non-E2E auth | Low | Phase 1 unit tests should catch |
| Session expires during tests | Medium | Increase session TTL for test environment |
| CSRF token validation fails | Medium | Add detailed logging of token handling |
| Backend changes affect APIs | Low | Run full test suite after changes |
| Fix introduces new flakiness | Low | Run tests 5+ times to verify |

---

## Rollback Plan

If Phase 2 fixes cause issues:

1. **Revert to last known good**: `git revert <commit>`
2. **Investigate with diagnostics**: Run Phase 1 diagnostics again
3. **Take different approach**: Try alternative fix based on new insights
4. **Document learnings**: Update Phase 2 plan for next attempt

---

## Communication Plan

### After Phase 1 (Diagnostics)
"Based on Phase 1 diagnostics, the issue is [specific auth problem]. Phase 2 will fix this by [specific approach]."

### During Phase 2 (Fixes)
"Working on [specific fix], expected to take [time]. Current progress: [%]"

### After Phase 2 (Completion)
"Auth state persistence fixed. All E2E tests now passing. Root cause was [issue]. Fix involved [changes]."

---

## Next Steps

### Immediate (Today)
1. ✅ Phase 1 diagnostics infrastructure is ready
2. Run: `cd frontend && npm run test:e2e -- --project=setup`
3. Examine console output for `[E2E]` logs
4. Note what page state shows at failure point

### Short Term (This week)
1. Analyze diagnostic output
2. Identify specific auth issue (frontend/backend/CSRF/session)
3. Implement appropriate fix from Phase 2
4. Verify with re-run of tests

### Medium Term (This sprint)
1. All E2E tests passing
2. Documented root cause and fix
3. Tests added to CI/CD pipeline
4. Monitoring in place for test stability

---

## Success Indicators

✅ Phase 1 diagnostics show clear auth state information
✅ Specific auth issue identified from diagnostic output
✅ Phase 2 fix implemented based on root cause
✅ E2E tests pass consistently (3+ runs)
✅ No degradation to other auth flows
✅ Documentation updated
✅ CI/CD pipeline green
