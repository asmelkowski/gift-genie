# Database SSL Configuration Fix - Implementation Plan

## Problem Summary

E2E tests are failing with `ConnectionError: PostgreSQL server at "postgres:5432" rejected SSL upgrade`.

**Root Cause**: The application always forces SSL connections in `session.py`, but the local PostgreSQL container used for E2E tests doesn't support SSL. Meanwhile, Alembic migrations work because they don't apply SSL configuration.

## Solution Design

Implement environment-aware SSL configuration that:
1. Uses SSL for production/cloud databases (Scaleway)
2. Skips SSL for local development and E2E test databases
3. Provides explicit configuration control via environment variable

## Implementation Tasks

### 1. Update Settings Configuration

**File**: `backend/src/gift_genie/infrastructure/config/settings.py`

Add new setting:
```python
DATABASE_SSL_REQUIRED: bool = Field(
    default=False,
    description="Whether to require SSL for database connections"
)
```

Auto-detection logic:
- If `DATABASE_SSL_REQUIRED` env var is set, use that value
- Otherwise, detect from DATABASE_URL (SSL required if URL contains cloud provider patterns like "scaleway", "rds", "azure", etc.)
- Default to False for local development

### 2. Update Database Session Module

**File**: `backend/src/gift_genie/infrastructure/database/session.py`

Modify `_get_engine()` function:
- Check `settings.DATABASE_SSL_REQUIRED`
- Only create and apply SSL context if SSL is required
- Log the SSL mode being used (for debugging)

**Current code** (lines 25-36):
```python
# Configure SSL for Scaleway SDB (requires SSL without certificate verification)
# Local PostgreSQL works without SSL configuration
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE
connect_args = {"ssl": ssl_context}

_engine = create_async_engine(
    settings.DATABASE_URL,
    future=True,
    echo=False,
    connect_args=connect_args,
)
```

**New logic**:
```python
# Configure SSL based on settings
connect_args = {}
if settings.DATABASE_SSL_REQUIRED:
    logger.info("Database SSL required - configuring SSL context")
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args = {"ssl": ssl_context}
else:
    logger.info("Database SSL not required - using plain connection")

_engine = create_async_engine(
    settings.DATABASE_URL,
    future=True,
    echo=False,
    connect_args=connect_args,
)
```

### 3. Update Environment Files & Documentation

**Files to update**:
- `docker-compose.yml` - Ensure local setup doesn't set SSL required
- `docker-compose.dev.yml` - Same for dev environment
- `.github/workflows/*.yml` - CI should not require SSL for test database
- `README.md` or `ENVIRONMENT_SETUP.md` - Document the new setting

**Environment Variable Documentation**:
```
DATABASE_SSL_REQUIRED=true|false
  - Set to 'true' for production databases requiring SSL (Scaleway, AWS RDS, etc.)
  - Set to 'false' or omit for local PostgreSQL without SSL
  - Auto-detected from DATABASE_URL if not explicitly set
```

### 4. Add Auto-Detection Helper

**File**: `backend/src/gift_genie/infrastructure/config/settings.py`

Add helper method or validator to auto-detect SSL requirement:
```python
@field_validator("DATABASE_SSL_REQUIRED", mode="before")
@classmethod
def auto_detect_ssl_requirement(cls, v: bool | None, info: ValidationInfo) -> bool:
    """Auto-detect if SSL is required based on DATABASE_URL if not explicitly set."""
    if v is not None:
        return v

    # Get DATABASE_URL from values being validated
    database_url = info.data.get("DATABASE_URL", "")

    # Cloud provider patterns that typically require SSL
    cloud_patterns = ["scaleway", "rds.amazonaws", "database.azure", "cloudsql"]

    # Check if any cloud pattern is in the URL
    requires_ssl = any(pattern in database_url.lower() for pattern in cloud_patterns)

    return requires_ssl
```

## Testing Requirements

### Unit Tests
- Test SSL context creation when `DATABASE_SSL_REQUIRED=true`
- Test plain connection when `DATABASE_SSL_REQUIRED=false`
- Test auto-detection logic with various DATABASE_URL patterns

### Integration Tests
- Verify existing backend tests still pass
- E2E tests should pass with local PostgreSQL

### Manual Verification
- Local development works without SSL
- Production Scaleway connection still works with SSL (if applicable)

## Success Criteria

1. ✅ E2E tests pass with local PostgreSQL (no SSL)
2. ✅ Backend unit tests pass
3. ✅ Clear logging shows which SSL mode is active
4. ✅ Production deployments still work (if using Scaleway)
5. ✅ No breaking changes to existing functionality

## Rollback Plan

If issues arise:
1. Revert changes to `session.py` and `settings.py`
2. Set `DATABASE_SSL_REQUIRED=true` globally as temporary fix
3. Investigate specific environment issues

## Notes

- This fix makes SSL behavior explicit and predictable
- Auto-detection provides convenience while explicit config provides control
- Logging helps debugging connection issues in different environments
