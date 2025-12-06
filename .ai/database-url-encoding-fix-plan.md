# Database Credentials Fix - Implementation Complete ✅

## Problem Solved

**Issue**: Backend deployment failing with `fe_sendauth: no password supplied`

**Root Cause**: Scaleway SDB `endpoint` attribute doesn't include database credentials - they must be configured manually via Terraform variables.

**Solution**: Configure database credentials as Terraform variables and construct the DATABASE_URL properly.

---

## ✅ Code Changes Completed

All necessary code changes have been implemented and are ready to commit.

### 1. Added Database Credential Variables
**File**: `infra/variables.tf`

Added 5 new variables:
- `db_user` - Database username (sensitive)
- `db_password` - Database password (sensitive)
- `db_host` - Database hostname (sensitive)
- `db_port` - Database port (default: "5432")
- `db_name` - Database name (sensitive)

### 2. Updated DATABASE_URL Construction
**File**: `infra/compute.tf`

**Before**:
```terraform
"DATABASE_URL" = replace(scaleway_sdb_sql_database.main.endpoint, "postgres://", "")
```

**After**:
```terraform
"DATABASE_URL" = "${var.db_user}:${urlencode(var.db_password)}@${var.db_host}:${var.db_port}/${var.db_name}?sslmode=require"
```

Key improvements:
- Uses individual credential variables instead of assuming embedded credentials
- Applies `urlencode()` to password for special character handling
- Includes `?sslmode=require` for SSL encryption
- Properly documented comments

### 3. Updated Database Resource Comments
**File**: `infra/db.tf`

- Added credential management documentation
- Added description to `db_endpoint` output clarifying it's hostname-only

### 4. Added GitHub Actions Environment Variables
**File**: `.github/workflows/deploy.yml`

Added 5 new TF_VAR mappings:
- `TF_VAR_db_user: ${{ secrets.DB_USER }}`
- `TF_VAR_db_password: ${{ secrets.DB_PASSWORD }}`
- `TF_VAR_db_host: ${{ secrets.DB_HOST }}`
- `TF_VAR_db_port: ${{ secrets.DB_PORT }}`
- `TF_VAR_db_name: ${{ secrets.DB_NAME }}`

---

## ⚠️ REQUIRED: Add GitHub Secrets

**BEFORE DEPLOYING**, you must add 5 secrets to your GitHub repository.

See detailed instructions in: **`.ai/GITHUB_SECRETS_SETUP.md`**

### Quick Reference:

1. Go to: **GitHub Repo → Settings → Secrets and variables → Actions**
2. Click **New repository secret** for each:

| Secret Name | Value Source | Example |
|------------|--------------|---------|
| `DB_USER` | Scaleway PGUSER | `gift_genie_admin` |
| `DB_PASSWORD` | Scaleway PGPASSWORD | (sensitive) |
| `DB_HOST` | Scaleway PGHOST | `88b921e6-e7d4-4f50-93b9-a0ec7a91d66c.pg.sdb.fr-par.scw.cloud` |
| `DB_PORT` | Scaleway PGPORT | `5432` |
| `DB_NAME` | Scaleway PGDATABASE | `gift_genie_db` |

---

## 📋 Deployment Steps

### Step 1: Add GitHub Secrets
Follow the guide in `.ai/GITHUB_SECRETS_SETUP.md` to add all 5 database secrets.

### Step 2: Review Changes
```bash
cd /home/adam/dev/gift-genie
git status
git diff
```

### Step 3: Commit and Push
```bash
git add infra/variables.tf infra/compute.tf infra/db.tf .github/workflows/deploy.yml .ai/
git commit -m "fix(infra): configure Scaleway SDB credentials via Terraform variables"
git push origin main
```

### Step 4: Monitor Deployment
- Watch GitHub Actions workflow: https://github.com/yourusername/gift-genie/actions
- Check for successful database migration in logs
- Verify backend container starts successfully

### Step 5: Verify
```bash
# Test backend API
curl https://api.gift-genie.eu/health

# Should return successful response without database errors
```

---

## 🔒 Security Notes

✅ **URL Encoding**: `urlencode()` safely handles special characters in password

✅ **Sensitive Variables**: All credentials marked `sensitive = true` in Terraform

✅ **GitHub Secrets**: Encrypted storage, masked in logs

✅ **SSL Encryption**: `sslmode=require` enforces encrypted database connections

✅ **No Hardcoding**: Credentials never appear in code or git history

---

## 📊 Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `infra/variables.tf` | +30 | Added 5 credential variables |
| `infra/compute.tf` | ~10 | Fixed DATABASE_URL construction |
| `infra/db.tf` | +3 | Updated documentation |
| `.github/workflows/deploy.yml` | +5 | Added secret mappings |
| `.ai/GITHUB_SECRETS_SETUP.md` | New | Setup instructions |

---

## ✅ Expected Outcome

After successful deployment:

1. ✅ Backend container starts without authentication errors
2. ✅ Database migrations complete successfully
3. ✅ Application connects to Scaleway SDB with proper credentials
4. ✅ API endpoints respond correctly at https://api.gift-genie.eu
5. ✅ Frontend can communicate with backend

---

## 🆘 Troubleshooting

### If deployment still fails:

1. **Verify GitHub Secrets**:
   - All 5 secrets present and correctly named
   - No typos in secret values
   - PGHOST includes full domain name

2. **Check Container Logs**:
   - Go to Scaleway Console → Containers → gift-genie-backend
   - View logs for specific error messages

3. **Verify Credentials**:
   - Test connection locally with the same credentials
   - Ensure password doesn't contain characters that need special handling

4. **Common Issues**:
   - Secret name typo (e.g., `DB_PASSWORD` vs `DATABASE_PASSWORD`)
   - Missing `?sslmode=require` parameter
   - Incorrect PGHOST format
   - Wrong database name

---

## 📝 Summary

**What was wrong**: Terraform assumed SDB endpoint included credentials - it doesn't

**What was fixed**: Manual credential configuration via Terraform variables

**What you need to do**: Add 5 GitHub secrets before deploying

**Time to deploy**: ~5-10 minutes after secrets are added

**Estimated total time**: ~15-20 minutes (including secret setup)
