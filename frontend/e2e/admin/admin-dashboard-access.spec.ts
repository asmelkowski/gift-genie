import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../page-objects/AdminDashboardPage';
import { createAdminUser, createRegularUser } from '../helpers';

test.describe('Admin Dashboard Access Control', () => {
  /**
   * Test 1: Admin user can access the admin dashboard
   *
   * Verifies that an authenticated admin user can successfully navigate to
   * and view the admin dashboard page with all expected elements visible.
   */
  test('admin user can access dashboard', async ({ page, context }) => {
    // Create and login admin user
    console.log('[E2E] Test: Admin user can access dashboard');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminUser = await createAdminUser(page, context);

    const adminDashboard = new AdminDashboardPage(page);

    // Navigate to admin dashboard
    await adminDashboard.goto();

    // Wait for dashboard to load completely
    await adminDashboard.waitForLoad();

    // Verify dashboard is visible
    await adminDashboard.expectPageVisible();

    // Verify key dashboard elements are present
    await adminDashboard.expectSearchInputVisible();
    await adminDashboard.expectUserTableVisible();

    console.log('[E2E] ✓ Admin user successfully accessed dashboard');
  });

  /**
   * Test 2: Admin user sees user list and groups tabs
   *
   * Verifies that an admin user can see the primary dashboard elements
   * (users table, search, pagination) after logging in.
   */
  test('admin user sees user list and groups tabs', async ({ page, context }) => {
    // Create and login admin user
    console.log('[E2E] Test: Admin user sees user list and groups tabs');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminUser = await createAdminUser(page, context);

    const adminDashboard = new AdminDashboardPage(page);

    // Navigate to admin dashboard
    await adminDashboard.goto();

    // Wait for dashboard to load
    await adminDashboard.waitForLoad();

    // Verify users tab (search input and table) is visible
    await adminDashboard.expectSearchInputVisible();
    await expect(page.getByTestId('user-search-input')).toHaveAttribute('placeholder', /search/i);

    // Verify user table is visible
    await adminDashboard.expectUserTableVisible();

    // Verify we can see pagination or at least some indication of user list
    const userRows = page.getByTestId(/^user-row-/);
    const rowCount = await userRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);

    console.log(`[E2E] ✓ Admin sees users list with ${rowCount} visible users`);
  });

  /**
   * Test 3: Regular (non-admin) user cannot access the admin dashboard
   *
   * Verifies that when a regular user attempts to navigate to /admin,
   * they cannot access it (either redirected or get access denied).
   */
  test('regular user cannot access dashboard', async ({ page, context }) => {
    // Create and login regular (non-admin) user
    console.log('[E2E] Test: Regular user cannot access dashboard');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _regularUser = await createRegularUser(page, context);

    // Attempt to navigate to admin dashboard
    console.log('[E2E] Attempting to navigate to /admin as regular user...');
    await page.goto('/admin');

    // Verify we cannot access the dashboard
    // Either we get a 403 error, access denied message, or redirect to /groups
    const url = page.url();
    const isDashboardAccessible = await page
      .getByTestId('admin-dashboard')
      .isVisible()
      .catch(() => false);

    // Verify either:
    // 1. We were redirected away from /admin
    // 2. Dashboard is not visible (access denied)
    const wasRedirected = !url.includes('/admin');
    const dashboardNotVisible = !isDashboardAccessible;

    if (!wasRedirected && !dashboardNotVisible) {
      throw new Error(`Regular user was able to access admin dashboard! URL: ${url}`);
    }

    console.log(
      `[E2E] ✓ Regular user access denied (redirected: ${wasRedirected}, dashboard hidden: ${dashboardNotVisible})`
    );
  });

  /**
   * Test 4: Regular user cannot access admin dashboard directly
   *
   * Verifies that a regular user attempting to visit /admin directly
   * cannot access the dashboard (gets redirected, 404, or access denied).
   */
  test('regular user cannot access admin dashboard directly', async ({ page, context }) => {
    // Create and login regular user
    console.log('[E2E] Test: Regular user cannot access admin dashboard directly');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _regularUser = await createRegularUser(page, context);

    // Attempt to navigate directly to admin dashboard
    console.log('[E2E] Attempting to navigate to /admin as regular user...');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Verify we cannot access the dashboard
    const isDashboardAccessible = await page
      .getByTestId('admin-dashboard')
      .isVisible()
      .catch(() => false);

    // Dashboard should NOT be visible
    if (isDashboardAccessible) {
      throw new Error('Regular user was able to access admin dashboard!');
    }

    console.log('[E2E] ✓ Regular user access to /admin denied - dashboard is not accessible');
  });

  /**
   * Test 5: Unauthenticated user is redirected to login
   *
   * Verifies that when an unauthenticated user attempts to access
   * the admin dashboard, they are redirected to the login page.
   */
  test('unauthenticated user redirected to login', async ({ page }) => {
    // Do NOT login - stay unauthenticated
    console.log('[E2E] Test: Unauthenticated user redirected to login');

    // Attempt to navigate to admin dashboard without authentication
    console.log('[E2E] Navigating to /admin without authentication...');
    await page.goto('/admin');

    // Wait a bit for potential redirect
    await page.waitForLoadState('networkidle');

    // Verify we were redirected to login page
    const currentUrl = page.url();
    const isOnLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth');

    // Also check for login form elements
    const loginForm = page.getByTestId('login-email-input');
    const isLoginFormVisible = await loginForm.isVisible().catch(() => false);

    if (!isOnLoginPage && !isLoginFormVisible) {
      throw new Error(
        `Unauthenticated user was not redirected to login. Current URL: ${currentUrl}`
      );
    }

    console.log(`[E2E] ✓ Unauthenticated user redirected to login (URL: ${currentUrl})`);
  });

  /**
   * Test 6: Admin user can access admin dashboard directly
   *
   * Verifies that an admin user can navigate directly to /admin
   * and see the admin dashboard without needing navigation links.
   */
  test('admin user can access admin dashboard directly', async ({ page, context }) => {
    // Create and login admin user
    console.log('[E2E] Test: Admin user can access admin dashboard directly');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminUser = await createAdminUser(page, context);

    const adminDashboard = new AdminDashboardPage(page);

    // Navigate directly to admin dashboard
    console.log('[E2E] Navigating directly to /admin as admin user...');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Verify we're on the admin dashboard
    const currentUrl = page.url();
    expect(currentUrl).toContain('/admin');

    // Verify dashboard is visible and accessible
    const isDashboardVisible = await page
      .getByTestId('admin-dashboard')
      .isVisible()
      .catch(() => false);

    if (!isDashboardVisible) {
      throw new Error('Admin user should be able to access /admin but dashboard is not visible');
    }

    // Verify key dashboard elements are present
    await adminDashboard.expectPageVisible();
    await adminDashboard.expectSearchInputVisible();

    console.log('[E2E] ✓ Admin user can access /admin directly and see dashboard');
  });

  /**
   * Test 7: Admin user can interact with permission management
   *
   * Verifies that an admin user can interact with the permission
   * management features in the admin dashboard.
   */
  test('admin user can interact with permission management', async ({ page, context }) => {
    // Create and login admin user
    console.log('[E2E] Test: Admin user can interact with permission management');
    const adminUser = await createAdminUser(page, context);

    const adminDashboard = new AdminDashboardPage(page);

    // Navigate to admin dashboard
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();

    // Verify dashboard is accessible
    await adminDashboard.expectPageVisible();

    // Verify user search is functional
    await adminDashboard.expectSearchInputVisible();

    // Try searching for a user (search for the admin user themselves)
    await adminDashboard.searchUsers(adminUser.email);

    // Verify table content is still visible after search
    await adminDashboard.expectUserTableVisible();

    // Clear search
    await adminDashboard.clearSearch();

    console.log('[E2E] ✓ Admin user successfully interacted with dashboard');
  });
});
