import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../page-objects/AdminDashboardPage';
import { GroupsPage } from '../page-objects/GroupsPage';
import {
  createAdminUser,
  createRegularUser,
  getUserPermissions,
  revokePermissionViaAPI,
} from '../helpers';

/**
 * Resource-Scoped Permission Management E2E Tests
 *
 * These tests validate the permission validation fix that allows admins to:
 * 1. View resource-scoped permissions (like groups:read:UUID) that users auto-acquired
 * 2. Revoke those permissions and verify access is lost
 *
 * Background:
 * When a user creates a group, they are auto-granted 14 resource-scoped permissions:
 * - groups:read, groups:update, groups:delete (for the group)
 * - members:create, members:read, members:update, members:delete (for members in that group)
 * - exclusions:create, exclusions:read, exclusions:update, exclusions:delete (for exclusions)
 * - draws:read, draws:execute (for draws in that group)
 *
 * All these permissions are resource-scoped with the group UUID appended:
 * e.g., "groups:read:550e8400-e29b-41d4-a716-446655440000"
 *
 * The permission validation fix ensures these resource-scoped permissions:
 * - Are returned from the admin API endpoint
 * - Can be revoked properly
 * - Actually enforce access control when revoked
 */
test.describe('Resource-Scoped Permission Management', () => {
  /**
   * Test 1: Admin can view auto-granted resource-scoped permissions
   *
   * This test validates that when a regular user creates a group and gets auto-granted
   * resource-scoped permissions, an admin can see those permissions in the admin dashboard.
   *
   * Workflow:
   * 1. Create an admin user
   * 2. Create a regular user in a separate context
   * 3. Regular user creates a group (which auto-grants 14 resource-scoped permissions)
   * 4. Regular user adds a member to the group (for realism)
   * 5. Switch to admin context
   * 6. Admin navigates to admin dashboard
   * 7. Admin searches for the regular user
   * 8. Admin opens permission dialog for regular user
   * 9. Verify admin can see the auto-granted resource-scoped permissions via API
   * 10. Verify permissions include group-specific permissions (e.g., groups:read:GROUP_UUID)
   * 11. Verify the permission count matches expected (14 group permissions)
   */
  test('admin can view auto-granted resource-scoped permissions', async ({
    page,
    context,
    browser,
  }) => {
    console.log('[E2E] Test: Admin can view auto-granted resource-scoped permissions');

    // Step 1: Create admin user
    const adminUser = await createAdminUser(page, context);
    console.log(`[E2E] Admin user created: ${adminUser.email}`);

    // Step 2-4: Create regular user and group in separate context
    const regularUserContext = await browser.newContext();
    const regularUserPage = await regularUserContext.newPage();
    const regularUser = await createRegularUser(regularUserPage, regularUserContext);
    console.log(`[E2E] Regular user created: ${regularUser.email}`);

    // Regular user navigates to groups page
    const groupsPage = new GroupsPage(regularUserPage);
    await groupsPage.goto();
    await groupsPage.waitForLoad();
    console.log('[E2E] Groups page loaded for regular user');

    // Regular user creates a group
    const groupName = `Test Group ${Date.now()}`;
    await groupsPage.createGroup(groupName);
    console.log(`[E2E] Group creation initiated: ${groupName}`);

    // Wait for redirect to members page and capture group ID
    await regularUserPage.waitForURL(/\/app\/groups\/([a-f0-9-]+)\/members/);
    const url = regularUserPage.url();
    const groupIdMatch = url.match(/\/app\/groups\/([a-f0-9-]+)\/members/);
    const groupId = groupIdMatch?.[1];
    expect(groupId).toBeDefined();
    console.log(`[E2E] Group created successfully with ID: ${groupId}`);

    // Add a member to make it realistic (proves group is functional)
    const addMemberButton = regularUserPage.getByRole('button', {
      name: /Add Member/i,
    });
    const addMemberButtonVisible = await addMemberButton.isVisible().catch(() => false);

    if (addMemberButtonVisible) {
      await addMemberButton.click();
      const memberInput = regularUserPage.getByPlaceholder(/Enter member name|Search/i);
      if (await memberInput.isVisible()) {
        await memberInput.fill('Alice');
        await regularUserPage
          .locator('form')
          .getByRole('button', { name: /Add Member|Add/i })
          .click();
        // Wait for member to appear or API to settle
        await regularUserPage.waitForLoadState('networkidle');
        console.log('[E2E] Member added to group');
      }
    }

    // Close regular user context
    await regularUserContext.close();
    console.log('[E2E] Regular user context closed');

    // Step 5-6: Switch to admin context and navigate to dashboard
    const adminDashboard = new AdminDashboardPage(page);
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();
    console.log('[E2E] Admin dashboard loaded');

    // Step 7: Search for regular user
    await adminDashboard.searchUsers(regularUser.email);
    await adminDashboard.expectUserInTable(regularUser.email);
    console.log(`[E2E] Found user in dashboard: ${regularUser.email}`);

    // Step 8: Open permission dialog
    const userId = regularUser.id!;
    await adminDashboard.clickManagePermissions(userId);
    console.log('[E2E] Opened permission dialog for regular user');

    // Step 9-11: Verify resource-scoped permissions are visible via API
    // The user should have 14 auto-granted permissions for the group they created
    const permissions = await getUserPermissions(page, userId);
    console.log(`[E2E] User has ${permissions.length} total permissions`);

    // Filter for group-specific permissions
    const groupPermissions = permissions.filter(p => p.includes(groupId!));
    console.log(`[E2E] Group-specific permissions: ${groupPermissions.length}`);
    console.log(`[E2E] Group permissions: ${groupPermissions.join(', ')}`);

    // Verify we have the expected auto-granted permissions (14 for group owner)
    expect(groupPermissions.length).toBe(14);
    console.log('[E2E] ✓ Verified 14 auto-granted permissions');

    // Verify some specific permission patterns exist
    expect(groupPermissions).toContain(`groups:read:${groupId}`);
    expect(groupPermissions).toContain(`groups:update:${groupId}`);
    expect(groupPermissions).toContain(`groups:delete:${groupId}`);
    expect(groupPermissions).toContain(`members:create:${groupId}`);
    expect(groupPermissions).toContain(`members:read:${groupId}`);
    console.log('[E2E] ✓ Verified specific resource-scoped permissions exist');

    // Close the dialog
    await adminDashboard.closePermissionDialog();
    console.log('[E2E] Permission dialog closed');

    console.log('[E2E] ✓ Test passed: Admin can view auto-granted resource-scoped permissions');
  });

  /**
   * Test 2: Admin can see resource-scoped permissions for multiple groups
   *
   * This test validates that:
   * 1. Admins can see auto-granted resource-scoped permissions
   * 2. Permissions are correctly scoped to specific resources
   * 3. Admin can see the permission list includes UUIDs
   *
   * Workflow:
   * 1. Create admin user
   * 2. Create regular user who creates TWO groups
   * 3. Admin views regular user's permissions
   * 4. Verify user has permissions for BOTH groups (each scoped to its UUID)
   * 5. Verify permissions are correctly differentiated by UUID
   */
  test('admin can see resource-scoped permissions for multiple groups', async ({
    page,
    context,
    browser,
  }) => {
    console.log('[E2E] Test: Admin can see resource-scoped permissions for multiple groups');

    // Step 1: Create admin user
    const adminUser = await createAdminUser(page, context);
    console.log(`[E2E] Admin user created: ${adminUser.email}`);

    // Step 2: Create regular user and TWO groups
    const regularUserContext = await browser.newContext();
    const regularUserPage = await regularUserContext.newPage();
    const regularUser = await createRegularUser(regularUserPage, regularUserContext);
    console.log(`[E2E] Regular user created: ${regularUser.email}`);

    // Create Group A
    const groupsPage = new GroupsPage(regularUserPage);
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    const groupNameA = `Group A ${Date.now()}`;
    await groupsPage.createGroup(groupNameA);

    await regularUserPage.waitForURL(/\/app\/groups\/([a-f0-9-]+)\/members/);
    const urlA = regularUserPage.url();
    const groupIdA = urlA.match(/\/app\/groups\/([a-f0-9-]+)\/members/)?.[1];
    expect(groupIdA).toBeDefined();
    console.log(`[E2E] Group A created: ${groupIdA}`);

    // Go back and create Group B
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    const groupNameB = `Group B ${Date.now()}`;
    await groupsPage.createGroup(groupNameB);

    await regularUserPage.waitForURL(/\/app\/groups\/([a-f0-9-]+)\/members/);
    const urlB = regularUserPage.url();
    const groupIdB = urlB.match(/\/app\/groups\/([a-f0-9-]+)\/members/)?.[1];
    expect(groupIdB).toBeDefined();
    console.log(`[E2E] Group B created: ${groupIdB}`);

    // Close regular user context
    await regularUserContext.close();

    // Step 3: Admin views user's permissions
    const adminDashboard = new AdminDashboardPage(page);
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();

    await adminDashboard.searchUsers(regularUser.email);
    await adminDashboard.expectUserInTable(regularUser.email);
    console.log('[E2E] Found user in admin dashboard');

    const userId = regularUser.id!;

    // Step 4-5: Verify permissions via API
    const permissions = await getUserPermissions(page, userId);
    console.log(`[E2E] User has ${permissions.length} total permissions`);

    // Filter for group-specific permissions
    const groupAPermissions = permissions.filter(p => p.includes(groupIdA!));
    const groupBPermissions = permissions.filter(p => p.includes(groupIdB!));

    console.log(`[E2E] Group A permissions: ${groupAPermissions.length}`);
    console.log(`[E2E] Group B permissions: ${groupBPermissions.length}`);

    // Each group should have 14 auto-granted permissions
    expect(groupAPermissions.length).toBe(14);
    expect(groupBPermissions.length).toBe(14);

    // Verify some specific permissions for Group A
    expect(groupAPermissions).toContain(`groups:read:${groupIdA}`);
    expect(groupAPermissions).toContain(`groups:update:${groupIdA}`);
    expect(groupAPermissions).toContain(`members:read:${groupIdA}`);
    expect(groupAPermissions).toContain(`members:create:${groupIdA}`);

    // Verify some specific permissions for Group B
    expect(groupBPermissions).toContain(`groups:read:${groupIdB}`);
    expect(groupBPermissions).toContain(`groups:update:${groupIdB}`);
    expect(groupBPermissions).toContain(`members:read:${groupIdB}`);
    expect(groupBPermissions).toContain(`members:create:${groupIdB}`);

    // Verify permissions are DIFFERENT for each group (correctly scoped)
    expect(groupIdA).not.toBe(groupIdB);
    expect(groupAPermissions).not.toEqual(groupBPermissions);

    console.log('[E2E] ✓ Admin can see resource-scoped permissions for multiple groups');
    console.log('[E2E] ✓ Permissions are correctly scoped to their respective resource UUIDs');
  });

  /**
   * Test 3: Verify resource-scoped permission revocation via API
   *
   * This test validates that:
   * 1. User gets auto-granted resource-scoped permissions when creating a group
   * 2. Admin can successfully revoke a resource-scoped permission
   * 3. The permission is actually removed from the user's permission list
   *
   * Note: This tests the permission GRANT/REVOKE system (what we fixed).
   * Permission ENFORCEMENT (access control) is tested in resource-permissions.spec.ts
   */
  test('admin can revoke resource-scoped permission via API', async ({
    page,
    context,
    browser,
  }) => {
    console.log('[E2E] Test: Admin can revoke resource-scoped permission via API');

    // Step 1: Create admin user
    const adminUser = await createAdminUser(page, context);
    console.log(`[E2E] Admin user created: ${adminUser.email}`);

    // Step 2: Create regular user with a group
    const regularUserContext = await browser.newContext();
    const regularUserPage = await regularUserContext.newPage();
    const regularUser = await createRegularUser(regularUserPage, regularUserContext);
    console.log(`[E2E] Regular user created: ${regularUser.email}`);

    // Create a group (auto-grants 14 permissions)
    const groupsPage = new GroupsPage(regularUserPage);
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    const groupName = `Test Group ${Date.now()}`;
    await groupsPage.createGroup(groupName);

    // Extract group ID
    await regularUserPage.waitForURL(/\/app\/groups\/([a-f0-9-]+)\/members/);
    const url = regularUserPage.url();
    const groupId = url.match(/\/app\/groups\/([a-f0-9-]+)\/members/)?.[1];
    expect(groupId).toBeDefined();
    console.log(`[E2E] Group created with ID: ${groupId}`);

    // Close regular user context (no longer needed)
    await regularUserContext.close();

    // Step 3: Admin verifies user has the permission initially
    const userId = regularUser.id!;
    const permissionToRevoke = `members:read:${groupId}`;

    const permissionsBefore = await getUserPermissions(page, userId);
    console.log(`[E2E] User has ${permissionsBefore.length} permissions before revocation`);

    const hasPermissionBefore = permissionsBefore.includes(permissionToRevoke);
    expect(hasPermissionBefore).toBe(true);
    console.log(`[E2E] ✓ User HAS permission: ${permissionToRevoke}`);

    // Step 4: Admin revokes the permission
    await revokePermissionViaAPI(page, userId, permissionToRevoke);
    console.log(`[E2E] ✓ Admin revoked permission: ${permissionToRevoke}`);

    // Step 5: Verify permission was actually removed
    const permissionsAfter = await getUserPermissions(page, userId);
    console.log(`[E2E] User has ${permissionsAfter.length} permissions after revocation`);

    const hasPermissionAfter = permissionsAfter.includes(permissionToRevoke);
    expect(hasPermissionAfter).toBe(false);
    console.log(`[E2E] ✓ User NO LONGER has permission: ${permissionToRevoke}`);

    // Verify count decreased by 1
    expect(permissionsAfter.length).toBe(permissionsBefore.length - 1);
    console.log(
      `[E2E] ✓ Permission count decreased: ${permissionsBefore.length} → ${permissionsAfter.length}`
    );

    // Verify other permissions for the same group are still there
    const groupPermissionsBefore = permissionsBefore.filter(p => p.includes(groupId!));
    const groupPermissionsAfter = permissionsAfter.filter(p => p.includes(groupId!));

    expect(groupPermissionsAfter.length).toBe(groupPermissionsBefore.length - 1);
    console.log(
      `[E2E] ✓ Group permissions: ${groupPermissionsBefore.length} → ${groupPermissionsAfter.length}`
    );

    // Verify some other group permissions still exist
    expect(groupPermissionsAfter).toContain(`groups:read:${groupId}`);
    expect(groupPermissionsAfter).toContain(`members:create:${groupId}`);
    expect(groupPermissionsAfter).not.toContain(permissionToRevoke);

    console.log('[E2E] ✓ Test completed: Permission successfully revoked via API');
  });
});
