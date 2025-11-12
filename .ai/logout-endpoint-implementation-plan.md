# API Endpoint Implementation Plan: POST /api/v1/auth/logout

## 1. Endpoint Overview

The logout endpoint provides a stateless session invalidation mechanism for the Gift Genie application. Since the application uses JWT-based authentication with httpOnly cookies, logout is accomplished by instructing the browser to delete the `access_token` cookie. The endpoint always returns `204 No Content` regardless of the user's authentication state, ensuring idempotency and preventing information leakage.

**Key Characteristics:**
- **Stateless operation**: No database interaction required (JWT tokens are not stored)
- **Idempotent**: Multiple logout requests have the same effect as a single request
- **Simple presentation layer concern**: No use case or business logic needed
- **Always succeeds**: Returns 204 even if user is not authenticated or cookie doesn't exist

## 2. Request Details

- **HTTP Method**: `POST`
- **URL Structure**: `/api/v1/auth/logout`
- **Request Body**: None
- **Query Parameters**: None
- **Path Parameters**: None
- **Headers**: None required
- **Cookies**: Optionally reads `access_token` cookie (if present)

**Example Request:**
```http
POST /api/v1/auth/logout HTTP/1.1
Host: localhost:8000
Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Used Types

**No DTOs or Commands needed** for this endpoint because:
- No request body to validate
- No business logic to execute
- No database operations to perform
- Operation is purely at the presentation layer (clearing HTTP cookie)

This follows the Clean Architecture principle that not every endpoint requires a use case. Simple presentation-layer operations (like clearing cookies) can be handled directly in the router.

## 4. Response Details

**Success Response:**
- **Status Code**: `204 No Content`
- **Body**: Empty (no response body)
- **Headers**:
  - `Set-Cookie: access_token=; Max-Age=0; Path=/; HttpOnly; SameSite=lax`
  - (In production with HTTPS, also include `Secure` flag)

**Example Response:**
```http
HTTP/1.1 204 No Content
Set-Cookie: access_token=; Max-Age=0; Path=/; HttpOnly; SameSite=lax
Content-Length: 0
```

**No Error Responses:**
The endpoint always returns 204, even in these scenarios:
- User is not authenticated (no cookie present)
- Cookie contains invalid/expired token
- User is already logged out
- Cookie has wrong format

This design ensures:
1. **Idempotency**: Calling logout multiple times is safe
2. **Security**: No information leakage about authentication state
3. **Simplicity**: No error handling needed

## 5. Data Flow

```
┌─────────┐                  ┌──────────────┐
│ Client  │                  │   FastAPI    │
│(Browser)│                  │    Router    │
└────┬────┘                  └──────┬───────┘
     │                              │
     │ POST /api/v1/auth/logout     │
     │ Cookie: access_token=...     │
     │─────────────────────────────>│
     │                              │
     │                              │ Clear cookie by setting
     │                              │ Max-Age=0 in response
     │                              │
     │      204 No Content          │
     │ Set-Cookie: access_token=;   │
     │           Max-Age=0          │
     │<─────────────────────────────│
     │                              │
     │ Browser deletes cookie       │
     │                              │
```

**Flow Steps:**
1. Client sends POST request to `/api/v1/auth/logout` (optionally with `access_token` cookie)
2. FastAPI router receives request
3. Router handler creates response with cleared cookie (Max-Age=0)
4. Returns 204 No Content status with Set-Cookie header
5. Browser receives response and deletes the cookie
6. User is effectively logged out (subsequent requests have no auth cookie)

**No Database Operations:**
- JWT tokens are stateless and not stored in the database
- No need to invalidate tokens in a session table
- Tokens remain valid until expiration (30 minutes per settings)
- This is acceptable security trade-off for the architecture

## 6. Security Considerations

### 6.1 Cookie Clearing Security

**Critical Requirements:**
- Must set `Max-Age=0` to instruct browser to delete cookie immediately
- Must match the same cookie attributes used when setting the cookie:
  - Same `Path=/`
  - Same `HttpOnly=True`
  - Same `SameSite=lax`
  - Same `Secure` flag (False in dev, True in production)
- Mismatched attributes will fail to clear the cookie properly

### 6.2 Authentication Not Required

**Design Decision**: The endpoint does not require authentication.

**Rationale:**
- Logout should be idempotent and always succeed
- Forcing authentication would prevent logout if token is expired/invalid
- An unauthenticated user calling logout is harmless (no-op)
- Prevents information leakage (attacker can't probe authentication state)

### 6.3 CSRF Considerations

**Current Approach**: No CSRF validation on logout endpoint.

**Analysis:**
- The existing codebase (login endpoint) sets `X-CSRF-Token` header but doesn't validate CSRF on subsequent requests
- For consistency, logout won't validate CSRF tokens
- Risk is minimal: an attacker forcing logout is less harmful than unauthorized actions
- The httpOnly cookie already provides CSRF protection for the token itself

**Future Enhancement**: If stricter CSRF protection is needed:
- Validate `X-CSRF-Token` header on state-changing operations
- Implement CSRF token validation middleware

### 6.4 Token Invalidation Limitations

**Important Security Note:**
- JWT tokens remain valid until expiration (cannot be invalidated server-side)
- After logout, the token is still technically valid for up to 30 minutes
- If an attacker has captured the token, they can still use it until expiration

**Acceptable Trade-off** because:
- Tokens have short expiration (30 minutes)
- Stateless architecture is simpler and more scalable
- Most use cases don't require immediate invalidation

**Future Enhancement**: If immediate invalidation is required:
- Implement token blacklist/revocation list (Redis cache)
- Store token JTI (JWT ID) in blacklist on logout
- Validate tokens against blacklist in auth middleware

### 6.5 Information Leakage Prevention

**Security Feature**: Always return 204 regardless of authentication state

**Prevents:**
- Attackers probing whether a user is logged in
- Timing attacks based on different response codes
- Revealing authentication state to unauthorized parties

## 7. Error Handling

**No Error Scenarios** - This endpoint is designed to always succeed.

### 7.1 Expected Behavior

| Scenario | Status Code | Response | Notes |
|----------|-------------|----------|-------|
| Valid authenticated user | 204 | No Content | Cookie cleared successfully |
| No cookie present | 204 | No Content | Idempotent operation |
| Invalid/expired token | 204 | No Content | Still clears cookie |
| Already logged out | 204 | No Content | Multiple logouts are safe |
| Malformed cookie | 204 | No Content | Browser will clear it |

### 7.2 Unexpected Server Errors

**Only possible error**: 500 Internal Server Error if unexpected exception occurs

**Handling:**
```python
except Exception as e:
    logger.exception("Unexpected error during logout")
    raise HTTPException(status_code=500, detail={"code": "server_error"})
```

**Likelihood**: Extremely low (operation is just setting a cookie header)

### 7.3 Logging Strategy

**Log Level: INFO**
- Log successful logout attempts (optional, for audit trail)
- Example: `logger.info("User logged out")`

**Log Level: ERROR**
- Log unexpected exceptions only
- Include minimal context (no sensitive data)

**Do Not Log:**
- Token values (security risk)
- Whether user was actually authenticated (privacy)
- Cookie contents (security risk)

## 8. Performance Considerations

### 8.1 Performance Characteristics

- **Time Complexity**: O(1) - constant time operation
- **Database Queries**: 0 queries
- **External Services**: None
- **Memory**: Negligible (just setting response header)
- **Response Time**: < 1ms (typically microseconds)

### 8.2 Scalability

**Highly Scalable:**
- No database bottleneck
- No shared state
- Can handle millions of requests per second per instance
- No cache invalidation needed
- No distributed coordination required

### 8.3 Potential Bottlenecks

**None identified** - This is one of the simplest possible HTTP operations.

### 8.4 Optimization Opportunities

**Not needed** - The operation is already optimal.

## 9. Implementation Steps

### Step 1: Add Logout Route Handler

**File**: `backend/src/gift_genie/presentation/api/v1/auth.py`

Add the logout endpoint after the `/me` endpoint:

```python
@router.post("/logout", status_code=204)
async def logout(response: Response) -> None:
    """
    Logout user by clearing the access_token cookie.

    This endpoint always succeeds (204) regardless of authentication state,
    ensuring idempotency and preventing information leakage.
    """
    try:
        response.set_cookie(
            key="access_token",
            value="",
            max_age=0,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax",
            path="/",
        )
        logger.info("User logged out successfully")
    except Exception as e:
        logger.exception("Unexpected error during logout")
        raise HTTPException(status_code=500, detail={"code": "server_error"})
```

**Key Implementation Details:**
- Use `status_code=204` in decorator to set default response code
- Return type is `None` (no response body for 204)
- Set `max_age=0` to instruct browser to delete cookie immediately
- Match cookie attributes from login endpoint (httponly, samesite, secure, path)
- Include try-except for unexpected errors (though unlikely)
- Log at INFO level for audit trail
- No authentication required (no `Depends(get_current_user)`)

### Step 2: Create Comprehensive Tests

**File**: `backend/tests/test_auth_logout_api.py` (new file)

```python
import pytest
from httpx import AsyncClient
from gift_genie.main import app


@pytest.mark.anyio
async def test_logout_success_with_valid_token(client: AsyncClient):
    """Test logout with authenticated user (valid token in cookie)."""
    # Set a fake access token cookie
    client.cookies.set("access_token", "fake.jwt.token")

    resp = await client.post("/api/v1/auth/logout")

    assert resp.status_code == 204
    assert resp.text == ""  # No response body

    # Verify cookie is cleared (Max-Age=0 or expires in past)
    set_cookie_header = resp.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie_header
    assert "Max-Age=0" in set_cookie_header or "expires=" in set_cookie_header
    assert "HttpOnly" in set_cookie_header
    assert "SameSite=lax" in set_cookie_header


@pytest.mark.anyio
async def test_logout_success_without_token(client: AsyncClient):
    """Test logout without authentication (no cookie) - should still succeed."""
    resp = await client.post("/api/v1/auth/logout")

    assert resp.status_code == 204
    assert resp.text == ""

    # Should still set cookie with Max-Age=0
    set_cookie_header = resp.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie_header


@pytest.mark.anyio
async def test_logout_success_with_invalid_token(client: AsyncClient):
    """Test logout with invalid/expired token - should still succeed."""
    client.cookies.set("access_token", "invalid.token.here")

    resp = await client.post("/api/v1/auth/logout")

    assert resp.status_code == 204
    assert resp.text == ""


@pytest.mark.anyio
async def test_logout_idempotency(client: AsyncClient):
    """Test that multiple logout calls are idempotent."""
    # First logout
    resp1 = await client.post("/api/v1/auth/logout")
    assert resp1.status_code == 204

    # Second logout (already logged out)
    resp2 = await client.post("/api/v1/auth/logout")
    assert resp2.status_code == 204

    # Third logout
    resp3 = await client.post("/api/v1/auth/logout")
    assert resp3.status_code == 204


@pytest.mark.anyio
async def test_logout_clears_cookie_properly(client: AsyncClient):
    """Test that cookie is cleared with correct attributes."""
    client.cookies.set("access_token", "some.token.value")

    resp = await client.post("/api/v1/auth/logout")

    # Parse Set-Cookie header
    set_cookie = resp.headers.get("set-cookie", "")

    # Verify cookie is cleared
    assert "access_token=" in set_cookie
    assert "Max-Age=0" in set_cookie or "max-age=0" in set_cookie.lower()

    # Verify security attributes match login
    assert "httponly" in set_cookie.lower()
    assert "samesite=lax" in set_cookie.lower()
    assert "path=/" in set_cookie.lower()


@pytest.mark.anyio
async def test_logout_wrong_method_405(client: AsyncClient):
    """Test that GET request to logout returns 405 Method Not Allowed."""
    resp = await client.get("/api/v1/auth/logout")
    assert resp.status_code == 405


@pytest.mark.anyio
async def test_logout_with_extra_payload_ignored(client: AsyncClient):
    """Test that logout ignores any request body if provided."""
    # Some clients might send body by mistake
    resp = await client.post(
        "/api/v1/auth/logout",
        json={"unexpected": "data"}
    )

    # Should still succeed (body is ignored)
    assert resp.status_code == 204
```

**Test Coverage:**
- ✅ Success with valid token (authenticated user)
- ✅ Success without token (unauthenticated user)
- ✅ Success with invalid/expired token
- ✅ Idempotency (multiple logout calls)
- ✅ Cookie clearing verification (attributes match login)
- ✅ Wrong HTTP method (GET should return 405)
- ✅ Unexpected request body (should be ignored)

### Step 3: Run Tests

```bash
cd backend
uv run pytest tests/test_auth_logout_api.py -v
```

**Expected Output:**
```
tests/test_auth_logout_api.py::test_logout_success_with_valid_token PASSED
tests/test_auth_logout_api.py::test_logout_success_without_token PASSED
tests/test_auth_logout_api.py::test_logout_success_with_invalid_token PASSED
tests/test_auth_logout_api.py::test_logout_idempotency PASSED
tests/test_auth_logout_api.py::test_logout_clears_cookie_properly PASSED
tests/test_auth_logout_api.py::test_logout_wrong_method_405 PASSED
tests/test_auth_logout_api.py::test_logout_with_extra_payload_ignored PASSED
```

### Step 4: Run Full Test Suite

Ensure no regressions in existing tests:

```bash
cd backend
uv run pytest tests/ -v
```

### Step 5: Type Checking

```bash
cd backend
make typecheck  # or: uv run mypy src/
```

**Expected**: No type errors (endpoint is simple and fully typed)

### Step 6: Linting and Formatting

```bash
cd backend
make format  # or: uv run ruff format src/ tests/
make lint    # or: uv run ruff check src/ tests/
```

**Expected**: All checks pass (code follows project conventions)

### Step 7: Manual Testing with Hurl

**File**: `hurl/logout_operations.hurl` (new file)

```hurl
# Test 1: Logout after successful login
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json
{
  "email": "test@example.com",
  "password": "TestPass123!"
}

HTTP 200
[Asserts]
jsonpath "$.user.id" exists
jsonpath "$.token_type" == "Bearer"
[Captures]
access_token: cookie "access_token"


# Test 2: Logout with valid token
POST http://localhost:8000/api/v1/auth/logout
Cookie: access_token={{access_token}}

HTTP 204
[Asserts]
header "Set-Cookie" contains "access_token="
header "Set-Cookie" contains "Max-Age=0"


# Test 3: Verify logout - accessing protected endpoint should fail
GET http://localhost:8000/api/v1/auth/me

HTTP 401
[Asserts]
jsonpath "$.detail.code" == "unauthorized"


# Test 4: Logout without token (idempotent)
POST http://localhost:8000/api/v1/auth/logout

HTTP 204


# Test 5: Multiple logouts (idempotency test)
POST http://localhost:8000/api/v1/auth/logout
HTTP 204

POST http://localhost:8000/api/v1/auth/logout
HTTP 204

POST http://localhost:8000/api/v1/auth/logout
HTTP 204
```

**Run Hurl Tests:**
```bash
hurl --test hurl/logout_operations.hurl
```

### Step 8: Update API Documentation

The OpenAPI schema will automatically update when the endpoint is added. Verify:

1. Start the backend server:
   ```bash
   cd backend
   uv run uvicorn gift_genie.main:app --reload
   ```

2. View OpenAPI docs at: http://localhost:8000/docs

3. Verify the logout endpoint appears with:
   - Method: POST
   - Path: /api/v1/auth/logout
   - Response: 204 No Content
   - Description showing it's idempotent and always succeeds

### Step 9: Frontend Integration Notes

**For Frontend Developers:**

1. **API Call:**
   ```typescript
   // In src/lib/api.ts or similar
   export const logout = async (): Promise<void> => {
     await apiClient.post('/auth/logout');
     // No response body for 204
   };
   ```

2. **Zustand Store Update:**
   ```typescript
   // In useAuthStore.ts
   logout: async () => {
     try {
       await logout();
       set({ user: null, isAuthenticated: false });
       // Clear React Query cache
       queryClient.clear();
       // Redirect to login
       navigate('/login');
     } catch (error) {
       // Even if error, clear local state
       set({ user: null, isAuthenticated: false });
     }
   },
   ```

3. **React Query Integration:**
   ```typescript
   export const useLogoutMutation = () => {
     const { logout: logoutStore } = useAuthStore();

     return useMutation({
       mutationFn: logout,
       onSuccess: () => {
         logoutStore();
       },
       onError: () => {
         // Still logout locally even if API fails
         logoutStore();
       },
     });
   };
   ```

4. **Error Handling:**
   - Always clear local state even if API call fails
   - 204 response has no body, don't try to parse JSON
   - Network errors should still result in local logout

### Step 10: Commit Changes

Follow conventional commits format:

```bash
git add backend/src/gift_genie/presentation/api/v1/auth.py
git add backend/tests/test_auth_logout_api.py
git add hurl/logout_operations.hurl
git commit -m "feat(auth): add logout endpoint with cookie clearing

- Implement POST /api/v1/auth/logout endpoint
- Returns 204 No Content and clears access_token cookie
- Endpoint is idempotent and always succeeds
- Add comprehensive test suite covering all scenarios
- Add Hurl integration tests for manual verification"
```

## 10. Verification Checklist

Before considering implementation complete, verify:

- [ ] Endpoint added to `backend/src/gift_genie/presentation/api/v1/auth.py`
- [ ] Returns 204 No Content status code
- [ ] Clears `access_token` cookie with `Max-Age=0`
- [ ] Cookie attributes match login endpoint (httponly, samesite, secure, path)
- [ ] No authentication required (works for unauthenticated users)
- [ ] Comprehensive test file created with 7+ test cases
- [ ] All tests pass (`pytest tests/test_auth_logout_api.py`)
- [ ] Full test suite passes (no regressions)
- [ ] Type checking passes (`make typecheck`)
- [ ] Linting passes (`make lint`)
- [ ] Formatting applied (`make format`)
- [ ] Hurl integration tests created and pass
- [ ] OpenAPI docs show endpoint correctly
- [ ] Manual testing confirms cookie is cleared in browser
- [ ] Logging includes INFO message for audit trail
- [ ] Error handling catches unexpected exceptions
- [ ] Code follows project conventions (async, type hints, imports)
- [ ] Committed with conventional commit message

## 11. Future Enhancements

### 11.1 Token Blacklist/Revocation

**Problem**: JWT tokens remain valid until expiration (30 minutes) after logout.

**Solution**: Implement token blacklist using Redis:

```python
# In infrastructure/security/token_blacklist.py
class TokenBlacklistService:
    def __init__(self, redis_client):
        self.redis = redis_client

    async def blacklist_token(self, token: str, expires_in: int):
        """Add token to blacklist with TTL matching token expiration."""
        await self.redis.setex(f"blacklist:{token}", expires_in, "1")

    async def is_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        return await self.redis.exists(f"blacklist:{token}")

# Update logout endpoint
@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    blacklist: TokenBlacklistService = Depends(get_blacklist_service)
):
    token = request.cookies.get("access_token")
    if token:
        # Calculate remaining TTL
        jwt_service = JWTService(settings.SECRET_KEY, settings.ALGORITHM)
        payload = jwt_service.verify_token(token)
        exp = payload.get("exp")
        ttl = exp - datetime.now(UTC).timestamp()

        # Blacklist token
        await blacklist.blacklist_token(token, int(ttl))

    # Clear cookie
    response.set_cookie(...)
```

### 11.2 CSRF Token Validation

**Enhancement**: Validate CSRF token on logout for additional security:

```python
@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    csrf_token: str = Header(None, alias="X-CSRF-Token")
):
    # Validate CSRF token from session/cookie
    if not validate_csrf(csrf_token):
        raise HTTPException(status_code=403, detail={"code": "invalid_csrf"})

    # Continue with logout...
```

### 11.3 Logout from All Devices

**Enhancement**: Add endpoint to logout from all devices:

```python
@router.post("/logout/all", status_code=204)
async def logout_all_devices(
    current_user_id: str = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    # Invalidate all tokens for user (requires token versioning)
    await user_repo.increment_token_version(current_user_id)

    # Clear current cookie
    response.set_cookie(...)
```

### 11.4 Audit Logging

**Enhancement**: Add detailed audit logs for compliance:

```python
@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    audit_log: AuditLogService = Depends(get_audit_service)
):
    user_id = None
    token = request.cookies.get("access_token")
    if token:
        # Extract user ID from token
        payload = jwt_service.verify_token(token)
        user_id = payload.get("sub")

    # Log logout event
    await audit_log.log_event(
        event_type="user.logout",
        user_id=user_id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    # Continue with logout...
```

## 12. References

- **Existing Auth Endpoints**: `backend/src/gift_genie/presentation/api/v1/auth.py`
- **JWT Service**: `backend/src/gift_genie/infrastructure/security/jwt.py`
- **Settings**: `backend/src/gift_genie/infrastructure/config/settings.py`
- **Auth Tests**: `backend/tests/test_auth_*_api.py`
- **FastAPI Cookies**: https://fastapi.tiangolo.com/advanced/response-cookies/
- **HTTP 204 Status**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/204
- **Cookie Security**: https://owasp.org/www-community/controls/SecureCookieAttribute
