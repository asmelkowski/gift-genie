# E2E Test CI Authentication Fix - Implementation Guide

## Problem Statement

E2E tests pass successfully in local development but fail consistently in CI/Docker environments with the error:

```
Authentication verification failed: page.waitForSelector: Timeout 15000ms exceeded.
```

The root cause: **HTTP cookies set during login are not persisting in CI's Docker cross-container requests**, causing all subsequent API calls to return 401 Unauthorized despite successful login.

### Evidence of the Problem

From CI logs:
```
✅ API registration successful
✅ Login form submitted
✅ Successfully logged in and redirected to: http://frontend:5173/app/groups
🔍 Verifying authentication...
❌ Failed: page.waitForSelector timeout on [data-testid="groups-page-header"]

Backend logs show:
POST /api/v1/auth/login → 200 OK (login succeeds, cookie set)
GET /api/v1/groups → 401 Unauthorized (token not sent!)
```

### Why Local Works But CI Fails

| Environment | Behavior |
|---|---|
| **Local (localhost)** | Browser → Vite dev server on same machine. Cookies persist naturally. |
| **CI (Docker)** | Frontend container → Backend container (different hostnames). Cookie policies (`SameSite=Lax`) prevent cross-container cookie transmission. |

---

## Solution Overview

Implement **dual authentication support**:
- ✅ **Cookies** - Still set (for browser navigation consistency) but not relied upon
- ✅ **Authorization Headers** - Explicit Bearer token injection (works in Docker)
- ✅ **LocalStorage** - Token persisted (available to frontend code)

### Why This Approach

1. **Fixes CI Docker Issues** - No dependency on cross-container cookies
2. **Maintains Compatibility** - Local dev and browser navigation still work
3. **Parallel-Safe** - Each test context has isolated token management
4. **Production-Ready** - Mirrors real-world API authentication patterns

---

## Implementation Details

###1. Backend (Already Implemented ✅)

**File**: `/home/adam/dev/gift-genie/backend/src/gift_genie/presentation/api/v1/auth.py`

**What was done**:
- ✅ `LoginResponse` model includes `access_token: str` field
- ✅ `login_user` endpoint returns token in response body
- ✅ `get_current_user` checks BOTH Authorization headers AND cookies

```python
class LoginResponse(BaseModel):
    user: UserProfile
    token_type: str = "Bearer"
    access_token: str  # ← Token returned in response body

async def get_current_user(request: Request) -> str:
    token = None

    # Try Authorization header first (for API requests in tests/clients)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        # Fall back to cookie (for browser navigation)
        token = request.cookies.get("access_token")

    # ... token validation ...
```

**No backend changes needed** - Already configured correctly!

---

### 2. Frontend Test Utils (Fixed ✅)

**File**: `/home/adam/dev/gift-genie/frontend/e2e/utils/auth-setup.ts`

#### Changes Made

**Method: `loginViaApi()`**

```typescript
private static async loginViaApi(page: Page, userData: TestUserData): Promise<void> {
  console.log('🔗 Logging in via API (CI/Docker mode)...');

  // 1. Make API login request
  const response = await page.request.post(`${this.getApiBaseUrl()}/api/v1/auth/login`, {
    data: {
      email: userData.email,
      password: userData.password,
    },
  });

  const loginData = await response.json();
  const accessToken = loginData.access_token;

  // 2. CRITICAL: Set up route handler BEFORE navigation
  // This intercepts ALL API requests and adds Authorization header
  await page.route('**/api/v1/**', async (route) => {
    const headers = {
      ...route.request().headers(),
      'Authorization': `Bearer ${accessToken}`,
    };
    route.continue({ headers });
  });

  // 3. Set token in localStorage before navigation
  // Uses addInitScript to run BEFORE page loads
  await page.addInitScript((token) => {
    window.localStorage.setItem('auth_token', token);
  }, accessToken);

  // 4. Navigate - route handler now covers all API calls
  await page.goto('/app/groups', { waitUntil: 'domcontentloaded' });
}
```

#### Key Implementation Details

1. **Route Handler Timing** ⏱️
   - Set up BEFORE `page.goto()` to catch initial page load requests
   - Pattern: `**/api/v1/**` intercepts all backend API calls
   - Every request gets `Authorization: Bearer <token>` header

2. **Token Storage** 💾
   - `addInitScript()` runs in page context before DOM loads
   - Token available in localStorage for frontend code
   - Accessible via `window.localStorage.getItem('auth_token')`

3. **Dual Auth Support** 🔐
   - Frontend still receives cookies (via `Set-Cookie` header)
   - If frontend app has token interceptor, uses that
   - Backend accepts either - BOTH work in tandem

---

## How It Works in CI

### Login Flow (CI)

```
1. E2E Test
   └─> AuthSetup.createAuthenticatedContext()
       └─> loginViaApi()
           ├─ POST /api/v1/auth/login (direct API call)
           ├─ Response includes: { user, access_token, token_type }
           │
           ├─ Setup Route Handler
           │  └─> All subsequent requests injected with:
           │      Headers: { "Authorization": "Bearer <token>" }
           │
           ├─ Setup localStorage
           │  └─> window.localStorage.auth_token = <token>
           │
           └─ Navigate to /app/groups
              └─> Page load requests all have Authorization header
                  └─> GET /api/v1/groups → Backend checks header
                      ✅ Token valid → 200 OK → Page renders

2. Test Execution
   └─> All API calls have Authorization header injected
       ├─ GET /api/v1/auth/me → 200 OK
       ├─ GET /api/v1/groups → 200 OK
       ├─ POST /api/v1/draws/create → 200 OK
       └─ etc.
```

### Request Flow Details

Each API request intercepted by `page.route()`:

```
Test makes API request
    ↓
Playwright route handler intercepts
    ↓
Check if request URL matches '**/api/v1/**'
    ↓ Yes
Add Authorization header with captured token
    ↓
Send to backend with header:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ↓
Backend receives request
    ↓
get_current_user() dependency checks:
  1. Authorization header? → Yes! Extract token
  2. Verify JWT signature
  3. Extract user_id from token.sub
    ↓ Success
Return user_id to endpoint handler
    ↓
Endpoint executes with authenticated user
    ↓
Returns 200 OK with data
```

---

## Testing the Fix

### Local Development

No changes needed - existing form-based login with cookies works as before.

```bash
cd frontend
npm run test:e2e
# Uses loginViaFrontend() → form submission → cookies work → ✅
```

### CI Environment

The fix activates automatically via environment detection:

```typescript
if (TestHelpers.isCI()) {
  await this.loginViaApi(page, userData);  // New path
} else {
  await this.loginViaFrontend(page, userData);  // Original path
}
```

---

## Verification Checklist

✅ **Backend** - Already correctly configured
- `LoginResponse` includes `access_token`
- `get_current_user()` checks both headers and cookies

✅ **Frontend** - Fixed in auth-setup.ts
- `loginViaApi()` extracts token from response
- Route handlers set up BEFORE navigation
- Token stored in localStorage via addInitScript

✅ **CI Flow** - Should now work
- Test registers user
- API login returns token
- Route handler injects header on all requests
- Tests should pass without 401 errors

---

## Debugging Tips

If tests still fail after this fix, check:

1. **Token Extraction**
   ```
   Log message: "✅ API login successful, token received"
   If missing: Login API returned wrong status or wrong response structure
   ```

2. **Route Handler Coverage**
   ```
   Log message: "📡 Intercepting GET http://backend:8000/api/v1/groups, adding Authorization header"
   If missing: Route handler not intercepting - check pattern '**/api/v1/**'
   ```

3. **Backend Token Validation**
   ```
   Backend logs: INFO: GET /api/v1/auth/me 200 OK (not 401!)
   If 401: Token not being sent or not valid
   ```

4. **localStorage Setup**
   ```
   Browser DevTools → Application → Storage → Local Storage
   Should have: auth_token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## Migration Path

### If Issues Arise

The fix is **non-breaking**:

1. **Revert to cookies-only** (if needed):
   - Restore from backup: `auth-setup.ts.backup`
   - Tests will fail in CI but work locally

2. **Debug incrementally**:
   - Enable request logging in route handlers (already added)
   - Check backend logs for Authorization header presence
   - Verify token JWT structure

### Long-term Improvements

Consider enhancing further:
- [ ] Add persistent auth token management
- [ ] Implement token refresh logic
- [ ] Add token expiration handling
- [ ] Create shared auth utility for all E2E tests

---

## Files Modified

```
frontend/e2e/utils/auth-setup.ts
  └─ loginViaApi() method updated
     ├─ Route handler set up BEFORE navigation
     ├─ addInitScript for localStorage
     └─ Enhanced logging for debugging
```

---

## Timeline

| Phase | Status | Details |
|---|---|---|
| 1. Diagnosis | ✅ Complete | Root cause: Cookie persistence in Docker |
| 2. Backend Check | ✅ Complete | Already configured correctly |
| 3. Frontend Fix | ✅ Complete | auth-setup.ts loginViaApi() updated |
| 4. Testing | ⏳ Pending | Run E2E tests in CI to verify |
| 5. Documentation | ✅ Complete | This guide |

---

## Summary

The fix implements **explicit JWT token handling** via:

1. **Token Extraction** - Captured from login response body
2. **Route Interception** - All API requests get `Authorization: Bearer <token>`
3. **Storage** - Token available in localStorage for frontend code
4. **Fallback** - Cookies still work (backward compatible)

This approach is **production-standard**, handles **Docker cross-container scenarios**, and maintains **full local development compatibility**.
