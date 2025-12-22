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
├── admin/
│   ├── admin-dashboard-access.spec.ts        # Admin dashboard access control tests
│   ├── permission-management.spec.ts         # Permission grant/revoke workflow tests
│   ├── permission-enforcement.spec.ts        # Permission enforcement in features tests
│   └── admin-dashboard-ux.spec.ts            # UX, search, pagination, errors
├── auth/
│   ├── login.spec.ts          # Login tests (unauthenticated)
│   ├── logout.spec.ts         # Logout tests (authenticated)
│   └── register.spec.ts       # Registration tests (unauthenticated)
├── groups/
│   ├── create-group.spec.ts   # Group tests (authenticated)
│   └── ...                    # More feature tests
├── page-objects/
│   ├── AdminDashboardPage.ts  # Admin dashboard page object
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   └── ...                    # Other page objects
└── helpers.ts                 # Test data helpers (user creation, permissions)
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

## Admin Permission Tests

We have comprehensive E2E tests for the permission system that verify admin dashboard functionality and permission enforcement across the application.

### Test Suite Overview

The admin permission tests are organized into 4 focused test files:

#### 1. **admin-dashboard-access.spec.ts**

Verifies access control to the admin dashboard:

- ✅ Admin users can access the dashboard
- ✅ Admin users see user list and tabs
- ✅ Regular users cannot access dashboard (blocked or redirected)
- ✅ Regular users don't see Admin link in navigation
- ✅ Unauthenticated users redirected to login
- ✅ Admin users see Admin navigation link
- ✅ Admin users can interact with permission management

#### 2. **permission-management.spec.ts**

Tests the permission grant/revoke workflow through the UI:

- ✅ Admin can grant permission to user
- ✅ Admin can revoke permission from user
- ✅ Granting duplicate permission shows error or is idempotent
- ✅ Permission count updates correctly after grant
- ✅ Permission count updates correctly after revoke
- ✅ Permission appears in user list immediately after grant
- ✅ Permission removed from list immediately after revoke
- ✅ Admin can search for user before managing permissions
- ✅ Multiple permissions can be managed in sequence

#### 3. **permission-enforcement.spec.ts**

Tests that permissions are actually enforced in features:

- ✅ User without draws:notify cannot send notifications
- ✅ User with draws:notify can send notifications
- ✅ Granting draws:notify enables notification feature
- ✅ Revoking draws:notify disables notification feature
- ✅ Admin user bypasses permission checks (has all permissions)
- ✅ Permission enforcement works for other permissions (groups:delete)
- ✅ Permission state transitions work correctly (grant → revoke → grant)

#### 4. **admin-dashboard-ux.spec.ts**

Tests user experience aspects of the admin dashboard:

- **Search & Filtering**: Case-insensitive search, filtering, clearing
- **Pagination**: Multi-page navigation, page resets on search
- **Loading States**: Spinners during load, clearing after results
- **Error Handling**: Invalid permissions, missing users, API errors
- **Permission Display**: Permission counts for different user levels
- **Empty States**: "No users found" when search returns nothing
- **Workflows**: Complete admin interactions (search → manage → verify)

### Running Permission Tests

```bash
cd frontend

# Run all admin permission tests
npm run test:e2e -- admin/

# Run specific test file
npm run test:e2e -- admin/permission-management.spec.ts

# Run with UI mode (great for debugging)
npm run test:e2e -- admin/ --ui

# Run with browser visible
npm run test:e2e -- admin/ --headed

# Debug mode
npm run test:e2e -- admin/ --debug

# Run a specific test by name
npm run test:e2e -- admin/ -g "admin can grant permission"
```

### Test Data Setup

Each test creates its own isolated test data:

#### Creating Test Users

```typescript
import { createAdminUser, createRegularUser } from '../helpers';

test('example test', async ({ page, context }) => {
  // Create and login an admin user
  const adminUser = await createAdminUser(page, context);
  // adminUser: { name, email, password, role: 'admin' }

  // Create and login a regular user
  const regularUser = await createRegularUser(page, context);
  // regularUser: { name, email, password, role: 'user' }
});
```

#### Permission Management via API

```typescript
import { grantPermissionViaAPI, revokePermissionViaAPI, getUserPermissions } from '../helpers';

// Grant a permission to a user
await grantPermissionViaAPI(page, userId, 'draws:notify');

// Revoke a permission from a user
await revokePermissionViaAPI(page, userId, 'draws:notify');

// Get all permissions for a user
const permissions = await getUserPermissions(page, userId);
// Returns: ['draws:execute', 'groups:delete']
```

#### Available Permissions for Testing

The permission system uses codes like:

- `draws:notify` - Send draw notifications
- `draws:execute` - Execute/run draws
- `groups:delete` - Delete groups
- And others as defined in your system

### Test Isolation Strategy

Each test is completely isolated:

- **No shared state** between tests
- **Each test creates its own users** (you don't share admin/regular users across tests)
- **Tests cleanup by not cleaning up** - test data is temporary and test users created during a test don't affect other tests
- **Parallel execution safe** - tests can run in parallel without interference

This means:

- ✅ Tests are independent and can run in any order
- ✅ Tests can run in parallel (configured in playwright.config.ts)
- ✅ No database state pollution between tests
- ✅ No timing issues from cleanup operations

### Using AdminDashboardPage Page Object

The `AdminDashboardPage` class provides a clean interface for testing the admin dashboard:

```typescript
import { AdminDashboardPage } from '../page-objects/AdminDashboardPage';

const adminDashboard = new AdminDashboardPage(page);

// Navigation
await adminDashboard.goto(); // Navigate to /app/admin
await adminDashboard.waitForLoad(); // Wait for dashboard to load

// User table interactions
await adminDashboard.searchUsers('user@email'); // Search for users
await adminDashboard.clearSearch(); // Clear search filter
await adminDashboard.expectUserInTable(email); // Assert user visible
await adminDashboard.expectUserNotInTable(email); // Assert user not visible

// Pagination
await adminDashboard.goToNextPage(); // Navigate to next page
await adminDashboard.goToPreviousPage(); // Navigate to previous page

// Permission management
await adminDashboard.clickManagePermissions(userId); // Open permission dialog
await adminDashboard.grantPermission('draws:notify'); // Grant a permission
await adminDashboard.revokePermission('draws:notify'); // Revoke a permission
await adminDashboard.closePermissionDialog(); // Close the dialog

// Assertions
await adminDashboard.expectPermissionInList('draws:notify'); // Assert permission granted
await adminDashboard.expectPermissionNotInList('draws:notify'); // Assert permission not granted
await adminDashboard.expectDialogTitleContains(email); // Assert dialog shows correct user
await adminDashboard.waitForSuccessMessage('Permission granted'); // Wait for success toast

// Check state
const count = await adminDashboard.getPermissionCount(userId); // Get permission count
const isGranted = await adminDashboard.isPermissionGranted('draws:notify');
```

### Important Notes

#### Admin Role Bypass Behavior

- **Admin users** have a special "All (Admin)" status and don't need explicit permissions
- Admin users can access all features and perform admin operations without individual permissions
- Regular users need explicit permissions to access features
- This is verified in the `permission-enforcement.spec.ts` tests

#### CI Compatibility

- ✅ Tests work identically in CI and local environments
- API-based authentication is used in CI to avoid cross-origin cookie issues
- Tests automatically detect CI environment via `process.env.CI`
- All tests run in parallel (4 workers in CI, 2 locally)

#### Known Behaviors

- Permission operations are **idempotent** - granting the same permission twice is safe
- Permission checks happen **server-side** - the frontend respects API errors
- **Toast messages** appear briefly after permission operations (success/error)
- Admin bypass is enforced at the **backend level** via middleware

#### Future Improvements

- Add performance benchmarks for permission checks
- Test bulk permission operations (grant multiple at once)
- Test permission inheritance (future feature)
- Add visual regression tests for admin dashboard

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
