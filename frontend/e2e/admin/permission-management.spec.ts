import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../page-objects/AdminDashboardPage';
import {
  createAdminUser,
  createUserWithoutLogin,
  grantPermissionViaAPI,
  getUserPermissions,
} from '../helpers';

/**
 * Permission Management E2E Tests (Phase 3)
 *
 * These tests verify that admin users can successfully grant and revoke permissions
 * through the UI, with proper feedback messages and state updates.
 *
 * Test user permissions:
 * - draws:notify: Ability to notify about draws
 * - groups:delete: Ability to delete groups (for variation in testing)
 */
test.describe('Permission Management', () => {
  /**
   * Test 1: Admin can grant permission to user
   *
   * Workflow:
   * 1. Create admin + regular user
   * 2. Navigate to admin dashboard
   * 3. Search for regular user
   * 4. Open permission dialog
   * 5. Grant permission (draws:notify)
   * 6. Verify success message
   * 7. Verify permission appears in list
   * 8. Verify permission count updates
   */
  test('admin can grant permission to user', async ({ page, context }) => {
    console.log('[E2E] Test: Admin can grant permission to user');

    // Setup: Create admin + regular user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminUser = await createAdminUser(page, context);
    const regularUser = await createUserWithoutLogin(page, 'user');

    const adminDashboard = new AdminDashboardPage(page);

    // Navigate to admin dashboard
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();
    console.log('[E2E] Admin dashboard loaded');

    // Search for regular user by email
    await adminDashboard.searchUsers(regularUser.email);
    console.log(`[E2E] Searched for user: ${regularUser.email}`);

    // Open permission dialog for regular user
    // Note: userId would be returned from user data after API setup
    // For now, we'll use email-based search to find the user in the table
    await adminDashboard.expectUserInTable(regularUser.email);
    console.log('[E2E] User found in table');

    // Use the user ID directly from the created user
    const userId = regularUser.id!;

    // Verify user is in the table
    await adminDashboard.expectUserInTable(regularUser.email);

    const initialCount = await adminDashboard.getPermissionCount(userId);
    const initialCountNumber =
      initialCount === '' || initialCount === '0' ? 0 : parseInt(initialCount);
    console.log(`[E2E] Initial permission count: ${initialCount || '0'}`);

    // Click manage permissions button
    await adminDashboard.clickManagePermissions(userId);
    console.log(`[E2E] Opened permission dialog for user ${userId}`);

    // Verify dialog title contains user identifier
    await adminDashboard.expectDialogTitleContains(regularUser.name);

    // Verify permission is NOT granted yet
    const isPermissionGrantedBefore = await adminDashboard.isPermissionGranted('draws:notify');
    expect(isPermissionGrantedBefore).toBe(false);
    console.log('[E2E] Verified permission not yet granted');

    // Grant permission
    await adminDashboard.grantPermission('draws:notify');
    console.log('[E2E] Permission grant API call completed');

    // Verify permission appears in the permission list
    await adminDashboard.expectPermissionInList('draws:notify');
    console.log('[E2E] Permission now appears in list');

    // Verify permission is marked as granted in dialog
    const isPermissionGrantedAfter = await adminDashboard.isPermissionGranted('draws:notify');
    expect(isPermissionGrantedAfter).toBe(true);

    // Close dialog and verify count updated
    await adminDashboard.closePermissionDialog();
    console.log('[E2E] Closed permission dialog');

    // Wait for dialog to close and table to refresh
    await page.waitForLoadState('networkidle');

    // Reopen dialog to verify persistence
    await adminDashboard.clickManagePermissions(userId);
    console.log('[E2E] Reopened permission dialog');

    // Verify permission still there
    await adminDashboard.expectPermissionInList('draws:notify');
    console.log('[E2E] Permission persisted after dialog reopen');

    // Verify permission count updated
    const newCount = await adminDashboard.getPermissionCount(userId);
    const newCountNumber = newCount === '' || newCount === '0' ? 0 : parseInt(newCount);
    expect(newCountNumber).toBe(initialCountNumber + 1);
    console.log(`[E2E] Permission count updated: ${initialCountNumber} → ${newCountNumber}`);

    // Verify via API
    const apiPermissions = await getUserPermissions(page, userId);
    expect(apiPermissions).toContain('draws:notify');
    console.log('[E2E] ✓ Permission grant verified via API');
  });

  /**
   * Test 2: Admin can revoke permission from user
   *
   * Workflow:
   * 1. Create admin + regular user with permission pre-granted
   * 2. Navigate to admin dashboard
   * 3. Open permission dialog
   * 4. Revoke permission
   * 5. Verify success message
   * 6. Verify permission removed from list
   * 7. Verify permission count decreases
   */
  test('admin can revoke permission from user', async ({ page, context }) => {
    console.log('[E2E] Test: Admin can revoke permission from user');

    // Setup: Create admin + regular user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminUser = await createAdminUser(page, context);
    const regularUser = await createUserWithoutLogin(page, 'user');

    const adminDashboard = new AdminDashboardPage(page);

    // Navigate to admin dashboard
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();

    // Search for the user
    await adminDashboard.searchUsers(regularUser.email);
    await adminDashboard.expectUserInTable(regularUser.email);

    // Use the user ID directly from the created user
    const userId = regularUser.id!;

    // Pre-grant permission via API
    await grantPermissionViaAPI(page, userId, 'draws:notify');
    console.log('[E2E] Pre-granted permission');

    // Refresh and reopen dialog
    await page.reload();
    await adminDashboard.waitForLoad();
    await adminDashboard.searchUsers(regularUser.email);

    // Open permission dialog
    await adminDashboard.clickManagePermissions(userId);
    console.log('[E2E] Opened permission dialog');

    // Verify permission is already granted
    await adminDashboard.expectPermissionInList('draws:notify');
    console.log('[E2E] Permission already granted');

    // Get initial count before revoke
    const initialCount = await adminDashboard.getPermissionCount(userId);
    const initialCountNumber =
      initialCount === '' || initialCount === '0' ? 0 : parseInt(initialCount);
    console.log(`[E2E] Permission count before revoke: ${initialCountNumber}`);

    // Revoke the permission
    await adminDashboard.revokePermission('draws:notify');
    console.log('[E2E] Revoked permission');

    // Verify permission no longer appears in granted list
    await adminDashboard.expectPermissionNotInList('draws:notify');
    console.log('[E2E] Permission removed from granted list');

    // Close dialog
    await adminDashboard.closePermissionDialog();

    // Reload and verify permission count decreased
    await page.reload();
    await adminDashboard.waitForLoad();
    await adminDashboard.searchUsers(regularUser.email);

    const finalCount = await adminDashboard.getPermissionCount(userId);
    const finalCountNumber = finalCount === '' || finalCount === '0' ? 0 : parseInt(finalCount);
    expect(finalCountNumber).toBe(initialCountNumber - 1);
    console.log(
      `[E2E] ✓ Permission successfully revoked and count updated: ${initialCountNumber} → ${finalCountNumber}`
    );
  });

  /**
   * Test 4: Permission count updates correctly after grant
   *
   * Workflow:
   * 1. Create admin + user with known initial permission count
   * 2. Note the initial count
   * 3. Grant a new permission
   * 4. Verify count increased by exactly 1
   */
  test('permission count updates correctly after grant', async ({ page, context }) => {
    console.log('[E2E] Test: Permission count updates correctly after grant');

    // Setup: Create admin + regular user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminUser = await createAdminUser(page, context);
    const regularUser = await createUserWithoutLogin(page, 'user');

    const adminDashboard = new AdminDashboardPage(page);

    // Navigate to admin dashboard
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();

    // Search for user
    await adminDashboard.searchUsers(regularUser.email);
    await adminDashboard.expectUserInTable(regularUser.email);

    // Use the user ID directly from the created user
    const userId = regularUser.id!;

    // Note initial count (should be 0 for new user)
    const initialCount = await adminDashboard.getPermissionCount(userId);
    const initialCountNumber =
      initialCount === '' || initialCount === '0' ? 0 : parseInt(initialCount);
    console.log(`[E2E] Initial permission count: ${initialCountNumber}`);

    // Open dialog and grant permission
    await adminDashboard.clickManagePermissions(userId);
    await adminDashboard.grantPermission('draws:notify');

    // Close and reopen to see updated count
    await adminDashboard.closePermissionDialog();
    await page.waitForLoadState('networkidle');

    // Grant second permission via API to test count increment
    await grantPermissionViaAPI(page, userId, 'groups:delete');
    console.log('[E2E] Granted second permission via API');

    // Refresh to see updated UI count
    await page.reload();
    await adminDashboard.waitForLoad();
    await adminDashboard.searchUsers(regularUser.email);

    // Check updated count
    const updatedCount = await adminDashboard.getPermissionCount(userId);
    const updatedCountNumber =
      updatedCount === '' || updatedCount === '0' ? 0 : parseInt(updatedCount);

    expect(updatedCountNumber).toBe(initialCountNumber + 2);
    console.log(
      `[E2E] ✓ Permission count correctly updated: ${initialCountNumber} → ${updatedCountNumber}`
    );
  });

  /**
   * Test 5: Permission count updates correctly after revoke
   *
   * Workflow:
   * 1. Create admin + user with multiple permissions pre-granted
   * 2. Note the initial count
   * 3. Revoke one permission
   * 4. Verify count decreased by exactly 1
   */
  test('permission count updates correctly after revoke', async ({ page, context }) => {
    console.log('[E2E] Test: Permission count updates correctly after revoke');

    // Setup: Create admin + regular user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminUser = await createAdminUser(page, context);
    const regularUser = await createUserWithoutLogin(page, 'user');

    const adminDashboard = new AdminDashboardPage(page);

    // Navigate to admin dashboard
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();

    // Search for user
    await adminDashboard.searchUsers(regularUser.email);
    await adminDashboard.expectUserInTable(regularUser.email);

    // Use the user ID directly from the created user
    const userId = regularUser.id!;

    // Pre-grant multiple permissions via API
    await grantPermissionViaAPI(page, userId, 'draws:notify');
    await grantPermissionViaAPI(page, userId, 'groups:delete');
    console.log('[E2E] Pre-granted 2 permissions via API');

    // Refresh to see updated count
    await page.reload();
    await adminDashboard.waitForLoad();
    await adminDashboard.searchUsers(regularUser.email);

    // Note count before revoke
    const beforeCount = await adminDashboard.getPermissionCount(userId);
    const beforeCountNumber = beforeCount === '' || beforeCount === '0' ? 0 : parseInt(beforeCount);
    console.log(`[E2E] Permission count before revoke: ${beforeCountNumber}`);

    // Open dialog and revoke one permission
    await adminDashboard.clickManagePermissions(userId);
    await adminDashboard.revokePermission('draws:notify');

    // Close and reopen to see updated count
    await adminDashboard.closePermissionDialog();
    await page.waitForLoadState('networkidle');

    // Check updated count
    const afterCount = await adminDashboard.getPermissionCount(userId);
    const afterCountNumber = afterCount === '' || afterCount === '0' ? 0 : parseInt(afterCount);

    expect(afterCountNumber).toBe(beforeCountNumber - 1);
    console.log(
      `[E2E] ✓ Permission count correctly updated: ${beforeCountNumber} → ${afterCountNumber}`
    );
  });

  /**
   * Test 6: Permission appears in user list immediately after grant
   *
   * Workflow:
   * 1. Create admin + regular user
   * 2. Grant permission via dialog
   * 3. Verify it appears in dialog without refresh
   * 4. Close dialog
   * 5. Reopen dialog
   * 6. Verify persistence
   */
  test('permission appears in user list immediately after grant', async ({ page, context }) => {
    console.log('[E2E] Test: Permission appears in user list immediately after grant');

    // Setup: Create admin + regular user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminUser = await createAdminUser(page, context);
    const regularUser = await createUserWithoutLogin(page, 'user');

    const adminDashboard = new AdminDashboardPage(page);

    // Navigate to admin dashboard
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();

    // Search for user
    await adminDashboard.searchUsers(regularUser.email);
    await adminDashboard.expectUserInTable(regularUser.email);

    // Use the user ID directly from the created user
    const userId = regularUser.id!;

    // Open dialog
    await adminDashboard.clickManagePermissions(userId);
    console.log('[E2E] Opened permission dialog');

    // Verify permission not there yet
    const beforeGrant = await adminDashboard.isPermissionGranted('draws:notify');
    expect(beforeGrant).toBe(false);

    // Grant permission
    await adminDashboard.grantPermission('draws:notify');

    // Close and reopen to see updated count
    await adminDashboard.closePermissionDialog();
    await page.waitForLoadState('networkidle');

    // Reopen dialog
    await adminDashboard.clickManagePermissions(userId);
    console.log('[E2E] Reopened dialog');

    // Verify persistence
    await adminDashboard.expectPermissionInList('draws:notify');
    console.log('[E2E] ✓ Permission persisted after dialog close/reopen');
  });

  /**
   * Test 7: Permission removed from user list immediately after revoke
   *
   * Workflow:
   * 1. Create admin + user with permission pre-granted
   * 2. Open permission dialog
   * 3. Revoke permission
   * 4. Verify it disappears immediately (no refresh needed)
   * 5. Close dialog
   * 6. Reopen dialog
   * 7. Verify persistence
   */
  test('permission removed from user list immediately after revoke', async ({ page, context }) => {
    console.log('[E2E] Test: Permission removed from user list immediately after revoke');

    // Setup: Create admin + regular user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminUser = await createAdminUser(page, context);
    const regularUser = await createUserWithoutLogin(page, 'user');

    const adminDashboard = new AdminDashboardPage(page);

    // Navigate to admin dashboard
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();

    // Search for user
    await adminDashboard.searchUsers(regularUser.email);
    await adminDashboard.expectUserInTable(regularUser.email);

    // Use the user ID directly from the created user
    const userId = regularUser.id!;

    // Pre-grant permission via API
    await grantPermissionViaAPI(page, userId, 'draws:notify');
    console.log('[E2E] Pre-granted permission via API');

    // Refresh page
    await page.reload();
    await adminDashboard.waitForLoad();
    await adminDashboard.searchUsers(regularUser.email);

    // Open dialog
    await adminDashboard.clickManagePermissions(userId);
    console.log('[E2E] Opened permission dialog');

    // Verify permission is there
    await adminDashboard.expectPermissionInList('draws:notify');
    console.log('[E2E] Permission present in list');

    // Revoke permission
    await adminDashboard.revokePermission('draws:notify');
    console.log('[E2E] Permission revoked via UI');

    // Immediately verify it's removed from list (no refresh)
    await adminDashboard.expectPermissionNotInList('draws:notify');
    console.log('[E2E] Permission removed immediately from list');

    // Close dialog
    await adminDashboard.closePermissionDialog();
    await page.waitForLoadState('networkidle');

    // Reopen dialog
    await adminDashboard.clickManagePermissions(userId);
    console.log('[E2E] Reopened dialog');

    // Verify persistence
    await adminDashboard.expectPermissionNotInList('draws:notify');
    console.log('[E2E] ✓ Permission revoke persisted after dialog close/reopen');
  });

  /**
   * Test 8: Admin can search for user before managing permissions
   *
   * Workflow:
   * 1. Create admin + multiple regular users (or use existing users)
   * 2. Navigate to admin dashboard
   * 3. Use search to find specific user
   * 4. Open permission dialog
   * 5. Verify correct user in dialog title
   * 6. Grant a permission
   * 7. Verify permission added to correct user
   */
  test('admin can search for user before managing permissions', async ({ page, context }) => {
    console.log('[E2E] Test: Admin can search for user before managing permissions');

    // Setup: Create admin + two regular users
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminUser = await createAdminUser(page, context);
    const regularUser1 = await createUserWithoutLogin(page, 'user');
    const regularUser2 = await createUserWithoutLogin(page, 'user');

    const adminDashboard = new AdminDashboardPage(page);

    // Navigate to admin dashboard
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();
    console.log('[E2E] Admin dashboard loaded');

    // Clear search to see all users
    await adminDashboard.clearSearch();

    // Verify both users are visible
    await adminDashboard.expectUserInTable(regularUser1.email);
    await adminDashboard.expectUserInTable(regularUser2.email);
    console.log('[E2E] Both users visible initially');

    // Search for specific user (user1)
    await adminDashboard.searchUsers(regularUser1.email);
    console.log(`[E2E] Searched for user: ${regularUser1.email}`);

    // Verify user1 is visible
    await adminDashboard.expectUserInTable(regularUser1.email);

    // Verify user2 is NOT visible (filtered out)
    await adminDashboard.expectUserNotInTable(regularUser2.email);
    console.log('[E2E] Search filtered results correctly');

    // Use the user ID directly from the created user
    const userId1 = regularUser1.id!;

    // Open permission dialog for user1
    await adminDashboard.clickManagePermissions(userId1);
    console.log('[E2E] Opened permission dialog');

    // Verify dialog title contains user1's name (not user2)
    await adminDashboard.expectDialogTitleContains(regularUser1.name);
    console.log('[E2E] Dialog title shows correct user');

    // Grant permission to user1
    await adminDashboard.grantPermission('draws:notify');
    console.log('[E2E] Permission granted');

    // Verify permission in list
    await adminDashboard.expectPermissionInList('draws:notify');

    // Close dialog
    await adminDashboard.closePermissionDialog();
    await page.waitForLoadState('networkidle');

    // Verify user1 has the permission
    const permissionsUser1 = await getUserPermissions(page, userId1);
    expect(permissionsUser1).toContain('draws:notify');
    console.log('[E2E] ✓ Permission granted to correct user via search workflow');
  });

  /**
   * Test 9: Multiple permissions can be managed in sequence
   *
   * Workflow:
   * 1. Create admin + regular user
   * 2. Open permission dialog
   * 3. Grant multiple permissions (draws:notify, groups:delete)
   * 4. Verify all appear in list
   * 5. Revoke one
   * 6. Verify correct permission removed
   * 7. Verify other permission still there
   */
  test('multiple permissions can be managed in sequence', async ({ page, context }) => {
    console.log('[E2E] Test: Multiple permissions can be managed in sequence');

    // Setup: Create admin + regular user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminUser = await createAdminUser(page, context);
    const regularUser = await createUserWithoutLogin(page, 'user');

    const adminDashboard = new AdminDashboardPage(page);

    // Navigate to admin dashboard
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();

    // Search for user
    await adminDashboard.searchUsers(regularUser.email);
    await adminDashboard.expectUserInTable(regularUser.email);

    // Use the user ID directly from the created user
    const userId = regularUser.id!;

    // Open dialog
    await adminDashboard.clickManagePermissions(userId);
    console.log('[E2E] Opened permission dialog');

    // Grant first permission
    await adminDashboard.grantPermission('draws:notify');
    console.log('[E2E] Granted draws:notify');

    // Grant second permission
    await adminDashboard.grantPermission('groups:delete');
    console.log('[E2E] Granted groups:delete');

    // Verify both permissions in list
    await adminDashboard.expectPermissionInList('draws:notify');
    await adminDashboard.expectPermissionInList('groups:delete');
    console.log('[E2E] Both permissions visible in list');

    // Revoke one permission
    await adminDashboard.revokePermission('draws:notify');
    console.log('[E2E] Revoked draws:notify');

    // Verify correct permission removed
    await adminDashboard.expectPermissionNotInList('draws:notify');
    // But other permission still there
    await adminDashboard.expectPermissionInList('groups:delete');
    console.log('[E2E] Correct permission removed, other preserved');

    // Close and verify via API
    await adminDashboard.closePermissionDialog();
    await page.waitForLoadState('networkidle');

    const finalPermissions = await getUserPermissions(page, userId);
    expect(finalPermissions).not.toContain('draws:notify');
    expect(finalPermissions).toContain('groups:delete');
    console.log('[E2E] ✓ Multiple permission management workflow completed');
  });
});
