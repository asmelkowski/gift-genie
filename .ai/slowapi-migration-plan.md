# SlowAPI Migration Implementation Plan

## Executive Summary

**Objective:** Migrate from FastAPILimiter + managed Redis to SlowAPI with in-memory rate limiting.

**Benefits:**
- Remove expensive managed Redis infrastructure (€15-25/month savings)
- Backend can scale to zero (additional idle-time cost savings)
- Add actual rate limiting protection (currently initialized but not used)
- Maintain future flexibility to add Redis backend if needed

**Timeline:** ~1-2 hours implementation + testing

**Risk Level:** Low (rate limiting not currently used, easy rollback)

---

## Architecture Changes

### Current Architecture
```
┌─────────────┐
│   Backend   │──────────────┐
│  Container  │              │
└─────────────┘              │
                             ▼
                    ┌──────────────┐
                    │    Redis     │
                    │   Managed    │  ← €15-25/month
                    │   Cluster    │
                    └──────────────┘
                             ▲
                             │
                    FastAPILimiter.init()
                    (blocks startup)
```

**Issues:**
- Redis required for backend startup (can't scale to zero)
- Paying for unused infrastructure (rate limiting not applied to endpoints)
- Unnecessary complexity

### Target Architecture
```
┌─────────────────────────┐
│   Backend Container     │
│                         │
│  SlowAPI + In-Memory    │  ← €0/month
│  (can scale to zero)    │
└─────────────────────────┘
```

**Benefits:**
- No external dependencies for rate limiting
- Backend can scale to zero
- Simpler infrastructure
- Easy Redis upgrade path via `storage_uri` parameter

---

## Implementation Phases

### Phase 1: Update Backend Dependencies

**Goal:** Replace FastAPILimiter and Redis with SlowAPI

**Tasks:**
1. Remove `fastapi-limiter>=0.1.6` from `pyproject.toml`
2. Remove `redis>=4.6.0` from `pyproject.toml`
3. Add `slowapi>=0.1.9` to `pyproject.toml`
4. Update lock file

**Files to modify:**
- `backend/pyproject.toml`

**Commands:**
```bash
cd backend
# Remove old dependencies
uv remove fastapi-limiter redis
# Add new dependency
uv add slowapi
```

**Validation:**
```bash
uv pip list | grep -E "slowapi|redis|limiter"
# Should show: slowapi (no redis, no fastapi-limiter)
```

---

### Phase 2: Update Backend Application Code

**Goal:** Replace FastAPILimiter initialization with SlowAPI

**Files to modify:**
- `backend/src/gift_genie/main.py`
- `backend/src/gift_genie/infrastructure/config/settings.py`

#### 2.1 Update main.py

**Current code (lines 1-10, 57-69, 94-107, 119-138):**
```python
import redis.asyncio as redis
from fastapi_limiter import FastAPILimiter

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    run_migrations()
    logger.info("Initializing FastAPILimiter...")
    await FastAPILimiter.init(redis_client)  # ← Blocks startup
    logger.info("FastAPILimiter initialized")
    yield

redis_client = redis.from_url(
    f"redis://{settings.REDIS_URL}",
    username=settings.REDIS_USERNAME if settings.REDIS_USERNAME else None,
    password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
    encoding="utf-8",
    decode_responses=True,
    max_connections=50,
    socket_connect_timeout=5,
    socket_timeout=5,
)

class HealthResponse(BaseModel):
    status: Literal["healthy", "unhealthy"]
    redis_status: str | None = None

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    redis_status = "disconnected"
    overall_status: Literal["healthy", "unhealthy"] = "healthy"

    try:
        await redis_client.ping()
        redis_status = "connected"
    except Exception as e:
        redis_status = "disconnected"
        overall_status = "unhealthy"
        logger.error(f"Redis health check failed: {e}")

    return HealthResponse(status=overall_status, redis_status=redis_status)
```

**New code:**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Initialize SlowAPI with in-memory storage (default)
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Run database migrations first (before any other initialization)
    logger.info("Starting database migrations...")
    run_migrations()
    logger.info("Database migrations completed")

    # Note: SlowAPI doesn't require async initialization for in-memory storage
    logger.info("Rate limiting initialized with in-memory storage")

    yield

# After creating the app
app = FastAPI(
    title="Gift Genie API",
    description="API for organizing gift exchanges within groups",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Add SlowAPI to app state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ... CORS middleware, etc. ...

# Simplified health endpoint (no Redis check needed)
class HealthResponse(BaseModel):
    status: Literal["healthy"]  # Always healthy if app is running

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="healthy")
```

**Complete replacement strategy:**
1. Remove lines: `import redis.asyncio as redis`
2. Remove lines: `from fastapi_limiter import FastAPILimiter`
3. Add imports: SlowAPI imports
4. Remove: Redis client initialization (lines 94-107)
5. Update: lifespan function (remove FastAPILimiter.init)
6. Add: SlowAPI initialization after app creation
7. Simplify: Health endpoint (remove Redis check)

#### 2.2 Update settings.py

**Changes:**
Remove Redis configuration (no longer needed):

```python
# Remove these lines:
# Redis
REDIS_URL: str = "localhost:6379"
REDIS_USERNAME: str = ""  # Empty for local dev (no auth)
REDIS_PASSWORD: str = ""  # Empty for local dev (no auth)
```

**Note:** We'll keep these settings for now to avoid breaking tests, but mark them as deprecated. We can remove in a follow-up cleanup.

**Alternative (safer for now):**
Add comment marking as deprecated:
```python
# Redis - DEPRECATED: Replaced with SlowAPI in-memory rate limiting
# These settings are kept for backward compatibility but are no longer used
REDIS_URL: str = "localhost:6379"
REDIS_USERNAME: str = ""
REDIS_PASSWORD: str = ""
```

---

### Phase 3: Add Rate Limiting to Endpoints

**Goal:** Apply rate limiting to API endpoints (currently not implemented)

**Recommended rate limits:**
- Auth endpoints: More restrictive (prevent brute force)
- Regular endpoints: Generous (prevent abuse, not UX hindrance)

**Strategy:**
Start conservative (can always increase limits later):
- Auth endpoints: `5/minute` for login/register (prevent brute force)
- Public endpoints: `100/minute` (generous for normal use)
- Authenticated endpoints: `200/minute` (authenticated users get more)

#### 3.1 Add Rate Limiting to Auth Endpoints

**File:** `backend/src/gift_genie/presentation/api/v1/auth.py`

**Add to imports:**
```python
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
```

**Add after imports:**
```python
# Get limiter from app state (will be injected by FastAPI)
def get_limiter() -> Limiter:
    from gift_genie.main import limiter
    return limiter
```

**Apply rate limits to endpoints:**

```python
# Register endpoint - strict limit to prevent spam accounts
@router.post("/register", response_model=UserCreatedResponse, status_code=201)
@limiter.limit("5/minute")  # ← Add this decorator
async def register_user(
    request: Request,  # ← Add this parameter (required by SlowAPI)
    payload: RegisterRequest,
    response: Response,
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    password_hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
) -> UserCreatedResponse:
    # ... existing code ...

# Login endpoint - strict limit to prevent brute force
@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")  # ← Add this decorator
async def login_user(
    request: Request,  # ← Add this parameter (required by SlowAPI)
    payload: LoginRequest,
    response: Response,
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    password_hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)],
) -> LoginResponse:
    # ... existing code ...

# Me endpoint - generous limit (authenticated users)
@router.get("/me", response_model=UserProfileResponse)
@limiter.limit("100/minute")  # ← Add this decorator
async def get_current_user_profile(
    request: Request,  # ← Add this parameter (required by SlowAPI)
    current_user_id: Annotated[str, Depends(get_current_user)],
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
) -> UserProfileResponse:
    # ... existing code ...

# Logout endpoint - moderate limit
@router.post("/logout", status_code=204)
@limiter.limit("10/minute")  # ← Add this decorator
async def logout(
    request: Request,  # ← Add this parameter (required by SlowAPI)
    response: Response
) -> None:
    # ... existing code ...
```

**Critical:**
- The `@limiter.limit()` decorator MUST be BELOW the `@router.*()` decorator
- The `request: Request` parameter MUST be explicitly added to each rate-limited endpoint
- Import `limiter` from `main.py` (shared instance)

#### 3.2 Add Rate Limiting to Other API Endpoints

**Files to update:**
- `backend/src/gift_genie/presentation/api/v1/groups.py`
- `backend/src/gift_genie/presentation/api/v1/members.py`
- `backend/src/gift_genie/presentation/api/v1/exclusions.py`
- `backend/src/gift_genie/presentation/api/v1/draws.py`

**Strategy:**
Apply `@limiter.limit("100/minute")` to all authenticated endpoints.
Apply `@limiter.limit("200/minute")` to read-only endpoints.
Apply `@limiter.limit("50/minute")` to write endpoints (POST/PUT/DELETE).

**Example (groups.py):**
```python
from fastapi import Request
from gift_genie.main import limiter

@router.post("/groups", response_model=GroupCreatedResponse, status_code=201)
@limiter.limit("50/minute")
async def create_group(
    request: Request,  # ← Add this
    # ... other parameters
):
    # ... existing code ...

@router.get("/groups", response_model=list[GroupListItem])
@limiter.limit("200/minute")
async def list_groups(
    request: Request,  # ← Add this
    # ... other parameters
):
    # ... existing code ...
```

**Note:** We'll apply rate limiting selectively. Not every endpoint needs aggressive limits.

---

### Phase 4: Update Tests

**Goal:** Update tests to handle rate limiting (if needed)

**Files to check:**
- `backend/tests/conftest.py`
- All `test_*_api.py` files

**Approach 1: Disable rate limiting in tests (recommended)**

Update `conftest.py`:
```python
import pytest
from httpx import AsyncClient, ASGITransport
from gift_genie.main import app, limiter


@pytest.fixture
async def client():
    """Async test client with rate limiting disabled"""
    # Disable rate limiting for tests
    limiter._enabled = False

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    # Re-enable after tests
    limiter._enabled = True


@pytest.fixture
def anyio_backend():
    return "asyncio"
```

**Approach 2: Test rate limiting explicitly (optional)**

Add a dedicated test file `test_rate_limiting.py`:
```python
import pytest
from httpx import AsyncClient, ASGITransport
from gift_genie.main import app


@pytest.fixture
async def rate_limited_client():
    """Test client with rate limiting enabled"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.anyio
async def test_register_rate_limit(rate_limited_client):
    """Test that register endpoint enforces rate limit"""
    payload = {
        "email": "test@example.com",
        "password": "SecureP@ss123",
        "name": "Test User"
    }

    # Make 6 requests (limit is 5/minute)
    for i in range(6):
        response = await rate_limited_client.post("/api/v1/auth/register", json=payload)
        if i < 5:
            assert response.status_code in [201, 400]  # Success or validation error
        else:
            assert response.status_code == 429  # Rate limit exceeded
```

**Recommendation:** Start with Approach 1 (disable in tests), add Approach 2 later if desired.

---

### Phase 5: Update Infrastructure (Remove Redis)

**Goal:** Remove all Redis infrastructure and related configuration

#### 5.1 Update Docker Compose (Local Development)

**File:** `docker-compose.yml`

**Remove:**
```yaml
redis:
  image: redis:7-alpine
  container_name: gift-genie-redis
  ports:
    - 6379:6379
  volumes:
    - redis_data:/data
  healthcheck:
    test:
      - CMD
      - redis-cli
      - ping
    interval: 10s
    timeout: 3s
    retries: 5
  networks:
    - gift-genie-network
```

**Update backend service (remove Redis dependency):**
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
    target: production
  container_name: gift-genie-backend
  environment:
    PROD: true
    # Remove: REDIS_URL: $REDIS_URL
    DATABASE_URL: $DATABASE_URL
    CORS_ORIGINS: http://localhost:80,http://localhost
  ports:
    - 8000:8000
  depends_on:
    postgres:
      condition: service_healthy
    # Remove: redis dependency
  # ... rest of config
```

**Remove Redis volume:**
```yaml
volumes:
  postgres_data: null
  # Remove: redis_data: null
```

#### 5.2 Update Terraform Infrastructure

**File:** `infra/db.tf`

**Remove entire Redis cluster resource:**
```terraform
# Remove this entire block:
resource "scaleway_redis_cluster" "main" {
  name         = "gift-genie-redis-${var.env}"
  version      = "7.2.11"
  node_type    = "RED1-MICRO"
  cluster_size = 1
  user_name    = var.default_username
  password     = var.redis_password
  zone         = var.zone
  tags         = ["gift-genie", var.env]

  private_network {
    id          = scaleway_vpc_private_network.main.id
    service_ips = ["172.16.0.10/22"]
  }
}

# Remove these outputs:
output "redis_endpoint" {
  value     = "${one(scaleway_redis_cluster.main.private_network).ips[0]}:${one(scaleway_redis_cluster.main.private_network).port}"
  sensitive = false
}

output "redis_private_endpoint" {
  value       = "${one(scaleway_redis_cluster.main.private_network).ips[0]}:${one(scaleway_redis_cluster.main.private_network).port}"
  description = "Redis private network endpoint for container connections"
  sensitive   = false
}
```

**File:** `infra/compute.tf`

**Remove Redis environment variables from backend container:**
```terraform
resource "scaleway_container" "backend" {
  # ... existing config ...

  secret_environment_variables = {
    "DATABASE_URL"   = "${var.default_username}:${var.db_password}@${replace(scaleway_sdb_sql_database.main.endpoint, "postgres://", "")}"
    "SECRET_KEY"     = var.db_password # Reusing for now
    # Remove these three lines:
    # "REDIS_URL"      = "${one(scaleway_redis_cluster.main.private_network).ips[0]}:${one(scaleway_redis_cluster.main.private_network).port}"
    # "REDIS_USERNAME" = var.default_username
    # "REDIS_PASSWORD" = var.redis_password
  }
}
```

**File:** `infra/variables.tf`

**Mark Redis variables as deprecated (or remove):**
```terraform
# Option 1: Remove entirely
# Remove this block:
# variable "redis_password" {
#   description = "Password for the managed Redis cluster"
#   type        = string
#   sensitive   = true
# }

# Option 2: Mark as deprecated (safer for gradual migration)
variable "redis_password" {
  description = "DEPRECATED: No longer used. Kept for backward compatibility."
  type        = string
  sensitive   = true
  default     = ""  # Make optional with default
}
```

**File:** `infra/outputs.tf`

**Remove Redis outputs:**
```terraform
# Remove any outputs related to Redis
# (already removed in db.tf changes above)
```

#### 5.3 Update Backend Dockerfile (if needed)

**File:** `backend/Dockerfile`

**Check if Redis is referenced** (unlikely, but verify):
```bash
grep -i redis backend/Dockerfile
```

If found, remove those references.

#### 5.4 Update Environment Variables Documentation

**Files to check:**
- `backend/.env.example` (if exists)
- `README.md` files
- `.github/workflows/*.yml` (CI/CD)

**Remove Redis-related environment variables:**
- `REDIS_URL`
- `REDIS_USERNAME`
- `REDIS_PASSWORD`

---

### Phase 6: Update Documentation

**Goal:** Document the rate limiting implementation and removal of Redis

**Files to update:**
- `backend/README.md`
- `README.md` (root)
- `.ai/tech_stack.md`
- Any other relevant docs

**Add section to backend/README.md:**
```markdown
## Rate Limiting

The API uses [SlowAPI](https://github.com/laurentS/slowapi) for rate limiting with in-memory storage.

**Current limits:**
- Authentication endpoints: 5 requests/minute (prevents brute force)
- Read endpoints: 200 requests/minute
- Write endpoints: 50 requests/minute

**Storage:**
- Development & Production: In-memory (rate limits reset on container restart)
- Future: Can be upgraded to Redis by setting `storage_uri` parameter

**Testing:**
Rate limiting is disabled in tests by default. To test rate limits explicitly, use the `rate_limited_client` fixture.

**Upgrading to Redis (if needed):**
```python
# In main.py
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://redis-host:6379"  # Add this line
)
```
```

**Update .ai/tech_stack.md:**
```markdown
### Rate Limiting
- **Library**: SlowAPI
- **Storage**: In-memory (with Redis upgrade path)
- **Strategy**: Per-IP rate limiting
- **Configuration**: Decorator-based on endpoints
```

---

## Testing Strategy

### Pre-Deployment Testing (Local)

**1. Install dependencies:**
```bash
cd backend
uv sync
```

**2. Start local environment:**
```bash
docker-compose up postgres  # Only postgres needed now
```

**3. Run backend locally:**
```bash
cd backend
uv run uvicorn gift_genie.main:app --reload
```

**4. Manual testing:**
```bash
# Health check (should not mention Redis)
curl http://localhost:8000/health

# Test rate limiting - make 6 rapid requests
for i in {1..6}; do
  curl -X POST http://localhost:8000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test'$i'@example.com","password":"SecureP@ss123","name":"Test User"}'
  echo ""
done
# Expected: First 5 succeed (or fail validation), 6th returns 429
```

**5. Run test suite:**
```bash
cd backend
uv run pytest -v
```

**6. Check for Redis references:**
```bash
grep -r "redis" backend/src --include="*.py" | grep -v __pycache__
# Should return no results (or only in deprecated settings)
```

### Post-Deployment Testing (Production)

**1. Health check:**
```bash
curl https://api.your-domain.com/health
# Should return: {"status":"healthy"}
```

**2. Verify rate limiting:**
```bash
# Make rapid requests to test rate limit
for i in {1..6}; do
  curl -X GET https://api.your-domain.com/api/v1/auth/me \
    -H "Cookie: access_token=YOUR_TOKEN"
  echo ""
done
# Expected: 6th request returns 429 (if limit is 5/minute)
```

**3. Monitor backend logs:**
```bash
# Check for Redis connection errors (should be none)
scaleway container logs <backend-container-id> | grep -i redis
```

**4. Verify cost reduction:**
- Check Scaleway billing dashboard
- Confirm Redis cluster is destroyed
- Verify backend container can scale to zero during idle periods

---

## Rollback Plan

If issues occur after deployment:

### Immediate Rollback (Backend Code)

**1. Revert code changes:**
```bash
git revert <commit-hash>
git push
```

**2. Redeploy previous version:**
```bash
# Trigger CI/CD to deploy previous commit
git push origin main
```

### Infrastructure Rollback (Terraform)

**If you need to restore Redis:**

**1. Revert Terraform changes:**
```bash
cd infra
git revert <terraform-commit-hash>
```

**2. Re-apply infrastructure:**
```bash
terraform plan
terraform apply
```

**3. Update backend environment variables:**
```bash
# Manually set Redis environment variables in Scaleway console
# OR re-run Terraform apply to restore them
```

### Partial Rollback (Keep SlowAPI, Re-add Redis)

If SlowAPI works but you want Redis backend:

**1. Deploy Redis container:**
Add to `infra/compute.tf`:
```terraform
resource "scaleway_container" "redis" {
  name               = "gift-genie-redis"
  namespace_id       = scaleway_container_namespace.main.id
  registry_image     = "redis:7-alpine"
  port               = 6379
  cpu_limit          = 140
  memory_limit       = 256
  min_scale          = 1
  max_scale          = 1
  deploy             = true
  private_network_id = scaleway_vpc_private_network.main.id
}
```

**2. Update backend code:**
```python
# In main.py
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=f"redis://{settings.REDIS_URL}"
)
```

**3. Deploy:**
```bash
terraform apply
git commit -am "feat: add Redis backend for rate limiting"
git push
```

---

## Risk Assessment

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Backend fails to start after migration | Low | High | Pre-deployment testing, gradual rollout |
| Rate limiting breaks API functionality | Low | Medium | Disable rate limiting in tests, monitor logs |
| Tests fail due to rate limiting | Medium | Low | Disable rate limiting in test fixtures |
| Infrastructure destroy fails (Redis) | Low | Low | Manual cleanup via Scaleway console |
| Production traffic hits rate limits | Low | Medium | Start with generous limits, monitor metrics |

### Mitigation Strategies

**1. Gradual rollout:**
- Deploy to staging first (if available)
- Monitor for 24h before production
- Prepare rollback scripts

**2. Monitoring:**
- Check backend error rates after deployment
- Monitor 429 (rate limit) response codes
- Review user feedback/support tickets

**3. Rate limit tuning:**
- Start with generous limits (can always decrease)
- Monitor 429 responses in first week
- Adjust limits based on actual usage patterns

**4. Escape hatch:**
- Keep Terraform state backup before destruction
- Document manual Redis re-creation process
- Test rollback procedure before production deployment

---

## Success Criteria

### Functional Requirements
- ✅ Backend starts successfully without Redis
- ✅ Health endpoint returns healthy status
- ✅ All existing tests pass
- ✅ Rate limiting blocks excessive requests (429 responses)
- ✅ Normal API usage unaffected

### Non-Functional Requirements
- ✅ Backend can scale to zero during idle periods
- ✅ No Redis connection errors in logs
- ✅ Infrastructure costs reduced by €15-25/month
- ✅ Response times unchanged (or improved)
- ✅ Zero downtime during migration

### Verification Checklist
- [ ] All tests passing locally
- [ ] Manual rate limit testing successful
- [ ] No Redis references in code (except deprecated settings)
- [ ] Docker compose works without Redis service
- [ ] Terraform plan shows Redis resources will be destroyed
- [ ] Documentation updated
- [ ] Rollback procedure documented and tested

---

## Timeline & Effort Estimate

### Phase 1: Backend Code Changes (45 minutes)
- Update dependencies: 5 minutes
- Update main.py: 15 minutes
- Add rate limiting to endpoints: 20 minutes
- Update tests: 5 minutes

### Phase 2: Infrastructure Changes (20 minutes)
- Update docker-compose.yml: 5 minutes
- Update Terraform files: 10 minutes
- Review changes: 5 minutes

### Phase 3: Testing (30 minutes)
- Local testing: 15 minutes
- Run test suite: 5 minutes
- Manual verification: 10 minutes

### Phase 4: Deployment (20 minutes)
- Commit changes: 5 minutes
- Terraform apply: 10 minutes
- Post-deployment verification: 5 minutes

### Phase 5: Documentation (15 minutes)
- Update README files: 10 minutes
- Update tech stack docs: 5 minutes

**Total Estimated Time: 2 hours 10 minutes**

**Recommended Schedule:**
- Day 1: Backend code changes + local testing (1 hour)
- Day 2: Infrastructure changes + deployment (1 hour)
- Day 3: Monitoring + documentation (15 minutes)

---

## Post-Migration Tasks

### Immediate (Day 1-3)
- [ ] Monitor backend error rates
- [ ] Check for 429 responses in logs
- [ ] Verify cost reduction in Scaleway billing
- [ ] Confirm backend scales to zero during idle periods

### Short-term (Week 1)
- [ ] Review rate limit effectiveness (any 429s?)
- [ ] Adjust rate limits if needed
- [ ] Gather user feedback
- [ ] Remove deprecated Redis settings from code

### Long-term (Month 1)
- [ ] Evaluate if Redis backend needed (based on scale)
- [ ] Consider adding rate limit metrics/monitoring
- [ ] Document any lessons learned

---

## Future Enhancements

### When to Consider Redis Backend

**Triggers for upgrading to Redis:**
1. Backend scales beyond 1 instance regularly
2. Rate limits being bypassed via restarts
3. Need for persistent rate limiting across deployments
4. Other features requiring Redis (caching, sessions, etc.)

**Migration path:**
```python
# In main.py - just add one parameter
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://redis-container:6379"  # ← Only change needed
)
```

### Additional Rate Limiting Features

**Possible enhancements:**
- Per-user rate limits (instead of per-IP)
- Dynamic rate limits based on user tier
- Rate limit headers in responses (X-RateLimit-Remaining, etc.)
- Rate limit dashboard/monitoring
- Whitelist for trusted IPs

**Implementation:**
```python
# Per-user rate limiting
def get_user_id(request: Request) -> str:
    # Extract user ID from JWT token
    return request.state.user_id or get_remote_address(request)

limiter = Limiter(key_func=get_user_id)
```

---

## Appendix: Reference Commands

### Development
```bash
# Start local environment (no Redis)
docker-compose up postgres

# Run backend locally
cd backend
uv run uvicorn gift_genie.main:app --reload

# Run tests
uv run pytest -v

# Check for Redis references
grep -r "redis" backend/src --include="*.py" | grep -v __pycache__
```

### Deployment
```bash
# Check Terraform plan
cd infra
terraform plan

# Apply infrastructure changes
terraform apply

# View container logs
scaleway container logs <container-id>

# Check backend health
curl https://api.your-domain.com/health
```

### Monitoring
```bash
# Check rate limit responses
curl -w "\n%{http_code}\n" https://api.your-domain.com/api/v1/auth/me

# Monitor backend scaling
scaleway container list --namespace-id=<namespace-id>

# Check Scaleway billing
scaleway account summary
```

---

## Questions & Decisions Log

### Decision 1: In-Memory vs Redis
**Decision:** Start with in-memory, upgrade to Redis if needed
**Rationale:** Cost savings, simpler architecture, easy upgrade path
**Date:** 2025-11-25

### Decision 2: Rate Limit Values
**Decision:** Conservative limits (5/min auth, 100/min read, 50/min write)
**Rationale:** Better to be restrictive initially, can always increase
**Date:** 2025-11-25

### Decision 3: Test Strategy
**Decision:** Disable rate limiting in tests by default
**Rationale:** Simpler test maintenance, explicit rate limit tests separate
**Date:** 2025-11-25

---

## Contact & Support

**Questions during implementation?**
- Check SlowAPI docs: https://slowapi.readthedocs.io/
- Check limits (backend) docs: https://limits.readthedocs.io/
- Reference this plan for guidance

**Issues after deployment?**
- Review rollback procedures above
- Check backend logs for errors
- Consult Scaleway support for infrastructure issues

---

*Plan created: 2025-11-25*
*Last updated: 2025-11-25*
*Status: Ready for implementation*
