# Database URL Construction Fix

## Problem
The application was crashing on Scaleway deployment with:
```
ValueError: invalid literal for int() with base 10: ''
```

This occurred because the Scaleway Serverless SQL Database `endpoint` attribute might not include a port number, or might have a malformed format (e.g., `hostname:` with trailing colon but no port).

## Root Cause
1. **Terraform Configuration**: Was passing individual database components (`DB_USER`, `DB_PASSWORD`, `DB_ENDPOINT`, `DB_NAME`) and relying on Python to construct the URL
2. **Python Settings**: The endpoint parsing logic didn't handle edge cases:
   - Trailing colons with empty port strings
   - Missing ports entirely
   - This caused SQLAlchemy to receive empty strings for the port parameter

## Solution (Defense in Depth)

### 1. Terraform Fix (Primary Solution)
**File**: `infra/compute.tf`

Changed from passing individual components to constructing the complete DATABASE_URL:

```hcl
secret_environment_variables = {
  "DATABASE_URL"     = "postgresql+asyncpg://${var.default_username}:${var.db_password}@${scaleway_sdb_sql_database.main.endpoint}/${scaleway_sdb_sql_database.main.name}?sslmode=require"
  "SECRET_KEY"       = var.db_password
  "REDIS_URL"        = "..."
  "REDIS_USERNAME"   = var.default_username
  "REDIS_PASSWORD"   = var.redis_password
}
```

**Benefits**:
- More explicit and reliable
- Terraform handles string interpolation correctly
- Reduces complexity in Python code
- Avoids parsing edge cases

### 2. Python Settings Fix (Defensive Backup)
**File**: `backend/src/gift_genie/infrastructure/config/settings.py`

Enhanced the `assemble_db_url` validator to:

1. **Strip trailing colons** from `DB_ENDPOINT` before parsing
2. **Default to port 5432** (PostgreSQL standard) when no valid port is found
3. **Add comprehensive logging** to debug configuration issues
4. **Validate inputs** to ensure empty strings never reach SQLAlchemy

**Handles All Scenarios**:
- ✅ `hostname` → Uses port 5432
- ✅ `hostname:` → Strips colon, uses port 5432
- ✅ `hostname:5432` → Uses specified port
- ✅ `hostname:invalid` → Logs warning, uses port 5432
- ✅ Malformed values → Logs error, safe fallback

**Key Improvements**:
```python
# Strip whitespace and trailing colons
endpoint = self.DB_ENDPOINT.strip().rstrip(":")

# Always ensure a valid port
if not port_str or not port_str.strip():
    logger.warning("Empty port in DB_ENDPOINT, defaulting to 5432")
    self.DB_PORT = 5432
```

## Testing

### Verify Terraform Changes
```bash
cd infra
tofu plan
```

### Deploy
The fix will be applied automatically on the next deployment to `main` branch via GitHub Actions.

### Monitor Logs
After deployment, check container logs for:
- Successful database connection
- No ValueError exceptions
- Configuration logging output from settings.py

## Rollback Plan
If issues persist:
1. The backup file `infra/compute.tf.backup` contains the original configuration
2. Settings.py changes are backward compatible and can remain in place

## Files Changed
- `infra/compute.tf` - Simplified to use direct DATABASE_URL construction
- `backend/src/gift_genie/infrastructure/config/settings.py` - Enhanced endpoint parsing with logging and defaults

## References
- Error: `ValueError: invalid literal for int() with base 10: ''`
- Scaleway Serverless SQL Database endpoint format varies
- SQLAlchemy URL construction requirements
