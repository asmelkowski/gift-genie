# Scaleway Serverless SQL Database ID Fix - Implementation Summary

## Problem

Backend deployment failing with database connection error:

```
FATAL: Database hostname wasn't sent to server. Either add "?options=databaseid%3D{databaseid}"
at the end of your connection string, or use another client supporting TLS ServerNameIndication.
```

**Root Cause:** Scaleway Serverless SQL Database (SDB) requires a special `options=databaseid={uuid}` query parameter for TLS Server Name Indication (SNI). Our DATABASE_URL was missing this required parameter.

## Solution

Added database ID extraction and inclusion in the DATABASE_URL connection string via Terraform.

### Changes Made

#### 1. Updated `infra/compute.tf`

**Added locals block** to extract database ID from Scaleway SDB endpoint:

```terraform
locals {
  # Extract host:port/db part from endpoint (remove postgres:// prefix)
  db_connection_string = replace(scaleway_sdb_sql_database.main.endpoint, "postgres://", "")

  # Extract database ID (UUID before first dot in hostname)
  database_id = regex("^([^.]+)\\.", local.db_connection_string)[0]
}
```

**Updated DATABASE_URL** to include required `databaseid` parameter:

```terraform
# Before:
"DATABASE_URL" = "${var.scw_access_key}:${urlencode(var.scw_secret_key)}@${replace(scaleway_sdb_sql_database.main.endpoint, "postgres://", "")}?sslmode=require"

# After:
"DATABASE_URL" = "${var.scw_access_key}:${urlencode(var.scw_secret_key)}@${local.db_connection_string}?options=databaseid%3D${local.database_id}&sslmode=require"
```

**Key Changes:**
- Extract database ID (UUID) from endpoint hostname using regex
- Add `options=databaseid%3D{uuid}` parameter before `sslmode=require`
- Note: `%3D` is URL-encoded `=` sign

#### 2. Added Terraform Output in `infra/db.tf`

```terraform
output "db_database_id" {
  value       = regex("^([^.]+)\\.", replace(scaleway_sdb_sql_database.main.endpoint, "postgres://", ""))[0]
  description = "Database ID (UUID) extracted from endpoint for TLS SNI configuration"
  sensitive   = false
}
```

This output helps verify database ID extraction during `terraform apply`.

### How It Works

**Scaleway SDB Endpoint Format:**
```
postgres://88b921e6-e7d4-4f50-93b9-a0ec7a91d66c.pg.sdb.fr-par.scw.cloud:5432/rdb
```

**Extraction Process:**
1. Strip `postgres://` prefix → `88b921e6-e7d4-4f50-93b9-a0ec7a91d66c.pg.sdb.fr-par.scw.cloud:5432/rdb`
2. Extract UUID before first dot → `88b921e6-e7d4-4f50-93b9-a0ec7a91d66c`
3. Build URL parameter → `options=databaseid%3D88b921e6-e7d4-4f50-93b9-a0ec7a91d66c`

**Final DATABASE_URL:**
```
SCW_ACCESS_KEY:URL_ENCODED_SECRET@88b921e6-e7d4-4f50-93b9-a0ec7a91d66c.pg.sdb.fr-par.scw.cloud:5432/rdb?options=databaseid%3D88b921e6-e7d4-4f50-93b9-a0ec7a91d66c&sslmode=require
```

After processing in `settings.py`:
```
postgresql+asyncpg://SCW_ACCESS_KEY:URL_ENCODED_SECRET@88b921e6-e7d4-4f50-93b9-a0ec7a91d66c.pg.sdb.fr-par.scw.cloud:5432/rdb?options=databaseid%3D88b921e6-e7d4-4f50-93b9-a0ec7a91d66c
```

### Compatibility

**asyncpg (Runtime Connections):**
- ✅ Supports `options` parameter
- ✅ Works with TLS SNI

**psycopg2 (Alembic Migrations):**
- ✅ Should support `options` parameter (standard libpq parameter)
- ⚠️ To be verified during deployment

**Settings.py Processing:**
- ✅ Regex strips `sslmode` parameter correctly (Case 3: `&sslmode=X`)
- ✅ Preserves `options=databaseid` parameter
- ✅ Adds `postgresql+asyncpg://` scheme for asyncpg
- ✅ SSL auto-detection recognizes "scaleway" pattern

## Testing Plan

### Pre-Deployment

1. **Terraform Validate:**
   ```bash
   cd infra
   terraform validate
   ```

2. **Terraform Plan:**
   ```bash
   terraform plan
   ```
   - Verify DATABASE_URL format in plan output
   - Check database_id output value

### Post-Deployment

1. **Monitor Backend Container Logs:**
   - Look for: `"Database SSL required - configuring SSL context"`
   - Look for: `"Database engine created successfully"`
   - Look for: `"Database migrations completed successfully"`

2. **Verify API Endpoint:**
   ```bash
   curl https://api.gift-genie.eu/health
   ```

3. **Check Terraform Outputs:**
   ```bash
   terraform output db_database_id
   terraform output db_endpoint
   ```

## Success Criteria

- ✅ Backend container starts without database connection errors
- ✅ Alembic migrations complete successfully
- ✅ API health check returns 200 OK
- ✅ No "Database hostname wasn't sent to server" errors
- ✅ Authentication endpoints work correctly

## Rollback Plan

If deployment fails:

1. **Quick Fix via Scaleway Console:**
   - Manually update DATABASE_URL environment variable
   - Add missing parameter manually

2. **Git Revert:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Terraform Revert:**
   ```bash
   cd infra
   terraform apply -auto-approve
   ```

## References

- **Scaleway Documentation:** https://www.scaleway.com/en/docs/faq/serverless-sql-databases/
- **Error Message:** Database hostname wasn't sent to server (TLS SNI requirement)
- **PostgreSQL libpq options:** https://www.postgresql.org/docs/current/libpq-connect.html

## Next Steps

1. Review this implementation
2. Run `terraform validate` and `terraform plan`
3. Merge PR and deploy via CI/CD
4. Monitor deployment logs
5. Verify API functionality
6. Document resolution

---

**Implementation Date:** December 7, 2025
**Branch:** `fix/scaleway-sdb-database-id`
**Status:** Ready for Review
