# Database URL Encoding Fix Plan

## Problem Statement

The backend deployment is failing with:
```
RuntimeError: Failed to run database migrations: (psycopg2.OperationalError) could not translate host name "jSl2tHTW6$&&8#96h$Y@88b921e6-..." to address: Name or service not known
```

**Root Cause:** The database password contains special URL characters (`$`, `&`, `@`) that are not being URL-encoded when constructing the DATABASE_URL connection string. This causes the URL parser to misinterpret the connection string structure.

### Current Flow

1. Scaleway provides endpoint: `postgres://88b921e6-xxx.pg.sdb.fr-par.scw.cloud:5432/rdb?sslmode=require`
2. Terraform strips `postgres://` prefix
3. Terraform prepends credentials: `gift_genie:jSl2tHTW6$&&8#96h$Y@...`
4. Backend's `ensure_database_scheme()` adds `postgresql+asyncpg://`
5. **Problem:** Password's `@` symbol confuses URL parser

### Expected Format

```
postgresql+asyncpg://username:url_encoded_password@host:port/database?params
```

## Solution

Use Terraform's `urlencode()` function to properly encode the password before embedding it in the connection string.

## Implementation Steps

### 1. Update Terraform Configuration

**File:** `infra/compute.tf`

**Current (line 30):**
```hcl
"DATABASE_URL" = "${var.default_username}:${var.db_password}@${replace(scaleway_sdb_sql_database.main.endpoint, "postgres://", "")}"
```

**Updated:**
```hcl
"DATABASE_URL" = "${var.default_username}:${urlencode(var.db_password)}@${replace(scaleway_sdb_sql_database.main.endpoint, "postgres://", "")}"
```

**Why:** The `urlencode()` function will convert:
- `$` → `%24`
- `&` → `%26`
- `@` → `%40`
- etc.

This ensures the password is safely embedded in the URL without breaking parsing.

### 2. Verify Backend Handles URL-Encoded Passwords

**File:** `backend/src/gift_genie/infrastructure/config/settings.py`

The existing `ensure_database_scheme()` validator (lines 91-106) only adds the scheme prefix - it doesn't modify the credentials portion. This is correct behavior.

**No changes needed** - SQLAlchemy and psycopg2 automatically decode URL-encoded components.

### 3. Add Test Coverage

**File:** `backend/tests/test_settings.py`

Add test case to verify URL-encoded passwords are handled correctly:

```python
def test_database_url_with_special_characters_in_password():
    """Test that passwords with special characters work when URL-encoded."""
    # Simulate what Terraform does: urlencode the password
    url = "user:p%40ss%24w%26rd@host:5432/db?sslmode=require"

    settings = Settings(DATABASE_URL=url)

    expected_url = "postgresql+asyncpg://user:p%40ss%24w%26rd@host:5432/db?sslmode=require"
    assert settings.DATABASE_URL == expected_url
```

**Note:** Test already exists (line 71-77) - verify it covers the scenario.

## Deployment Steps

1. **Update Terraform:**
   - Modify `infra/compute.tf` line 30
   - Commit change

2. **Deploy:**
   - Push to main branch
   - GitHub Actions will trigger deployment
   - Terraform will update the backend container's environment variables
   - Container will restart with corrected DATABASE_URL

3. **Verify:**
   - Check deployment logs for successful migration
   - Test backend API endpoints
   - Confirm database connectivity

## Risk Assessment

**Risk Level:** Low

**Considerations:**
- URL encoding is standard practice for connection strings
- No application code changes required
- SQLAlchemy automatically handles URL decoding
- Existing tests verify behavior with encoded passwords
- Change is isolated to infrastructure configuration
- Rollback is simple: revert the Terraform change

## Alternative Approaches Considered

### Alternative 1: Use Kubernetes-style separate credential fields
**Rejected:** Scaleway Serverless Containers don't support this pattern; they require a full connection string.

### Alternative 2: Generate passwords without special characters
**Rejected:** Reduces security; proper URL encoding is the standard solution.

### Alternative 3: Use database IAM authentication
**Rejected:** Scaleway Serverless SQL Database doesn't support IAM auth yet.

## Success Criteria

- [ ] Backend container starts successfully
- [ ] Database migrations run without errors
- [ ] Backend API responds to health check
- [ ] Frontend can communicate with backend
- [ ] No connection string parsing errors in logs

## References

- [RFC 3986 - URL Encoding](https://datatracker.ietf.org/doc/html/rfc3986#section-2.1)
- [SQLAlchemy Database URLs](https://docs.sqlalchemy.org/en/20/core/engines.html#database-urls)
- [Terraform urlencode function](https://opentofu.org/docs/language/functions/urlencode/)
