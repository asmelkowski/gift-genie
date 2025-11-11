# E2E Migration Verification Checklist

Before pushing to production, verify the following:

## ✅ Local Verification

### 1. Backend and Frontend Running
```bash
# Terminal 1: Start backend
cd backend
make run-dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Verify:
- [ ] Backend is accessible at http://localhost:8000/health
- [ ] Frontend is accessible at http://localhost:5173

### 2. Run E2E Tests Locally
```bash
cd frontend

# First run - creates auth state
npx playwright test
```

Expected results:
- [ ] Setup project runs first (creates `e2e-test-user@example.com`)
- [ ] Auth state saved to `.auth/user.json`
- [ ] All 3 test files pass:
  - [ ] `auth/login.spec.ts` (3 tests)
  - [ ] `groups/create-group.spec.ts` (2 tests)
  - [ ] `auth/logout.spec.ts` (2 tests)
- [ ] Total: ~7 tests passing

### 3. Verify Auth State Persistence
```bash
# Check auth state file exists
ls -la .auth/user.json

# Run tests again (should be faster, reuses auth)
npx playwright test
```

Expected results:
- [ ] Tests run faster on second run
- [ ] No new user registration
- [ ] All tests still pass

### 4. Test Individual Files
```bash
# Test specific files
npx playwright test auth/login.spec.ts
npx playwright test groups/create-group.spec.ts
npx playwright test auth/logout.spec.ts
```

Expected results:
- [ ] Each file can be run independently
- [ ] All tests pass
- [ ] No errors in console

### 5. Test UI Mode (Optional but Recommended)
```bash
npx playwright test --ui
```

Expected results:
- [ ] UI opens successfully
- [ ] Can run individual tests
- [ ] Can see test execution visually
- [ ] Screenshots/traces available

## ✅ Code Review Checks

### Files Created
- [ ] `frontend/e2e/setup/auth.setup.ts`
- [ ] `frontend/e2e/setup/cleanup.setup.ts`
- [ ] `frontend/e2e/auth/login.spec.ts`
- [ ] `frontend/e2e/auth/logout.spec.ts`
- [ ] `frontend/e2e/groups/create-group.spec.ts`
- [ ] `frontend/e2e/README.md` (updated)

### Files Modified
- [ ] `frontend/playwright.config.ts`
- [ ] `.github/workflows/pull-request.yml`

### Files Removed
- [ ] `frontend/e2e/utils/` (entire directory)
- [ ] `frontend/e2e/fixtures.ts`
- [ ] `frontend/e2e/global-setup.ts`
- [ ] `frontend/e2e/02-app-auth.spec.ts`
- [ ] `frontend/e2e/PARALLEL-EXECUTION-GUIDE.md`
- [ ] `frontend/e2e/TROUBLESHOOTING.md`

### Config Verification
Check `playwright.config.ts`:
- [ ] Has `setup`, `authenticated`, `unauthenticated` projects
- [ ] `authenticated` project depends on `setup`
- [ ] `authenticated` project uses `storageState: '.auth/user.json'`
- [ ] Base URLs are environment-aware (CI vs local)
- [ ] No old globalSetup reference

## ✅ CI Verification (After Pushing)

### 1. Create Test PR
```bash
git checkout -b test/new-e2e-setup
git add .
git commit -m "refactor: simplify e2e setup using Playwright storageState"
git push origin test/new-e2e-setup
```

### 2. Monitor GitHub Actions
Watch the PR checks at: https://github.com/[your-repo]/actions

Verify:
- [ ] Build images job succeeds
- [ ] Lint job succeeds
- [ ] Unit tests job succeeds
- [ ] **E2E test job succeeds** ⭐ (most important)

### 3. Check E2E Job Details
In the e2e-test job logs, verify:
- [ ] PostgreSQL starts and becomes healthy
- [ ] Redis starts and becomes healthy
- [ ] Backend migrations run successfully
- [ ] Backend becomes healthy
- [ ] Frontend starts and becomes healthy
- [ ] Network connectivity tests pass
- [ ] Setup project creates auth state
- [ ] All test projects run
- [ ] All tests pass

### 4. Review Artifacts (if tests fail)
Download and check:
- [ ] `playwright-report` artifact
- [ ] Screenshots showing what went wrong
- [ ] Traces for debugging
- [ ] Backend/frontend logs

## ✅ Post-Migration Tasks

### 1. Clean Up Diagnostics Directories (Optional)
```bash
# Remove old diagnostic files (safe to delete)
rm -rf e2e-diagnostics/
rm -rf playwright-results/
rm -rf test-results/ # Be careful - may contain current results
```

### 2. Update .gitignore
```bash
# Add to frontend/.gitignore if not already there:
echo ".auth/" >> frontend/.gitignore
echo "test-results/" >> frontend/.gitignore
echo "playwright-report/" >> frontend/.gitignore
```

### 3. Team Communication
- [ ] Share `E2E_MIGRATION_SUMMARY.md` with team
- [ ] Update team docs/wiki with new e2e approach
- [ ] Announce in team chat/standup
- [ ] Schedule code walkthrough if needed

### 4. Monitor for Issues
Over the next few PRs, watch for:
- [ ] E2E tests remain stable (not flaky)
- [ ] Test execution time is reasonable (~2-3 minutes)
- [ ] No auth-related failures
- [ ] Developers understand new approach

## 🔍 Troubleshooting Quick Reference

### Tests Fail: "Auth State Not Found"
```bash
cd frontend
rm -rf .auth
npx playwright test --project=setup
npx playwright test
```

### Tests Fail: "User Already Exists"
This is OK! The setup script handles this gracefully.
Check logs for "✅ Logged in with existing user"

### Tests Fail in CI Only
1. Check service health logs in CI
2. Download and review screenshots/traces
3. Verify network connectivity tests passed
4. Check backend/frontend logs for errors

### Tests Are Flaky
1. Review test code for hardcoded waits
2. Use Playwright's auto-waiting features
3. Add explicit `waitForSelector` if needed
4. Check for race conditions

### Need to Reset Everything
```bash
cd frontend
rm -rf .auth test-results playwright-report
npx playwright test
```

## ✅ Success Criteria

All of the following should be true:
- [ ] Tests pass locally on first run
- [ ] Tests pass locally on subsequent runs (faster)
- [ ] Tests pass in CI on PR
- [ ] Test execution time reasonable (< 5 minutes)
- [ ] No flaky tests (all tests reliable)
- [ ] Team understands new approach
- [ ] Documentation is clear and accurate

## 📚 Resources

- **New Documentation**: `frontend/e2e/README.md`
- **Migration Summary**: `E2E_MIGRATION_SUMMARY.md`
- **Playwright Docs**: https://playwright.dev/docs/auth
- **Example Tests**: See `frontend/e2e/auth/` and `frontend/e2e/groups/`

## 🎉 Done!

Once all checks pass, the migration is complete. The new e2e setup is:
- 90% less code
- Simpler to understand
- More reliable
- Easier to maintain

Happy testing! 🚀
