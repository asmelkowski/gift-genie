# Backend DNS Configuration Implementation Plan

## Problem Statement

Currently, the Gift Genie application has DNS configuration only for the frontend (`www.gift-genie.eu`), but the backend API is accessed via Scaleway's auto-generated domain (e.g., `https://{container-id}.functions.fnc.fr-par.scw.cloud`). Additionally, there's a trailing dot (`.`) in DNS target configurations that is redundant and potentially problematic.

## Objectives

1. Add DNS CNAME record for backend API subdomain (`api.gift-genie.eu`)
2. Remove unnecessary trailing dots from DNS target configurations
3. Configure Scaleway custom domain for backend container
4. Update frontend to use custom API domain
5. Update backend CORS to allow custom frontend domain
6. Ensure SSL certificates are properly configured

## Current State Analysis

### DNS Configuration (`infra/dns.tf`)
- ✅ Frontend CNAME: `www.gift-genie.eu` → Scaleway frontend container
- ✅ Root redirect: `gift-genie.eu` → `www.gift-genie.eu`
- ❌ Backend CNAME: Missing
- ⚠️ Trailing dots: Unnecessary in OVH Terraform provider

### Backend Configuration (`infra/compute.tf`)
- Backend container uses auto-generated Scaleway domain
- CORS configured for custom domain: `https://gift-genie.eu`, `https://www.gift-genie.eu`
- No custom domain configuration for backend container

### Frontend Configuration
- `VITE_API_URL`: Currently points to `https://${scaleway_container.backend.domain_name}` (Scaleway auto-generated)
- Should point to: `https://api.gift-genie.eu`

## Technical Approach

### 1. DNS Configuration Updates

**File: `infra/dns.tf`**

**Changes:**
- Add backend CNAME record pointing to Scaleway backend container
- Remove trailing dots from frontend CNAME target
- Keep subdomain configuration clean and consistent

**Rationale:**
- OVH Terraform provider handles FQDN formatting internally
- Trailing dots are DNS zone file convention, not needed in Terraform providers
- Consistent formatting improves maintainability

### 2. Scaleway Backend Custom Domain

**File: `infra/compute.tf`**

**Changes:**
- Add `scaleway_container_domain` resource for backend
- Configure hostname as `api.gift-genie.eu`
- Update frontend environment variables to use custom API domain

**Rationale:**
- Scaleway requires explicit custom domain registration for containers
- Provides automatic SSL certificate management
- Enables DNS CNAME to point to backend container

### 3. CORS Configuration

**File: `infra/compute.tf`**

**Changes:**
- Backend CORS already includes `https://www.gift-genie.eu`
- No changes needed (already correctly configured)

**Verification:**
- Ensure `settings.py` CORS parser handles comma-separated origins
- Current configuration: ✅ Already correct

### 4. Frontend API Configuration

**File: `infra/compute.tf`**

**Changes:**
- Update `VITE_API_URL` from Scaleway domain to `https://api.gift-genie.eu`
- Update `BACKEND_URL` from Scaleway domain to `https://api.gift-genie.eu`

**File: `frontend/src/lib/api.ts`**

**Verification needed:**
- Current code reads `VITE_API_BASE_URL` or `VITE_API_URL`
- Ensure compatibility with new domain

### 5. CI/CD Pipeline

**File: `.github/workflows/deploy.yml`**

**Changes:**
- Build frontend with `VITE_API_URL=https://api.gift-genie.eu`
- Update backend URL output usage

**Considerations:**
- Frontend build needs API URL at build time
- Deployment order: Backend → DNS → Frontend
- DNS propagation time: ~5 minutes (TTL=300)

## Implementation Steps

### Phase 1: Update DNS Configuration ✅
1. Update `infra/dns.tf`:
   - Remove trailing dot from frontend CNAME target
   - Add backend CNAME record for `api` subdomain
   - Ensure consistent formatting

### Phase 2: Configure Backend Custom Domain ✅
1. Update `infra/compute.tf`:
   - Add `scaleway_container_domain` resource for backend
   - Set hostname to `api.gift-genie.eu`

### Phase 3: Update Frontend API URL ✅
1. Update `infra/compute.tf`:
   - Change `VITE_API_URL` to `https://api.gift-genie.eu`
   - Change `BACKEND_URL` to `https://api.gift-genie.eu`

### Phase 4: Update CI/CD Pipeline ✅
1. Update `.github/workflows/deploy.yml`:
   - Update frontend build to use custom API domain
   - Ensure proper deployment order

### Phase 5: Testing & Verification 🧪
1. Verify DNS records are created correctly
2. Test API accessibility at `https://api.gift-genie.eu`
3. Verify SSL certificate is valid
4. Test CORS from `https://www.gift-genie.eu`
5. Verify frontend can communicate with backend
6. Check DNS propagation status

## Risk Assessment

### Low Risk ✅
- **DNS Changes**: OVH provider manages records automatically
- **Trailing Dot Removal**: Provider handles formatting correctly
- **CORS Configuration**: Already correctly configured

### Medium Risk ⚠️
- **DNS Propagation**: 5-minute TTL, but propagation may vary
- **SSL Certificate**: Scaleway auto-provisioning usually works, but can take time
- **Deployment Order**: Must deploy backend before frontend build

### Mitigation Strategies
1. **DNS Propagation**:
   - Keep Scaleway auto-generated URL as fallback during transition
   - Monitor DNS propagation with `dig` or online tools
   - Low TTL (300s) ensures quick updates

2. **SSL Certificate Issues**:
   - Scaleway automatically provisions Let's Encrypt certificates
   - Verify domain ownership via DNS
   - May take 5-10 minutes after DNS propagation

3. **Deployment Coordination**:
   - CI/CD pipeline already deploys backend first
   - Frontend build uses backend URL from Terraform output
   - Minimal risk of misconfiguration

## Testing Strategy

### Local Testing (Development)
- No changes needed - uses `localhost:8000`

### Staging/Production Testing
1. **DNS Verification**:
   ```bash
   dig api.gift-genie.eu CNAME
   dig www.gift-genie.eu CNAME
   ```

2. **SSL Certificate Check**:
   ```bash
   curl -v https://api.gift-genie.eu/health
   openssl s_client -connect api.gift-genie.eu:443 -servername api.gift-genie.eu
   ```

3. **CORS Testing**:
   ```bash
   curl -H "Origin: https://www.gift-genie.eu" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        https://api.gift-genie.eu/api/v1/auth/login
   ```

4. **End-to-End Testing**:
   - Access `https://www.gift-genie.eu`
   - Attempt login
   - Verify API requests go to `api.gift-genie.eu`
   - Check browser console for CORS errors

## Rollout Approach

### Deployment Sequence
1. **Terraform Apply** (automated via CI/CD):
   - Update DNS records
   - Configure backend custom domain
   - Deploy backend with new configuration
   - Build and deploy frontend with new API URL

2. **DNS Propagation Wait**:
   - Monitor DNS propagation (5-10 minutes)
   - Scaleway provisions SSL certificate automatically

3. **Verification**:
   - Check DNS records
   - Verify SSL certificate
   - Test API endpoint
   - Test frontend-backend communication

### Rollback Plan
If issues occur:
1. **Quick Fix**: Update frontend environment variable to use Scaleway domain
2. **DNS Revert**: Remove backend CNAME if causing issues
3. **Full Revert**: Revert Terraform changes and redeploy

**Note**: Rollback should not be necessary as Scaleway domains remain accessible even with custom domain configured.

## Success Criteria

- ✅ DNS CNAME record for `api.gift-genie.eu` points to backend container
- ✅ No trailing dots in DNS target configurations
- ✅ Backend accessible at `https://api.gift-genie.eu`
- ✅ Valid SSL certificate for `api.gift-genie.eu`
- ✅ Frontend successfully communicates with backend via custom domain
- ✅ CORS properly configured and working
- ✅ No console errors in browser
- ✅ All API requests use `api.gift-genie.eu` domain

## Benefits

1. **Professional URL Structure**:
   - Frontend: `https://www.gift-genie.eu`
   - API: `https://api.gift-genie.eu`

2. **Improved Security**:
   - Custom domain with managed SSL certificates
   - Clear separation between frontend and API

3. **Better Maintainability**:
   - Consistent DNS configuration
   - Easier to understand and debug
   - Infrastructure independence (can migrate without URL changes)

4. **User Experience**:
   - Branded API endpoint
   - No confusing Scaleway domain in browser tools
   - Professional appearance

## Open Questions

None - all requirements are clear and approach is straightforward.

## Estimated Complexity

**Overall: Low to Medium**

- **DNS Changes**: Low complexity (straightforward Terraform resources)
- **Backend Custom Domain**: Low complexity (single Terraform resource)
- **Frontend Updates**: Low complexity (environment variable change)
- **Testing**: Medium complexity (requires DNS propagation wait and verification)
- **Rollout**: Low complexity (automated via CI/CD)

**Estimated Time**:
- Implementation: 30-45 minutes
- Testing & Verification: 15-30 minutes (including DNS propagation)
- **Total: ~1 hour**

## Dependencies

- ✅ OVH DNS provider configured
- ✅ Scaleway custom domain support
- ✅ SSL certificate auto-provisioning
- ✅ CI/CD pipeline in place
- ✅ CORS configuration already correct

## Next Steps

1. Review and approve this plan
2. Implement Phase 1: Update DNS configuration
3. Implement Phase 2: Configure backend custom domain
4. Implement Phase 3: Update frontend API URL
5. Implement Phase 4: Update CI/CD pipeline
6. Execute deployment via CI/CD
7. Monitor and verify deployment
8. Document completion

---

**Plan Status**: Ready for Implementation ✅
**Approval Required**: Yes
**Breaking Changes**: No (Scaleway domains remain accessible)

---

## Implementation Status: ✅ COMPLETED

**Completion Date**: December 2, 2025
**Commit**: `90046f2` - feat(infra): add custom domain support for backend API at api.gift-genie.eu

### Changes Merged to Main:

#### 1. DNS Configuration (`infra/dns.tf`)
✅ Removed trailing dot from frontend CNAME target (line 9)
✅ Added backend CNAME record for `api` subdomain (lines 12-20)

#### 2. Scaleway Backend Custom Domain (`infra/compute.tf`)
✅ Added `scaleway_container_domain` resource for backend (lines 64-68)
✅ Updated frontend environment variables to use custom API domain (lines 53-54)

#### 3. CI/CD Pipeline (`.github/workflows/deploy.yml`)
✅ Updated frontend build to use `https://api.gift-genie.eu`

### Files Modified:
- `.ai/backend-dns-implementation-plan.md` (new file, 294 additions)
- `.github/workflows/deploy.yml` (2 changes)
- `infra/compute.tf` (10 changes)
- `infra/dns.tf` (12 changes)

### Next Actions Required:

1. **Monitor CI/CD Deployment**:
   - GitHub Actions will automatically deploy these changes
   - Watch for successful deployment to Scaleway
   - Typical deployment time: 10-15 minutes

2. **DNS Propagation** (after deployment):
   - Wait 5-10 minutes for DNS records to propagate
   - Verify with: `dig api.gift-genie.eu CNAME`
   - Expected result: Points to Scaleway backend container domain

3. **SSL Certificate Provisioning**:
   - Scaleway automatically provisions Let's Encrypt certificates
   - May take 5-10 minutes after DNS propagation
   - Verify with: `curl -v https://api.gift-genie.eu/health`

4. **End-to-End Verification**:
   - Access `https://www.gift-genie.eu`
   - Open browser DevTools → Network tab
   - Verify API requests go to `https://api.gift-genie.eu`
   - Test authentication flow (login/register)
   - Check for CORS errors in console

5. **Post-Deployment Checks**:
   ```bash
   # Check DNS
   dig api.gift-genie.eu CNAME
   dig www.gift-genie.eu CNAME

   # Check SSL certificate
   curl -v https://api.gift-genie.eu/health
   openssl s_client -connect api.gift-genie.eu:443 -servername api.gift-genie.eu

   # Check CORS
   curl -H "Origin: https://www.gift-genie.eu" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        https://api.gift-genie.eu/api/v1/auth/login
   ```

### Success Metrics:
- ✅ Code changes merged to main branch
- ⏳ CI/CD deployment in progress
- ⏳ DNS records created (pending deployment)
- ⏳ Backend accessible at `https://api.gift-genie.eu` (pending deployment)
- ⏳ SSL certificate provisioned (pending deployment)
- ⏳ Frontend communicates with backend via custom domain (pending deployment)

---

**Implementation Phase**: ✅ COMPLETE
**Deployment Phase**: ⏳ IN PROGRESS
**Verification Phase**: ⏳ PENDING

---

## 🐛 DNS Configuration Bug Discovery & Fix

**Discovery Date**: December 3, 2025 at 10:07 CET
**Issue**: DNS CNAME records created with incorrect target format

### Problem Analysis

After deployment verification with `dig`, discovered that DNS CNAME records had **extra domain suffix appended**:

**Actual DNS Records (Incorrect):**
```
api.gift-genie.eu → giftgeniensprodamhlzxpa-gift-genie-backend.functions.fnc.fr-par.scw.cloud.gift-genie.eu.
www.gift-genie.eu → giftgeniensprodamhlzxpa-gift-genie-frontend.functions.fnc.fr-par.scw.cloud.gift-genie.eu.
                                                                                                  ^^^^^^^^^^^^^^^
                                                                                                  WRONG!
```

**Should be:**
```
api.gift-genie.eu → giftgeniensprodamhlzxpa-gift-genie-backend.functions.fnc.fr-par.scw.cloud.
www.gift-genie.eu → giftgeniensprodamhlzxpa-gift-genie-frontend.functions.fnc.fr-par.scw.cloud.
```

### Root Cause

The OVH Terraform provider **follows DNS zone file conventions**:
- **Without trailing dot**: Treated as relative name → Provider appends zone name
- **With trailing dot**: Treated as FQDN → Provider uses as-is

**We were initially correct** about needing the trailing dot, but removed it based on incorrect assumption. The OVH provider DOES require it for CNAME targets that point outside the zone.

### Fix Applied

**File: `infra/dns.tf`**

**Lines 9 and 19 - Add trailing dot to CNAME targets:**
```diff
- target    = scaleway_container.frontend.domain_name
+ target    = "${scaleway_container.frontend.domain_name}."

- target    = scaleway_container.backend.domain_name
+ target    = "${scaleway_container.backend.domain_name}."
```

### Lesson Learned

**DNS Zone File Convention in Terraform Providers:**
- OVH provider follows standard DNS zone file format
- Trailing dot indicates FQDN (Fully Qualified Domain Name)
- Without trailing dot, zone name is appended
- This is NOT redundant - it's required for external CNAMEs

**Documentation:**
- OVH provider documentation should be checked for CNAME formatting requirements
- Different providers may handle this differently (e.g., AWS Route53 has `records` format)
- Always verify DNS records after deployment with `dig` or similar tools

### Impact

**Current Status:**
- ❌ DNS records exist but point to non-existent domains
- ❌ API not accessible at `api.gift-genie.eu`
- ❌ Frontend may have connectivity issues
- ✅ Direct Scaleway URLs still work as fallback

**After Fix:**
- ✅ DNS will correctly resolve to Scaleway containers
- ✅ API will be accessible at `https://api.gift-genie.eu`
- ✅ Frontend will work correctly
- ✅ SSL certificates will validate properly

### Next Steps

1. Commit the DNS configuration fix
2. Deploy via CI/CD or manual Terraform apply
3. Wait for DNS propagation (~5 minutes with TTL=300)
4. Verify with `dig api.gift-genie.eu CNAME`
5. Test API endpoint `https://api.gift-genie.eu/health`
6. Verify frontend integration

---

**Fix Status**: ✅ Code updated, ready to deploy
