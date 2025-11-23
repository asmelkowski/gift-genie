# Redis ACL Authentication Fix

## Problem
Redis authentication failing with: `invalid username-password pair or user is disabled`

## Root Cause
When using Redis ACL with a custom username (gift_genie), the Python redis client needs explicit `username` and `password` parameters, not just credentials embedded in the URL.

## Solution
Split Redis credentials into separate environment variables and pass them explicitly to the Redis client.

## Changes Required

### 1. backend/src/gift_genie/infrastructure/config/settings.py

Add after line 33:
```python
    # Redis
    REDIS_URL: str = "localhost:6379"
    REDIS_USERNAME: str = ""  # Empty for local dev (no auth)
    REDIS_PASSWORD: str = ""  # Empty for local dev (no auth)
```

### 2. infra/compute.tf

Replace lines 27-31:
```hcl
  secret_environment_variables = {
    "DATABASE_URL"     = "postgresql+asyncpg://${scaleway_sdb_sql_database.main.endpoint}?sslmode=require"
    "SECRET_KEY"       = var.db_password # Reusing for now
    "REDIS_URL"        = "${one(scaleway_redis_cluster.main.private_network).ips[0]}:${one(scaleway_redis_cluster.main.private_network).port}"
    "REDIS_USERNAME"   = var.default_username
    "REDIS_PASSWORD"   = var.redis_password
  }
```

### 3. backend/src/gift_genie/main.py

Replace lines 85-94:
```python
# Initialize Redis client with explicit ACL credentials
# For production: uses username + password from environment
# For local dev: no credentials needed (empty strings ignored)
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

## Testing Plan

### Local Testing
```bash
# No changes needed - local Redis has no auth
docker compose up -d
curl http://localhost:8000/health
# Should show: {"status": "healthy", "redis_status": "connected"}
```

### Production Testing (after deployment)
1. Deploy changes via GitHub Actions
2. Check container logs in Scaleway Console
3. Test health endpoint:
   ```bash
   curl https://your-backend-url/health
   # Should show: {"status": "healthy", "redis_status": "connected"}
   ```
4. Test rate limiting (which uses Redis):
   ```bash
   # Make multiple rapid requests to trigger rate limit
   for i in {1..10}; do curl -X POST https://your-backend-url/api/v1/auth/register; done
   ```

## Rollback Plan
If this doesn't work, revert all three files via git and redeploy.
