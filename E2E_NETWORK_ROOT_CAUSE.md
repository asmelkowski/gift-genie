# E2E Test Network Failure - Root Cause Analysis & Remediation Plan

## Executive Summary

**Problem**: E2E tests fail consistently with `TypeError: fetch failed` when trying to call `/api/v1/auth/register` from the E2E test container.

**Root Cause**: **Network connectivity failure between E2E container and backend API** - The E2E tests can establish a network request but it's failing at the fetch level before even reaching the backend.

**Status**: This is **not** a CORS issue, **not** an authentication issue, and **not** a backend bug. This is a **network/connectivity issue** between Docker containers.

---

## Evidence & Diagnosis

### What We Know From Logs

1. **API registration error pattern appears on every attempt**:
   ```
   API registration error: TypeError: fetch failed
   ```

2. **Consistent across all workers**: Every worker (w0-w20) experiences this

3. **Frontend form fallback works**: Tests then navigate to registration page and fill form manually

4. **Login via form submission also fails**: After manual registration, login also times out

5. **Backend logs show no OPTIONS requests being received**: The options requests that ARE shown returning 400 might be from earlier global setup

### Network Flow in CI

```
┌─────────────┐
│ E2E Tests   │  ◄─── Trying to fetch http://backend:8000/api/v1/auth/register
│ Container   │         ❌ TypeError: fetch failed (DNS? Network? Timeout?)
└─────────────┘
      │
      │ (Docker Network: gift-genie-test)
      │
      ▼
┌─────────────┐
│ Backend     │  ◄─── Should receive request here
│ Container   │        But likely not being reached or timing out
└─────────────┘
```

---

## Phase 1: Network Diagnostic Instrumentation

### Goal
Add detailed network logging to capture where exactly the fetch is failing.

### What To Implement

#### 1.1 Enhanced API Error Logging in Auth Setup
**File**: `frontend/e2e/utils/auth-setup.ts`

Add detailed error capture for network failures:

```typescript
async registerViaAPI() {
  try {
    const response = await fetch(`http://backend:8000/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
  } catch (error) {
    // ❌ CAPTURE DETAILED ERROR HERE
    const errorDetails = {
      type: error.name,                    // TypeError, Error, etc.
      message: error.message,              // "fetch failed", "Network error", etc.
      stack: error.stack,                  // Stack trace
      timestamp: new Date().toISOString(),
      environment: process.env.CI ? 'CI' : 'local',
      containerName: process.env.HOSTNAME,
      // Try to get more info about why it failed
    };

    console.error('❌ API Registration Network Error:', errorDetails);
    throw error;
  }
}
```

#### 1.2 Pre-Test Network Health Check
**File**: `frontend/e2e/global-setup.ts` or new `e2e/utils/network-check.ts`

Add connectivity verification BEFORE tests run:

```typescript
async function checkNetworkConnectivity() {
  const checks = {
    'Backend Health': 'http://backend:8000/health',
    'Backend API': 'http://backend:8000/api/v1/health',
    'Frontend': 'http://frontend:5173',
  };

  for (const [name, url] of Object.entries(checks)) {
    try {
      const response = await fetch(url, { timeout: 5000 });
      console.log(`✅ ${name}: ${response.status}`);
    } catch (error) {
      console.error(`❌ ${name} FAILED: ${error.message}`);
      // Don't throw - just log so we see which service is unreachable
    }
  }
}
```

#### 1.3 Axios Timeout Configuration
**File**: `frontend/src/lib/api.ts`

Current axios client doesn't have explicit timeout:

```typescript
const api = axios.create({
  baseURL: (() => {
    // ... existing code
  })(),
  withCredentials: true,
  timeout: 30000,  // ✅ ADD: 30 second timeout (was missing!)
});
```

---

## Phase 2: CORS Configuration Fix (Likely Quick Win)

### Goal
Ensure the E2E test container can make API requests to the backend.

### Current Issue
In `.github/workflows/pull-request.yml` line 406:
```yaml
-e CORS_ORIGINS=http://localhost:5173,http://backend:8000
```

**Problem**: Frontend E2E container origin is NOT in CORS_ORIGINS!

### What To Fix

**File**: `.github/workflows/pull-request.yml` lines 406-408

**Current**:
```yaml
- name: Start backend server
  run: |
    docker run -d \
      # ... other config ...
      -e CORS_ORIGINS=http://localhost:5173,http://backend:8000 \
      gift-genie-backend:prod
```

**Should be**:
```yaml
- name: Start backend server
  run: |
    docker run -d \
      # ... other config ...
      -e CORS_ORIGINS=http://localhost:5173,http://frontend:5173,http://backend:8000 \
      gift-genie-backend:prod
```

**Explanation**:
- `http://localhost:5173` - for host machine access
- `http://frontend:5173` - ✅ **ADD THIS** - for E2E container accessing frontend
- `http://backend:8000` - for cross-origin requests within same container

---

## Phase 3: Frontend Dev Server Configuration

### Goal
Ensure the frontend dev server is properly exposed on the network for E2E tests.

### Current Issue
Frontend is running but E2E container might not be able to reach it.

### What To Check/Fix

**File**: `.github/workflows/pull-request.yml` lines 461-468

**Current**:
```yaml
- name: Start frontend dev server
  run: |
     docker run -d \
       --name frontend \
       --network gift-genie-test \
       -p 5173:5173 \
       -e VITE_API_BASE_URL=http://backend:8000 \
       gift-genie-frontend:dev
```

**Should add environment variables**:
```yaml
- name: Start frontend dev server
  run: |
     docker run -d \
       --name frontend \
       --network gift-genie-test \
       -p 5173:5173 \
       -e VITE_API_BASE_URL=http://backend:8000 \
       -e HOST=0.0.0.0 \                    # ✅ ADD: Bind to all interfaces
       -e VITE_HOST=0.0.0.0 \              # ✅ ADD: Vite specific
       gift-genie-frontend:dev
```

---

## Phase 4: Backend Request/Response Logging

### Goal
Log exactly what requests the backend is receiving (or not receiving).

### What To Implement

**File**: `backend/src/gift_genie/presentation/middleware/exception_logging.py`

Enhance to log request and response bodies:

```python
class ExceptionLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Log incoming request
        request_body = await request.body()
        if request_body:
            logger.debug(
                f"Request body: {request_body.decode('utf-8', errors='ignore')}"
            )

        # 2. Process request
        response = await call_next(request)

        # 3. Log outgoing response (for errors)
        if response.status_code >= 400:
            logger.warning(
                f"Error response: {response.status_code}",
                extra={"response_headers": dict(response.headers)}
            )

        return response
```

---

## Phase 5: Step-by-Step Implementation Order

### Stage 1: Diagnostics (Do First)
These help us understand where it's failing:

1. ✅ Add network check to global-setup.ts
2. ✅ Add detailed error logging to auth-setup.ts
3. ✅ Add timeout to axios client
4. ✅ Run tests and capture logs

### Stage 2: Network Fixes (Do Second)
Once we see where it fails, apply these:

1. ✅ Add frontend origin to CORS_ORIGINS
2. ✅ Ensure backend is accessible from E2E container
3. ✅ Ensure frontend dev server binds to all interfaces
4. ✅ Run tests again

### Stage 3: Backend Logging (Do If Still Failing)
If tests still fail, these help us see what's happening on the backend:

1. ✅ Add request/response body logging
2. ✅ Verify backend is receiving requests
3. ✅ Check for timeout/resource issues

---

## Implementation Guide

### Quick Start (Try These First - 30 minutes)

```bash
# 1. Update CORS_ORIGINS in workflow
# File: .github/workflows/pull-request.yml
# Line 406: Add ,http://frontend:5173

# 2. Add axios timeout
# File: frontend/src/lib/api.ts
# After line 13: Add timeout: 30000

# 3. Add network diagnostics to auth-setup.ts
# File: frontend/e2e/utils/auth-setup.ts
# Add console.error with detailed error info in catch block

# 4. Test locally
./scripts/test-e2e-local-ci.sh
```

### If Still Failing (1-2 hours)

```bash
# 5. Add network check to global-setup
# File: frontend/e2e/global-setup.ts
# Add function to check connectivity before tests

# 6. Add request logging to backend
# File: backend/src/gift_genie/presentation/middleware/exception_logging.py
# Log request body on incoming requests

# 7. Run tests with verbose logging
./scripts/test-e2e-local-ci.sh --verbose
```

---

## Expected Outcomes

### After Phase 2 (CORS Fix)
- **If it works**: The fetch calls start reaching the backend
- **If it doesn't**: We'll see OPTIONS requests in backend logs (CORS preflight)
- **Benefit**: We'll know if CORS was the issue

### After Phase 1 (Diagnostics)
- **Better error messages**: Will see exactly why fetch is failing
- **Container info**: Will know hostname, network status
- **Timeout info**: Will see if requests are timing out vs. rejected

### After Phase 4 (Backend Logging)
- **Request visibility**: See exactly what body the API is receiving
- **Response details**: See what the backend sends back
- **Timing info**: Identify slow responses

---

## Troubleshooting Checklist

If tests STILL fail after applying these fixes, check:

- [ ] **Is backend container running?** `docker ps | grep backend`
- [ ] **Is backend healthy?** `docker exec backend curl http://localhost:8000/health`
- [ ] **Can E2E container reach backend?** `docker exec e2e-tests curl http://backend:8000/health`
- [ ] **Are containers on same network?** `docker network inspect gift-genie-test`
- [ ] **Does backend have CORS_ORIGINS set correctly?** `docker inspect backend | grep CORS`
- [ ] **Is frontend dev server running?** `docker ps | grep frontend`
- [ ] **Can E2E container reach frontend?** `docker exec e2e-tests curl http://frontend:5173`

---

## Files to Modify

1. **`.github/workflows/pull-request.yml`** - Line 406: Add frontend origin to CORS
2. **`frontend/src/lib/api.ts`** - Line 13: Add timeout configuration
3. **`frontend/e2e/utils/auth-setup.ts`** - Add detailed error logging
4. **`frontend/e2e/global-setup.ts`** - Add network health check (optional)
5. **`backend/src/gift_genie/presentation/middleware/exception_logging.py`** - Add request body logging (optional)

---

## Next Steps

1. **Apply Phase 1 & 2 immediately** (CORS fix + diagnostics)
2. **Run tests locally** with `./scripts/test-e2e-local-ci.sh`
3. **Review error messages** - they should be much more detailed now
4. **Apply Phase 3-4 if needed** based on what errors you see

The key insight: We're getting `TypeError: fetch failed` which means the frontend is making the request but it's failing at the network layer BEFORE reaching backend. The diagnostic logging will show us exactly why.
