# E2E Tests

Clean, simple end-to-end tests using Playwright's native features.

## Architecture

Our e2e tests use **Playwright's built-in authentication** via `storageState`:

1. **Setup phase** (`setup/auth.setup.ts`): Creates one test user and saves auth state
2. **Test execution**: Tests reuse the saved auth state (no per-test login needed)
3. **Projects**: Separate projects for authenticated vs unauthenticated tests

This approach is:

- ✅ **Simple** - No custom auth utilities
- ✅ **Fast** - Auth happens once, not per-test
- ✅ **Reliable** - Uses Playwright's battle-tested storageState
- ✅ **CI-friendly** - Works identically in local and CI environments

## Project Structure

```
e2e/
├── setup/
│   ├── auth.setup.ts          # Creates auth state (runs first)
│   └── cleanup.setup.ts       # Optional teardown
├── auth/
│   ├── login.spec.ts          # Login tests (unauthenticated)
│   ├── logout.spec.ts         # Logout tests (authenticated)
│   └── register.spec.ts       # Registration tests (unauthenticated)
└── groups/
    ├── create-group.spec.ts   # Group tests (authenticated)
    └── ...                    # More feature tests
```

## Running Tests

### Locally

```bash
cd frontend

# Run all tests
npm run e2e

# Run specific test file
npx playwright test auth/login.spec.ts

# Run in UI mode (great for debugging)
npx playwright test --ui

# Run with browser visible
npx playwright test --headed

# Debug specific test
npx playwright test --debug auth/login.spec.ts
```

### In CI

Tests run automatically on pull requests. The CI workflow:

1. Builds Docker images
2. Starts services (PostgreSQL, Redis, backend, frontend)
3. Runs migrations
4. Executes e2e tests in parallel
5. Uploads artifacts (reports, screenshots, videos)

## Writing Tests

### Authenticated Tests

Most tests will be authenticated (accessing protected routes):

```typescript
// e2e/features/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    // You're already logged in! Just navigate and test
    await page.goto('/app/my-feature');

    // Your test logic here
    await expect(page.locator('h1')).toContainText('My Feature');
  });
});
```

**Key points**:

- No auth setup needed - you're already logged in
- Tests run in the `authenticated` project automatically
- Auth state is loaded from `.auth/user.json`

### Unauthenticated Tests

For testing login/register flows:

```typescript
// e2e/auth/my-auth-test.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should test login', async ({ page }) => {
    // You start logged out
    await page.goto('/login');

    // Test login flow
    await page.fill('input[type="email"]', 'test@example.com');
    // ... rest of test
  });
});
```

**Key points**:

- Place in `e2e/auth/` directory
- Tests run in the `unauthenticated` project
- No stored auth state is loaded

### Test Data Cleanup

For tests that create data, clean up inline:

```typescript
test('should create and delete item', async ({ page }) => {
  await page.goto('/app/items');

  // Create test data
  const itemName = `Test Item ${Date.now()}`;
  await page.click('button:has-text("Create")');
  await page.fill('input[name="name"]', itemName);
  await page.click('button:has-text("Submit")');

  // Verify
  await expect(page.locator(`text=${itemName}`)).toBeVisible();

  // Cleanup - delete the item
  await page.click(`text=${itemName}`);
  await page.click('button:has-text("Delete")');
  await page.click('button:has-text("Confirm")');

  // Verify cleanup
  await expect(page.locator(`text=${itemName}`)).not.toBeVisible();
});
```

## Configuration

Test configuration in `playwright.config.ts`:

- **Projects**: `setup`, `authenticated`, `unauthenticated`
- **Workers**: 4 in CI, 2 locally (parallel execution)
- **Retries**: 2 in CI, 0 locally
- **Timeouts**: 60s test timeout, 10s expect timeout
- **Artifacts**: Screenshots, videos, traces on failure

## Test User

All authenticated tests share one test user:

- **Email**: `e2e-test-user@example.com`
- **Password**: `TestPassword123!@#`
- **Auth state**: Saved to `.auth/user.json`

This user is created once during setup and reused across all test runs.

## Troubleshooting

### Tests fail with "not logged in"

**Solution**: Run setup project first

```bash
npx playwright test --project=setup
npx playwright test
```

### Auth state not persisting

**Check**: Ensure `.auth/user.json` exists

```bash
ls -la .auth/user.json
cat .auth/user.json
```

**Recreate** auth state:

```bash
rm -rf .auth
npx playwright test --project=setup
```

### Tests pass locally but fail in CI

**Common causes**:

- Timing issues (CI is slower): Add explicit waits
- Network issues: Check service health in CI logs
- Auth state: Verify setup project runs in CI

**Debug CI**:

1. Check workflow logs for setup project
2. Download artifacts (screenshots, videos, traces)
3. Review service logs (backend, frontend)

### Test is flaky

**Solutions**:

- Use Playwright's auto-waiting (it's built-in)
- Use `waitForLoadState()` after navigation
- Avoid hardcoded `page.waitForTimeout()`
- Use proper selectors (`data-testid` preferred)

```typescript
// Bad - hardcoded wait
await page.waitForTimeout(1000);

// Good - wait for specific condition
await page.waitForSelector('[data-testid="my-element"]');

// Better - Playwright auto-waits
await expect(page.locator('[data-testid="my-element"]')).toBeVisible();
```

### View test results

```bash
# Open HTML report
npx playwright show-report

# View specific trace
npx playwright show-trace test-results/traces/my-test.zip
```

## Best Practices

1. **Use data-testid**: Add `data-testid` attributes for stable selectors
2. **Keep tests simple**: No complex utilities or abstractions
3. **Test user journeys**: Focus on complete flows, not implementation details
4. **Clean up inline**: Don't rely on complex cleanup utilities
5. **Use Playwright's features**: Auto-waiting, retry logic, built-in assertions
6. **Name tests clearly**: Describe what you're testing, not how

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Authentication Guide](https://playwright.dev/docs/auth)
