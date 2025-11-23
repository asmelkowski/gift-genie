# Serverless SQL Database URL Fix

## Problem
Application crashes on Scaleway deployment with:
```
ValueError: invalid literal for int() with base 10: ''
```

## Root Cause
**Scaleway Serverless SQL Database `.endpoint` attribute returns ONLY the hostname, NOT `hostname:port`**

When constructing the DATABASE_URL in Terraform like this:
```hcl
"DATABASE_URL" = "postgresql+asyncpg://${user}:${pass}@${endpoint}/${db}?sslmode=require"
```

If `endpoint` = `abc123.sdb.fr-par.scw.cloud`, the resulting URL becomes:
```
postgresql+asyncpg://user:pass@abc123.sdb.fr-par.scw.cloud/dbname?sslmode=require
```

SQLAlchemy's URL parser then tries to parse this, and when it encounters certain parsing paths, it can end up with an empty port string, causing the `int('')` error.

## Solution
**Explicitly append the PostgreSQL default port (5432) to the endpoint:**

```hcl
"DATABASE_URL" = "postgresql+asyncpg://${user}:${pass}@${endpoint}:5432/${db}?sslmode=require"
```

This ensures the URL is:
```
postgresql+asyncpg://user:pass@abc123.sdb.fr-par.scw.cloud:5432/dbname?sslmode=require
```

## Changes Made

### File: `infra/compute.tf`
```hcl
secret_environment_variables = {
  # Before (broken):
  # "DATABASE_URL" = "postgresql+asyncpg://${var.default_username}:${var.db_password}@${scaleway_sdb_sql_database.main.endpoint}/${scaleway_sdb_sql_database.main.name}?sslmode=require"

  # After (fixed):
  "DATABASE_URL" = "postgresql+asyncpg://${var.default_username}:${var.db_password}@${scaleway_sdb_sql_database.main.endpoint}:5432/${scaleway_sdb_sql_database.main.name}?sslmode=require"
}
```

## Why This Works
- PostgreSQL's default port is 5432
- Scaleway Serverless SQL Database uses the standard PostgreSQL port
- Explicitly including `:5432` in the URL ensures SQLAlchemy can parse it correctly
- No ambiguity in the connection string format

## Deployment
Merge branch `fix/database-url-construction` to `main` and deploy.

## Verification
After deployment, check:
1. ✅ No `ValueError` in container logs
2. ✅ Application starts successfully
3. ✅ Database connection established

## Related
- Branch: `fix/database-url-construction`
- Commit: `7fc8a61`
- Issue: Scaleway Serverless SQL endpoint format doesn't include port number
