# Redis ACL Authentication Fix - Implementation Plan

## Problem Statement
Production backend containers are failing to authenticate with Scaleway Managed Redis, showing error:
```
redis.exceptions.AuthenticationError: invalid username-password pair or user is disabled
```

## Root Cause Analysis

The Python `redis` library's `from_url()` method does not properly handle Redis ACL authentication when credentials are embedded in the URL string. According to Redis ACL best practices and the redis-py documentation, when using username-based authentication (not just password), credentials should be passed as explicit parameters.

**Current approach (NOT working):**
```python
redis.from_url("redis://username:password@host:port")
```

**Required approach (WORKS):**
```python
redis.from_url("redis://host:port", username="username", password="password")
```

## Solution Design

### Changes Required

#### 1. Backend Settings (`backend/src/gift_genie/infrastructure/config/settings.py`)

**Current (lines 32-33):**
```python
    # Redis
    REDIS_URL: str = "localhost:6379"
```

**New:**
```python
    # Redis
    REDIS_URL: str = "localhost:6379"
    REDIS_USERNAME: str = ""  # Empty for local dev (no auth)
    REDIS_PASSWORD: str = ""  # Empty for local dev (no auth)
```

**Rationale:** Separate credentials from connection string for explicit authentication.

---

#### 2. Infrastructure Configuration (`infra/compute.tf`)

**Current (lines 27-31):**
```hcl
  secret_environment_variables = {
    "DATABASE_URL" = "postgresql+asyncpg://${scaleway_sdb_sql_database.main.endpoint}?sslmode=require"
    "SECRET_KEY"   = var.db_password # Reusing for now
    "REDIS_URL"    = "${var.default_username}:${var.redis_password}@${one(scaleway_redis_cluster.main.private_network).ips[0]}:${one(scaleway_redis_cluster.main.private_network).port}"
  }
```

**New:**
```hcl
  secret_environment_variables = {
    "DATABASE_URL"     = "postgresql+asyncpg://${scaleway_sdb_sql_database.main.endpoint}?sslmode=require"
    "SECRET_KEY"       = var.db_password # Reusing for now
    "REDIS_URL"        = "${one(scaleway_redis_cluster.main.private_network).ips[0]}:${one(scaleway_redis_cluster.main.private_network).port}"
    "REDIS_USERNAME"   = var.default_username
    "REDIS_PASSWORD"   = var.redis_password
  }
```

**Rationale:** Split credentials into separate environment variables so they can be passed explicitly to the Redis client.

---

#### 3. Redis Client Initialization (`backend/src/gift_genie/main.py`)

**Current (lines 85-94):**
```python
# Initialize rate limiter with stable, well-tested configuration
# Core parameters: connection pooling, UTF-8 encoding, response decoding, and socket timeouts
redis_client = redis.from_url(
    f"redis://{settings.REDIS_URL}",
    encoding="utf-8",
    decode_responses=True,
    max_connections=50,
    socket_connect_timeout=5,
    socket_timeout=5,
)
```

**New:**
```python
# Initialize Redis client with explicit ACL credentials for Scaleway Managed Redis
# Production: Authenticates with username+password from environment variables
# Local dev: Credentials are empty strings, passes None for no authentication
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
```

**Rationale:** Pass credentials explicitly as parameters to support Redis ACL authentication.

---

## Testing Strategy

### Phase 1: Local Development Environment
**Objective:** Ensure changes don't break local development

```bash
# Start local services
docker compose up -d

# Verify backend health
curl http://localhost:8000/health

# Expected output:
# {"status": "healthy", "redis_status": "connected"}

# Run backend tests
cd backend
make test
```

**Success Criteria:**
- ✅ Backend starts without errors
- ✅ Health endpoint shows Redis connected
- ✅ All tests pass
- ✅ Rate limiting works (uses Redis)

---

### Phase 2: Production Deployment
**Objective:** Fix Redis authentication in Scaleway production environment

```bash
# Commit changes
git add backend/src/gift_genie/infrastructure/config/settings.py
git add backend/src/gift_genie/main.py
git add infra/compute.tf
git commit -m "fix(redis): use explicit ACL authentication for Scaleway Redis"
git push origin main

# GitHub Actions will automatically deploy
```

**Success Criteria:**
- ✅ GitHub Actions workflow completes successfully
- ✅ Backend container starts and stays healthy
- ✅ Container logs show no Redis errors
- ✅ Health endpoint returns `redis_status: "connected"`

---

### Phase 3: Production Validation
**Objective:** Confirm Redis is working in production

**Via Scaleway Console:**
1. Navigate to Containers > gift-genie-backend
2. Check Status = "Ready"
3. View Logs - should NOT see authentication errors
4. Should see: "Redis healthy" or similar success messages

**Via Health Endpoint:**
```bash
# Get backend URL from Scaleway Console or Terraform output
BACKEND_URL="https://your-backend-url"

# Check health
curl $BACKEND_URL/health

# Expected:
# {"status": "healthy", "redis_status": "connected"}
```

**Via Functional Testing:**
```bash
# Test rate limiting (uses Redis)
for i in {1..10}; do
  curl -s -X POST $BACKEND_URL/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!","name":"Test"}'
done

# Expected: Some requests should hit rate limit (429 Too Many Requests)
```

---

## Rollback Plan

If production deployment fails:

### Option 1: Revert via Git
```bash
git revert HEAD
git push origin main
# Wait for auto-deployment
```

### Option 2: Manual Revert
```bash
# Revert each file manually
git checkout HEAD~1 -- backend/src/gift_genie/infrastructure/config/settings.py
git checkout HEAD~1 -- backend/src/gift_genie/main.py
git checkout HEAD~1 -- infra/compute.tf
git commit -m "revert: rollback Redis ACL authentication changes"
git push origin main
```

### Option 3: Emergency Terraform Revert
```bash
cd infra
# Edit compute.tf to restore old REDIS_URL format
tofu apply -target=scaleway_container.backend
```

---

## Impact Assessment

### Local Development
- ✅ **No impact** - empty credentials work with unauthenticated local Redis
- ✅ **Backward compatible** - existing Docker Compose setup unchanged

### Production Environment
- ✅ **Fixes authentication** - proper ACL credentials passed to Redis
- ✅ **No downtime** - container redeploy handled by Scaleway
- ✅ **No data loss** - Redis data persists through deployment
- ⚠️  **Brief service interruption** (~30-60 seconds during container restart)

### Dependencies
- ✅ **No code changes needed** - only configuration
- ✅ **No database migrations** - Redis structure unchanged
- ✅ **No frontend changes** - backend API unchanged

---

## Success Metrics

After deployment, verify:
- [ ] Backend container status = "Ready" in Scaleway Console
- [ ] Container logs show NO Redis authentication errors
- [ ] `/health` endpoint returns `redis_status: "connected"`
- [ ] Rate limiting works (can trigger 429 errors)
- [ ] User registration/login flows work normally
- [ ] No increase in error rates in application logs

---

## Timeline

1. **Implementation:** 15 minutes (file edits)
2. **Local testing:** 10 minutes (docker compose, health check)
3. **Code review:** 15 minutes (verify changes)
4. **Deployment:** 5-10 minutes (GitHub Actions auto-deploy)
5. **Validation:** 15 minutes (health checks, functional testing)

**Total:** ~60 minutes

---

## Open Questions

1. **TLS Requirement?** - Does Scaleway Redis require TLS (`rediss://`)?
   - **Answer:** Will know after deployment. If auth still fails, try changing scheme to `rediss://`

2. **Connection from private network confirmed?** - Is backend container actually on private network?
   - **Answer:** `private_network_id` is set on container, should work

3. **Alternative usernames?** - Should we try `default` user instead of `gift_genie`?
   - **Answer:** Not needed - `redis-cli` confirmed `gift_genie` user exists and works

---

## References

- [redis-py ACL Authentication](https://redis-py.readthedocs.io/en/stable/connections.html#redis.Redis.from_url)
- [Scaleway Redis Cluster](https://www.scaleway.com/en/docs/managed-databases/redis/)
- [Redis ACL](https://redis.io/docs/management/security/acl/)

---

**Created:** November 23, 2025
**Status:** Ready for implementation
**Risk Level:** Low (easily reversible)
