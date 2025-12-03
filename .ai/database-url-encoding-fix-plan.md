# Database URL Encoding Fix - Implementation Plan

## Problem Statement

**Severity**: CRITICAL - Backend container failing to start in production

**Error**: `invalid interpolation syntax in 'postgresql://...' at position 25`

**Root Cause**: URL-encoded special characters in database password (`%26`, `%40`, `%23`, `%24`) are being interpreted as Python f-string format specifiers instead of literal characters.

**Current Flow**:
1. Terraform: `urlencode(var.db_password)` → `n%2695dc2IbmzUv0GF%40jSl2tHTW6%24%26%268%2396h%24Y`
2. Env var: `DATABASE_URL=username:encoded_password@host:port/db`
3. Settings validator: `f"postgresql+asyncpg://{self.DATABASE_URL}"` ← **BREAKS HERE**

## Technical Analysis

### Why URL Encoding?
- Special characters in passwords (`@`, `$`, `&`, `%`, etc.) break URL parsing
- Must be encoded for proper URL construction
- Example: `password@123` → `password%40123`

### Why F-String Breaks?
- F-strings interpret `%` as format specifier
- `%26` looks like format width specifier to Python
- F-string evaluation happens BEFORE URL parsing

### Valid Solutions
1. **Use string concatenation** instead of f-strings
2. **Double-escape** the URL (complicated, error-prone)
3. **Raw strings** (doesn't work with f-strings)

## Proposed Solution

**Use simple string concatenation** - Safe, explicit, no interpretation.

### Changes Required

#### File: `backend/src/gift_genie/infrastructure/config/settings.py`

**Current (lines 91-106)**:
```python
@model_validator(mode="after")
def ensure_database_scheme(self) -> "Settings":
    """Add PostgreSQL async driver scheme to DATABASE_URL if not present.

    Terraform provides: username:password@host:port/db?params
    We convert to: postgresql+asyncpg://username:password@host:port/db?params
    """
    logger.info(f"ensure_database_scheme called with: {self.DATABASE_URL}")
    # Check if URL already has a scheme (contains ://)
    if "://" not in self.DATABASE_URL:
        # Credentials@host format from Terraform - add our driver scheme
        logger.info("Adding postgresql+asyncpg:// scheme")
        self.DATABASE_URL = f"postgresql+asyncpg://{self.DATABASE_URL}"
    else:
        logger.info("Scheme already present, no change needed")
    return self
```

**Fixed**:
```python
@model_validator(mode="after")
def ensure_database_scheme(self) -> "Settings":
    """Add PostgreSQL async driver scheme to DATABASE_URL if not present.

    Terraform provides: username:password@host:port/db?params
    We convert to: postgresql+asyncpg://username:password@host:port/db?params

    Note: Uses string concatenation (not f-strings) to avoid issues with
    URL-encoded special characters like %26, %40, etc. being interpreted
    as format specifiers.
    """
    logger.info("ensure_database_scheme called with: " + self.DATABASE_URL)
    # Check if URL already has a scheme (contains ://)
    if "://" not in self.DATABASE_URL:
        # Credentials@host format from Terraform - add our driver scheme
        logger.info("Adding postgresql+asyncpg:// scheme")
        self.DATABASE_URL = "postgresql+asyncpg://" + self.DATABASE_URL
    else:
        logger.info("Scheme already present, no change needed")
    return self
```

**Key Changes**:
1. Line 98: `logger.info(f"... {self.DATABASE_URL}")` → `logger.info("... " + self.DATABASE_URL)`
2. Line 103: `f"postgresql+asyncpg://{self.DATABASE_URL}"` → `"postgresql+asyncpg://" + self.DATABASE_URL`
3. Added docstring note explaining why concatenation is used

## Testing Strategy

### Unit Tests
- Test with URL-encoded passwords containing: `%`, `@`, `$`, `&`, `#`
- Test scheme detection logic (with/without `://`)
- Test both local format and Terraform format

### Integration Tests
- Verify database connection with encoded password
- Verify migrations run successfully
- Test in Docker environment (mimics production)

### Test Cases

```python
def test_database_url_with_encoded_special_chars():
    """Test that URL-encoded passwords don't break f-string parsing."""
    # Password: p@ss$word&123 → p%40ss%24word%2616123
    encoded_url = "user:p%40ss%24word%26123@localhost:5432/db"
    settings = Settings(DATABASE_URL=encoded_url)
    assert settings.DATABASE_URL == f"postgresql+asyncpg://{encoded_url}"
    assert "%" in settings.DATABASE_URL  # Verify encoding preserved

def test_database_url_with_scheme_already_present():
    """Test that URLs with schemes are not modified."""
    full_url = "postgresql+asyncpg://user:pass@localhost:5432/db"
    settings = Settings(DATABASE_URL=full_url)
    assert settings.DATABASE_URL == full_url
```

## Deployment Strategy

### Pre-Deployment
1. **Create fix branch**: `fix/database-url-encoding`
2. **Update settings.py**: Apply string concatenation fix
3. **Add/update tests**: Ensure coverage for encoded passwords
4. **Run tests locally**: `make test` (backend/)
5. **Commit changes**: Clear commit message explaining fix

### Deployment Steps
1. **Push branch** to GitHub
2. **Merge to main** (or manual workflow trigger)
3. **CI builds new backend image** with fix
4. **Scaleway deploys** updated container
5. **Monitor logs**: Watch for successful startup and migration

### Verification
```bash
# Check container logs
# Expected: "Database migrations completed successfully"

# Test health endpoint
curl https://api.gift-genie.eu/health

# Test authenticated endpoint
curl https://api.gift-genie.eu/api/v1/auth/me
```

### Rollback Plan
If deployment fails:
1. Revert commit in main branch
2. CI automatically deploys previous working version
3. Container should return to last known good state

## Impact Assessment

### Risk Level: LOW
- Single-line change (string concatenation)
- Maintains exact same functionality
- No changes to Terraform config
- No database schema changes
- Backward compatible with local development

### Testing Confidence: HIGH
- Logic is simple and explicit
- Easy to add comprehensive tests
- Can verify locally before deployment

### Downtime: ~5-10 minutes
- CI build + deploy time
- No database downtime (migrations will succeed this time)

## Success Criteria

✅ Backend container starts successfully
✅ Database migrations run without errors
✅ Health endpoint returns 200 OK
✅ Can create/login users (auth endpoints work)
✅ No errors in container logs
✅ Then proceed with DNS custom domain fix

## Follow-Up Actions

After this fix is deployed and verified:
1. Resume DNS custom domain deployment (original task)
2. Force recreate Scaleway container domains
3. Verify SSL certificates provision correctly
4. Test full application flow

## Timeline

- **Fix implementation**: 10 minutes
- **Testing**: 10 minutes
- **CI deployment**: 10-15 minutes
- **Verification**: 5 minutes
- **Total**: ~40 minutes

Then proceed with DNS fix deployment (~30 minutes)

**Total time to full resolution**: ~70 minutes
