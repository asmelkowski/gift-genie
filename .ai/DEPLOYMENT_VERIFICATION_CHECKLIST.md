# Backend DNS Deployment Verification Checklist

## Deployment Information
- **Commit**: `90046f2` - feat(infra): add custom domain support for backend API at api.gift-genie.eu
- **Commit Date**: December 2, 2025 at 22:13 CET (21:13 UTC)
- **Time Since Deployment**: ~35 hours (should be fully deployed)

## Current Verification Status

### ❓ Unable to Verify from Local Machine
The local development machine doesn't have DNS tools (dig, nslookup, host) or GitHub CLI (gh) installed, and direct curl/web requests are failing to resolve `api.gift-genie.eu`.

## What to Verify

### 1. GitHub Actions Deployment Status
**Action Required**: Check GitHub Actions web interface

Visit: https://github.com/asmelkowski/gift-genie/actions

**Check:**
- ✅ Did the deploy workflow run after commit `90046f2`?
- ✅ Did it complete successfully?
- ✅ Check the "Full Deploy" step for any errors
- ✅ Look for Terraform apply output showing DNS resources created

**Expected Output in Logs:**
```
scaleway_container_domain.backend[0]: Creating...
ovh_domain_zone_record.backend_cname[0]: Creating...
scaleway_container_domain.backend[0]: Creation complete
ovh_domain_zone_record.backend_cname[0]: Creation complete
```

### 2. DNS Records Verification
**Action Required**: Check DNS resolution

**From any machine with DNS tools:**
```bash
# Check backend API subdomain
dig api.gift-genie.eu CNAME
# Expected: CNAME pointing to Scaleway backend container domain

# Check frontend subdomain
dig www.gift-genie.eu CNAME
# Expected: CNAME pointing to Scaleway frontend container domain

# Alternative with nslookup
nslookup api.gift-genie.eu
nslookup www.gift-genie.eu
```

**Online DNS Checker:**
- Visit: https://dnschecker.org/
- Enter: `api.gift-genie.eu`
- Type: CNAME
- Check if record exists globally

### 3. Backend API Accessibility
**Action Required**: Test API endpoint

```bash
# Test health endpoint
curl -v https://api.gift-genie.eu/health

# Expected response:
# HTTP/2 200
# {"status": "healthy"}

# Check SSL certificate
curl -v https://api.gift-genie.eu/health 2>&1 | grep "SSL certificate"
# Expected: Valid Let's Encrypt certificate
```

**Browser Test:**
- Visit: https://api.gift-genie.eu/health
- Should see JSON response with health status
- Check SSL certificate (click padlock icon)
- Should be valid and issued by Let's Encrypt

### 4. Frontend Configuration
**Action Required**: Verify frontend uses correct API URL

**Browser DevTools:**
1. Open: https://www.gift-genie.eu
2. Open DevTools (F12) → Network tab
3. Try to login or register
4. Check API requests
5. Verify they go to: `https://api.gift-genie.eu/api/v1/...`

**Expected:**
- ✅ All API requests use `api.gift-genie.eu` domain
- ✅ No CORS errors in console
- ✅ Successful authentication flow
- ❌ NO requests to Scaleway's `*.functions.fnc.fr-par.scw.cloud` domain

### 5. CORS Verification
**Action Required**: Test CORS headers

```bash
curl -H "Origin: https://www.gift-genie.eu" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://api.gift-genie.eu/api/v1/auth/login
```

**Expected Headers:**
```
Access-Control-Allow-Origin: https://www.gift-genie.eu
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: *
Access-Control-Allow-Headers: *
```

### 6. Terraform State Verification
**Action Required**: Check Terraform state (if access available)

```bash
cd infra
tofu show | grep -A 10 "scaleway_container_domain.backend"
tofu show | grep -A 10 "ovh_domain_zone_record.backend_cname"
```

**Expected:**
- Backend container domain resource exists
- Backend DNS CNAME record exists
- Both show `hostname = "api.gift-genie.eu"`

## Possible Issues and Solutions

### Issue 1: DNS Not Resolving
**Symptoms:** `api.gift-genie.eu` doesn't resolve to any IP

**Possible Causes:**
1. Deployment failed or was skipped
2. OVH DNS record creation failed
3. DNS hasn't propagated yet (unlikely after 35 hours)

**Solutions:**
1. Check GitHub Actions logs for deployment errors
2. Manually trigger deployment: Go to Actions → Deploy workflow → Run workflow
3. Check Terraform state for DNS resources
4. Verify OVH provider credentials are valid

### Issue 2: SSL Certificate Issues
**Symptoms:** HTTPS connection fails or shows certificate error

**Possible Causes:**
1. Scaleway hasn't provisioned certificate yet
2. DNS propagation incomplete
3. Custom domain not registered with Scaleway container

**Solutions:**
1. Check Scaleway console for container custom domain status
2. Wait additional time for certificate provisioning
3. Verify `scaleway_container_domain.backend` resource exists in Terraform

### Issue 3: CORS Errors
**Symptoms:** Frontend can't communicate with backend, CORS errors in console

**Possible Causes:**
1. Backend CORS not configured for custom frontend domain
2. SSL certificate issues preventing requests

**Solutions:**
1. Verify backend CORS_ORIGINS includes `https://www.gift-genie.eu`
2. Check backend logs for CORS-related errors
3. Test CORS headers with curl command above

### Issue 4: Frontend Still Using Old API URL
**Symptoms:** Frontend makes requests to Scaleway domain instead of `api.gift-genie.eu`

**Possible Causes:**
1. Frontend not rebuilt with new environment variables
2. Cached frontend version being served
3. CI/CD didn't rebuild frontend after backend deployment

**Solutions:**
1. Check GitHub Actions logs for frontend build step
2. Verify `VITE_API_URL=https://api.gift-genie.eu` in build args
3. Manually trigger redeployment
4. Clear browser cache and hard refresh (Ctrl+Shift+R)

## Quick Verification Command (if DNS tools available)

```bash
# One-liner to check everything
echo "=== DNS Check ===" && \
dig +short api.gift-genie.eu CNAME && \
echo "=== API Health ===" && \
curl -s https://api.gift-genie.eu/health | jq . && \
echo "=== Frontend Check ===" && \
curl -s https://www.gift-genie.eu | grep -o "api.gift-genie.eu" | head -1
```

## Next Steps

1. **Immediate:** Check GitHub Actions deployment status
2. **If deployment succeeded:** Verify DNS and API accessibility
3. **If deployment failed:** Review logs and re-trigger deployment
4. **Once verified:** Update this checklist with actual status
5. **Finally:** Test full end-to-end user flow

## Status Summary

Based on local verification attempts:
- ❓ **Deployment Status**: Unknown (need to check GitHub Actions)
- ❌ **DNS Resolution**: Failed from local machine (tools not available)
- ❌ **API Accessibility**: Failed from local machine (DNS not resolving)
- ❓ **Frontend Configuration**: Unknown (need browser test)
- ❓ **Overall Status**: **VERIFICATION PENDING**

**Recommendation:** Check GitHub Actions web interface first to confirm deployment succeeded, then verify DNS and API accessibility from a machine with DNS tools or using online DNS checkers.
