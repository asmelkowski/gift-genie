# CI/CD Optimization: Terraform-Only Changes

## Overview

This document describes the CI/CD pipeline optimization implemented to skip code-related jobs when pull requests only contain Terraform infrastructure changes.

## Problem Statement

Previously, all CI/CD jobs (build, lint, test, E2E) ran on every pull request, even when changes were limited to infrastructure code in `infra/`. This resulted in:
- Unnecessary 15-minute CI runs for infrastructure-only changes
- Wasted GitHub Actions minutes
- Slower feedback loops for infrastructure engineers

## Solution

Implemented conditional job execution using path filtering to detect terraform-only changes and skip irrelevant jobs.

## Implementation Details

### 1. Path Filtering Job

A new `path-filter` job runs first and detects what files changed:

```yaml
path-filter:
  name: Detect Changes
  outputs:
    terraform_only: <true if only infra/ changed>
```

**Filter Categories:**
- **infra**: `infra/**`
- **code**: `backend/**`, `frontend/**`, `.github/workflows/**`, `scripts/**`, `docker-compose*.yml`, `.dockerignore`

**Logic:**
- `terraform_only = true` when infra changed AND code did NOT change
- `terraform_only = false` for all other scenarios (including mixed changes)

### 2. Conditional Job Execution

All code-related jobs now include:
```yaml
needs: path-filter
if: needs.path-filter.outputs.terraform_only != 'true'
```

**Jobs that skip on terraform-only PRs:**
- ✅ `build-images` (all 5 Docker images)
- ✅ `lint` (backend ruff/mypy, frontend ESLint)
- ✅ `unit-test` (backend pytest, frontend vitest)
- ✅ `build-frontend-prod`
- ✅ `build-backend-prod`
- ✅ `e2e-test` (Playwright)

**Jobs that always run:**
- ✅ `terraform-plan` (has its own filtering)
- ✅ `status-comment` (always posts results)

### 3. Status Comment Updates

The PR status comment now shows different output based on change type:

**Terraform-only PR:**
```
✅ Terraform validation passed! (Code jobs skipped - infrastructure changes only)

| Job | Status |
|-----|--------|
| Terraform Plan | ✅ success |

**Note:** Code validation jobs were skipped because this PR only contains infrastructure changes.
```

**Regular PR (code changes):**
```
✅ All checks passed successfully!

| Job | Status |
|-----|--------|
| Lint | ✅ success |
| Unit Tests | ✅ success |
| E2E Tests | ✅ success |
| Terraform Plan | ⏭️ skipped |
```

## Expected Benefits

### Time Savings
- **Terraform-only PR**: ~2-3 minutes (vs 15 minutes)
- **Savings**: ~80-85% reduction
- **Average impact**: Depends on frequency of infrastructure-only PRs

### Cost Savings
- Reduced GitHub Actions minutes consumption
- Lower compute costs
- Faster feedback for infrastructure changes

## GitHub Branch Protection

The existing branch protection rules requiring all jobs should continue to work because:
- GitHub treats conditionally skipped jobs as "success" when they're skipped by workflow logic
- Jobs only skip when `terraform_only = true`, which is a valid state
- The `status-comment` job always runs and validates the overall state

**No changes needed to branch protection settings.**

## Testing Strategy

Before deploying to production, test these scenarios:

### Test Case 1: Terraform-Only PR ✅
- **Changes**: Only files in `infra/`
- **Expected**: Only `path-filter`, `terraform-plan`, `status-comment` run
- **Time**: ~2-3 minutes

### Test Case 2: Backend-Only PR ✅
- **Changes**: Only files in `backend/`
- **Expected**: All jobs run normally
- **Time**: ~15 minutes

### Test Case 3: Frontend-Only PR ✅
- **Changes**: Only files in `frontend/`
- **Expected**: All jobs run normally
- **Time**: ~15 minutes

### Test Case 4: Mixed PR (Backend + Terraform) ✅
- **Changes**: Files in both `backend/` and `infra/`
- **Expected**: All jobs run (safe default)
- **Time**: ~15 minutes

### Test Case 5: CI Config Change ✅
- **Changes**: Modify `.github/workflows/pull-request.yml`
- **Expected**: All jobs run (safety check)
- **Time**: ~15 minutes

### Test Case 6: Docker Config Change ✅
- **Changes**: Modify `docker-compose.yml`
- **Expected**: All jobs run (affects environment)
- **Time**: ~15 minutes

## Rollback Plan

If issues arise:

**Option 1 - Quick Fix:**
Remove the conditional `if` statements from jobs (keep `needs: path-filter`)

**Option 2 - Full Rollback:**
Revert the PR that introduced these changes

**Debugging:**
Check the `path-filter` job outputs in GitHub Actions logs to see what was detected

## Future Enhancements

### Phase 2: Skip Documentation-Only Changes
Skip all tests when only `*.md` files change (excluding docs in backend/frontend)

### Phase 3: Split Backend/Frontend Testing
Only run backend tests if backend changed, only frontend tests if frontend changed

### Phase 4: Test Impact Analysis
Use advanced tooling to only run tests affected by code changes

## Change Log

- **2025-11-22**: Initial implementation of terraform-only optimization
  - Added path-filter job
  - Made code jobs conditional
  - Updated status-comment to handle both scenarios

## References

- GitHub Actions: [Conditional Execution](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idif)
- Path Filter Action: [dorny/paths-filter](https://github.com/dorny/paths-filter)
- Workflow File: `.github/workflows/pull-request.yml`
