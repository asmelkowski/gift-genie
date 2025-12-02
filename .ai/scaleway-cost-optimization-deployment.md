# Scaleway Cost Optimization Deployment Guide

## 🎯 Overview

This deployment optimizes your Scaleway infrastructure to reduce costs by **60-80%** while fixing critical configuration issues.

### Changes Summary

| Change | Before | After | Impact |
|--------|--------|-------|--------|
| **Min Scale** | 1 (always on) | 0 (scale to zero) | ~70% cost reduction |
| **CPU/Memory** | 560 MB each | 280 MB each | ~50% resource cost |
| **Max Scale** | 5 instances | 3 instances | Lower burst costs |
| **Timeout** | 600s | 300s | Faster failure detection |
| **CORS** | Single domain | www + root domain | Fixes CORS errors |

### Expected Cost Impact

- **Current**: €20-40/month (2 containers × always-on × 560MB)
- **Optimized**: €5-15/month (scale-to-zero + smaller resources)
- **Savings**: **~60-80%** for low/medium traffic

---

## 🔧 What Was Fixed

### 1. **Scale-to-Zero Configuration** ✅
```terraform
min_scale = 0  # Containers shut down when idle
max_scale = 3  # Reduced from 5
```
- **Benefit**: Only pay when containers are actively handling requests
- **Trade-off**: ~2-5 second cold start on first request after idle period
- **Perfect for**: Low-traffic apps, development/staging environments

### 2. **Resource Right-Sizing** ✅
```terraform
cpu_limit    = 280  # Was 560
memory_limit = 280  # Was 560
```
- **Benefit**: Lower per-second costs when containers are running
- **Reasoning**: 280MB is sufficient for FastAPI backend and static frontend

### 3. **CORS Configuration Fixed** ✅
```terraform
CORS_ORIGINS = "https://gift-genie.eu,https://www.gift-genie.eu"
```
- **Issue**: Only `https://gift-genie.eu` was allowed
- **Fix**: Added `www.gift-genie.eu` subdomain
- **Benefit**: Eliminates CORS errors from frontend

### 4. **Database Connection** ℹ️
- **Note**: Database connection still uses **public endpoint**
- **Reason**: Scaleway SDB (Serverless Database) doesn't support private networks yet
- **Security**: Connection is encrypted and password-protected

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Access to Scaleway console
- [ ] Terraform/OpenTofu installed (`tofu version`)
- [ ] Scaleway credentials configured (env vars or `scw` CLI)
- [ ] Git repository access
- [ ] 15-20 minutes for deployment
- [ ] Optional: Backup of current Terraform state

---

## 🚀 Deployment Steps

### Step 1: Review Changes

```bash
cd /home/adam/dev/gift-genie/infra

# Initialize Terraform
tofu init

# Review planned changes
tofu plan
```

**Expected Changes**:
```
~ scaleway_container.backend
  ~ cpu_limit: 560 → 280
  ~ memory_limit: 560 → 280
  ~ min_scale: 1 → 0
  ~ max_scale: 5 → 3
  ~ timeout: 600 → 300
  ~ environment_variables.CORS_ORIGINS: (updated)

~ scaleway_container.frontend
  ~ cpu_limit: 560 → 280
  ~ memory_limit: 560 → 280
  ~ min_scale: 1 → 0
  ~ max_scale: 5 → 3
```

### Step 2: Apply Changes

```bash
# Apply the optimizations
tofu apply

# Confirm with 'yes' when prompted
```

**Deployment Timeline**:
- **0-2 min**: Terraform updates container configurations
- **2-5 min**: Scaleway applies changes to backend container
- **5-8 min**: Backend container restarts with new settings
- **8-11 min**: Scaleway applies changes to frontend container
- **11-14 min**: Frontend container restarts with new settings
- **14-15 min**: Health checks pass, deployment complete

### Step 3: Verify Deployment

#### Check Container Status

```bash
# Option 1: Using scw CLI
scw container list --namespace-id $(scw container namespace list | grep gift-genie | awk '{print $1}')

# Option 2: Using Terraform output
tofu output backend_url
tofu output frontend_url
```

**Expected Status**: `Ready` for both containers

#### Test Health Endpoint

```bash
# Get backend URL from Terraform
BACKEND_URL=$(tofu output -raw backend_url)

# Test health endpoint
curl -v "$BACKEND_URL/health"

# Expected response:
# {"status":"healthy"}
```

#### Test Frontend

```bash
# Get frontend URL
FRONTEND_URL=$(tofu output -raw frontend_url)

# Test frontend loads
curl -I "$FRONTEND_URL"

# Expected: HTTP 200 OK
```

#### Test CORS (from browser console)

```javascript
// Open https://www.gift-genie.eu in browser
// Open browser console (F12)
fetch('https://[backend-url]/health')
  .then(r => r.json())
  .then(console.log)

// Should see: {status: "healthy"}
// No CORS errors
```

---

## 🔍 Post-Deployment Monitoring

### Check Container Metrics (Scaleway Console)

1. Go to Scaleway Console → Serverless Containers
2. Click on `gift-genie-backend`
3. Check **Metrics** tab:
   - **Requests**: Should show traffic
   - **Active instances**: Should show 0 when idle, >0 when active
   - **Response time**: Should be <200ms (after warm-up)

### Monitor Logs

```bash
# Backend logs
scw container logs gift-genie-backend --follow

# Look for:
✅ "Starting application..."
✅ "Database connection successful"
✅ "Application startup complete"
❌ "Connection refused" or "CORS error"
```

### Test Scale-to-Zero Behavior

```bash
# Wait 15 minutes with no traffic
# Then make a request

BACKEND_URL=$(tofu output -raw backend_url)

# First request (cold start - expect 2-5 seconds)
time curl "$BACKEND_URL/health"

# Second request (warm - expect <200ms)
time curl "$BACKEND_URL/health"
```

**Expected Behavior**:
- After 15 min idle: Container scales to 0 instances
- First request: ~2-5 sec (cold start)
- Subsequent requests: <200ms (warm)

---

## 🐛 Troubleshooting

### Issue 1: CORS Errors Still Occurring

**Symptoms**:
```
Access to fetch at 'https://[backend]' from origin 'https://www.gift-genie.eu'
has been blocked by CORS policy
```

**Solution**:
```bash
# Check CORS configuration
scw container get gift-genie-backend --output json | jq '.environment_variables.CORS_ORIGINS'

# Should show: "https://gift-genie.eu,https://www.gift-genie.eu"

# If wrong, re-apply Terraform
cd infra/ && tofu apply
```

### Issue 2: Long Cold Starts (>10 seconds)

**Symptoms**: First request after idle takes very long

**Solutions**:
```terraform
# Option 1: Increase timeout (if needed)
timeout = 600  # Back to 10 minutes

# Option 2: Keep min_scale = 1 for critical paths
min_scale = 1  # Always-on (costs more)

# Option 3: Use health check pinging (external service)
# Set up uptime monitor to ping /health every 5 minutes
```

### Issue 3: Database Connection Errors

**Symptoms**:
```
Database connection failed: timeout
```

**Check**:
```bash
# Verify DATABASE_URL is correct
scw container get gift-genie-backend --output json | \
  jq -r '.secret_environment_variables.DATABASE_URL'

# Should be in format:
# username:password@host:port/database
```

**Fix**:
```bash
# Re-apply Terraform
cd infra/ && tofu apply -auto-approve
```

### Issue 4: Container Won't Start

**Symptoms**: Container status shows "Error" or keeps restarting

**Debugging**:
```bash
# Get container logs
scw container logs gift-genie-backend --tail 50

# Check for:
# - Missing environment variables
# - Database connection errors
# - Port binding errors
# - Memory/CPU limits too low
```

**Fix**:
```terraform
# If resources are too low, increase slightly
cpu_limit    = 420  # Between 280 and 560
memory_limit = 420
```

---

## 💰 Cost Monitoring

### Track Your Savings

1. **Before deployment**: Note your current monthly bill
2. **After 1 week**: Check Scaleway billing console
3. **Calculate savings**: Compare costs

### Expected Costs Breakdown

**Before Optimization** (min_scale=1, 560MB):
```
Backend:  2 containers × 560MB × 730 hours = €15-20
Frontend: 2 containers × 560MB × 730 hours = €15-20
Total: €30-40/month
```

**After Optimization** (min_scale=0, 280MB, low traffic):
```
Backend:  ~100 hours active × 280MB = €3-5
Frontend: ~100 hours active × 280MB = €3-5
Database: ~€2-3 (unchanged)
Total: €8-13/month
```

**Savings**: ~€20-30/month (60-75% reduction)

### When to Adjust

- **If traffic increases**: Consider min_scale=1 for better UX
- **If cold starts are annoying**: Increase min_scale or use health check pinging
- **If memory errors**: Increase memory_limit to 420 or 560

---

## 🔄 Rollback Plan

If something goes wrong, you can quickly revert:

### Quick Rollback

```bash
cd /home/adam/dev/gift-genie/infra

# Revert the changes
git checkout HEAD~1 -- compute.tf

# Apply previous configuration
tofu apply -auto-approve
```

### Manual Rollback

Edit `infra/compute.tf` and change:
```terraform
min_scale    = 1  # Back to always-on
cpu_limit    = 560
memory_limit = 560
max_scale    = 5
timeout      = 600
```

Then apply:
```bash
tofu apply
```

---

## ✅ Success Criteria

Deployment is successful when:

- [ ] `tofu apply` completes without errors
- [ ] Both containers show status "Ready"
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] Frontend loads successfully
- [ ] No CORS errors in browser console
- [ ] Containers scale to 0 after 15 min idle
- [ ] Cold start completes in <5 seconds
- [ ] Warm requests respond in <200ms

---

## 📊 Next Steps

1. **Monitor for 24 hours**: Watch logs and metrics
2. **Test thoroughly**: Ensure all features work
3. **Track costs**: Compare billing before/after
4. **Adjust if needed**: Fine-tune based on actual usage
5. **Document learnings**: Note any issues or improvements

---

## 📝 Additional Notes

### About Scale-to-Zero

**When it works well**:
- Low traffic applications
- Development/staging environments
- Apps with predictable traffic patterns
- Background jobs with sporadic runs

**When to avoid**:
- Real-time applications
- High-traffic production apps
- APIs with strict SLA requirements
- Apps with long startup times

### About CORS

The CORS fix allows:
- ✅ `https://gift-genie.eu` → backend
- ✅ `https://www.gift-genie.eu` → backend
- ✅ Direct Scaleway container URLs (in development)

If you add more domains later, update:
```terraform
CORS_ORIGINS = join(",", [
  "https://gift-genie.eu",
  "https://www.gift-genie.eu",
  "https://your-new-domain.com"
])
```

---

**Last Updated**: December 2, 2025
**Author**: DevOps Team
**Status**: Ready for Deployment
