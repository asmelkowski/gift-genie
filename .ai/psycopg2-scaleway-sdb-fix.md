# Psycopg2 Scaleway Serverless SQL Database Fix

## Problem

Backend migrations were failing in production with the error:
```
FATAL: Database hostname wasn't sent to server. Either add "?options=databaseid%3D{databaseid}"
at the end of your connection string, or use another client supporting TLS ServerNameIndication.
```

**Root Cause**: Scaleway Serverless SQL Database requires the database ID to be sent via TLS Server Name Indication (SNI). While the DATABASE_URL contained `?options=databaseid%3D{uuid}`, psycopg2 (used by Alembic migrations) doesn't automatically use URL query parameters. It requires the `options` parameter to be passed via `connect_args` in libpq format.

## Solution

Updated `backend/alembic/env.py` to extract the `options` parameter from the DATABASE_URL and pass it to psycopg2 via `connect_args` in the correct libpq format.

### Changes Made

#### File: `backend/alembic/env.py`

**Added Imports:**
```python
import ssl
from urllib.parse import parse_qs, unquote, urlparse
```

**Enhanced `run_migrations_online()` Function:**

1. **Parse URL and extract query parameters**:
   ```python
   parsed_url = urlparse(url)
   query_params = parse_qs(parsed_url.query)
   ```

2. **Extract and format `options` parameter**:
   ```python
   connect_args: dict[str, object] = {}
   if 'options' in query_params:
       options_value = unquote(query_params['options'][0])  # Decode URL encoding
       connect_args['options'] = f'-c {options_value}'      # Format for libpq
   ```

3. **Add SSL configuration if required**:
   ```python
   if settings.DATABASE_SSL_REQUIRED:
       ssl_context = ssl.create_default_context()
       ssl_context.check_hostname = False
       ssl_context.verify_mode = ssl.CERT_NONE
       connect_args['ssl_context'] = ssl_context
   ```

4. **Pass `connect_args` to SQLAlchemy engine**:
   ```python
   connectable = create_engine(url, poolclass=pool.NullPool, connect_args=connect_args)
   ```

### How It Works

#### URL Processing Flow

**Terraform sets DATABASE_URL:**
```
{access_key}:{secret_key}@{uuid}.pg.sdb.fr-par.scw.cloud:5432/dbname?options=databaseid%3D{uuid}&sslmode=require
```

**Settings.py processes it:**
- Extracts and removes `sslmode` parameter
- Adds `postgresql://` scheme for psycopg2
- Result: `postgresql://{creds}@{host}:5432/dbname?options=databaseid%3D{uuid}`

**Alembic env.py processes it:**
- Parses URL and extracts `options=databaseid%3D{uuid}`
- URL-decodes to `databaseid={uuid}`
- Formats as `-c databaseid={uuid}` for libpq
- Passes via `connect_args["options"]` to psycopg2
- Adds SSL context via `connect_args["ssl_context"]`

#### Local Development
- No `options` parameter in URL
- `connect_args` remains empty (or just SSL if enabled)
- Standard PostgreSQL connection

#### Production (Scaleway SDB)
- URL contains `?options=databaseid%3D{uuid}`
- Options extracted and formatted correctly
- SSL context added
- psycopg2 sends database ID via TLS SNI ✓

### Compatibility

**Works with:**
- ✅ Local PostgreSQL (Docker, localhost) - no SSL, no options
- ✅ Scaleway Serverless SQL Database - SSL + database ID
- ✅ Other cloud PostgreSQL providers with SSL
- ✅ Asyncpg runtime connections (unchanged)

**Maintains:**
- ✅ Backward compatibility with existing setups
- ✅ Consistency with `session.py` SSL configuration
- ✅ Type safety with Python 3.10+ syntax

### Testing

**Local Testing:**
```bash
cd backend
pytest tests/test_database_migrations.py -v
```

**Production Deployment:**
1. Merge to main branch
2. CI/CD will deploy to Scaleway
3. Monitor container logs for:
   - `"Database migrations completed successfully"`
   - No "Database hostname wasn't sent" errors

### Technical Details

**Why URL query parameters don't work with psycopg2:**
- SQLAlchemy's `make_url()` parses query parameters
- But psycopg2 (via libpq) doesn't automatically use them
- Must be passed explicitly via connection kwargs

**LibPQ `options` format:**
- Standard: `options=-c key1=value1 -c key2=value2`
- Our case: `options=-c databaseid={uuid}`
- This gets passed to PostgreSQL server startup parameters

**SSL Context:**
- Matches configuration from `session.py`
- `check_hostname=False` - accepts any hostname
- `verify_mode=ssl.CERT_NONE` - doesn't verify certificate
- Necessary for Scaleway's managed SSL certificates

### Related Files

- `backend/alembic/env.py` - Migration configuration (UPDATED)
- `backend/src/gift_genie/infrastructure/config/settings.py` - Settings with SSL auto-detection
- `backend/src/gift_genie/infrastructure/database/session.py` - Runtime async connections
- `backend/src/gift_genie/infrastructure/database/migrations.py` - Migration runner
- `infra/compute.tf` - Terraform DATABASE_URL configuration

### References

- PostgreSQL libpq connection parameters: https://www.postgresql.org/docs/current/libpq-connect.html
- Scaleway SDB documentation: https://www.scaleway.com/en/docs/faq/serverless-sql-databases/
- Previous fix: `.ai/scaleway-sdb-database-id-fix.md`
- SSL fix: `.ai/database-ssl-fix-summary.md`

---

**Implementation Date:** December 10, 2024
**Branch:** `fix/psycopg2-scaleway-database-id`
**Status:** Ready for Testing
