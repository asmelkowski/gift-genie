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
   * Test 2: Admin can revoke resource-scoped permission and user loses access
   *
   * This test validates that when an admin revokes a resource-scoped permission,
   * the user actually loses the ability to perform that action.
   *
   * Workflow:
   * 1. Create admin user
   * 2. Create regular user and group (auto-grants permissions)
   * 3. Verify regular user CAN access group members page
   * 4. Admin revokes members:read:UUID permission
   * 5. Verify regular user can NO LONGER access group members page
   * 6. Verify appropriate "Access Denied" message is shown
   */
  test('admin can revoke resource-scoped permission and user loses access', async ({
    page,
    context,
    browser,
  }) => {
    console.log('[E2E] Test: Admin can revoke resource-scoped permission');

    // Step 1: Create admin user
    const adminUser = await createAdminUser(page, context);
    console.log(`[E2E] Admin user created: ${adminUser.email}`);

    // Step 2: Create regular user and group
    const regularUserContext = await browser.newContext();
    const regularUserPage = await regularUserContext.newPage();
    const regularUser = await createRegularUser(regularUserPage, regularUserContext);
    console.log(`[E2E] Regular user created: ${regularUser.email}`);

    const groupsPage = new GroupsPage(regularUserPage);
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    const groupName = `Test Group ${Date.now()}`;
    await groupsPage.createGroup(groupName);
    console.log(`[E2E] Group created: ${groupName}`);

    // Capture group ID
    await regularUserPage.waitForURL(/\/app\/groups\/([a-f0-9-]+)\/members/);
    const url = regularUserPage.url();
    const groupIdMatch = url.match(/\/app\/groups\/([a-f0-9-]+)\/members/);
    const groupId = groupIdMatch?.[1];
    expect(groupId).toBeDefined();
    console.log(`[E2E] Group ID captured: ${groupId}`);

    // Step 3: Verify regular user CAN access members page
    const membersUrl = `/app/groups/${groupId}/members`;
    await regularUserPage.goto(membersUrl);
    await regularUserPage.waitForLoadState('networkidle');

    // Check that members page is accessible
    const pageHeadings = await regularUserPage.locator('h1, h2').allTextContents();
    const hasMembersHeading = pageHeadings.some(text => /members/i.test(text));
    expect(hasMembersHeading).toBe(true);
    console.log('[E2E] ✓ User has access to group members page');

    // Step 4: Admin revokes the members:read permission
    const adminDashboard = new AdminDashboardPage(page);
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();

    await adminDashboard.searchUsers(regularUser.email);
    await adminDashboard.expectUserInTable(regularUser.email);
    console.log('[E2E] Found user in admin dashboard');

    const userId = regularUser.id!;
    const permissionToRevoke = `members:read:${groupId}`;

    // Revoke via API to ensure it works
    await revokePermissionViaAPI(page, userId, permissionToRevoke);
    console.log(`[E2E] ✓ Admin revoked permission: ${permissionToRevoke}`);

    // Step 5-6: Verify regular user can NO LONGER access members page
    // Navigate again to trigger permission check
    await regularUserPage.goto(membersUrl);
    await regularUserPage.waitForLoadState('networkidle');

    // Should see Access Denied message
    const accessDeniedVisible = await regularUserPage
      .getByText(/Access Denied|You don't have permission|Not authorized/i)
      .isVisible()
      .catch(() => false);

    expect(accessDeniedVisible).toBe(true);
    console.log('[E2E] ✓ Access denied message displayed');

    // Verify we're not seeing the members table or normal content
    const membersTableVisible = await regularUserPage
      .getByTestId('members-table')
      .isVisible()
      .catch(() => false);

    expect(membersTableVisible).toBe(false);
    console.log('[E2E] ✓ Members table not visible (access denied)');

    // Clean up
    await regularUserContext.close();
    console.log('[E2E] Test completed and resources cleaned up');

    console.log('[E2E] ✓ Test passed: Admin can revoke resource-scoped permission');
  });

  /**
   * Test 3: User can still access other groups after permission revoked for one group
   *
   * This test validates that revoking a resource-scoped permission for one group
   * doesn't affect the user's access to other groups.
   *
   * Workflow:
   * 1. Create admin user
   * 2. Create regular user
   * 3. Regular user creates two groups (Group A and Group B)
   * 4. Admin revokes members:read permission for Group A only
   * 5. Verify user CAN'T access Group A members
   * 6. Verify user CAN access Group B members
   */
  test('user can access other groups after permission revoked for one group', async ({
    page,
    context,
    browser,
  }) => {
    console.log('[E2E] Test: User can access other groups after permission revoked for one');

    // Step 1: Create admin user
    await createAdminUser(page, context);
    console.log('[E2E] Admin user created');

    // Step 2-3: Create regular user and two groups
    const regularUserContext = await browser.newContext();
    const regularUserPage = await regularUserContext.newPage();
    const regularUser = await createRegularUser(regularUserPage, regularUserContext);
    console.log(`[E2E] Regular user created: ${regularUser.email}`);

    const groupsPage = new GroupsPage(regularUserPage);
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    // Create Group A
    const groupAName = `Group A ${Date.now()}`;
    await groupsPage.createGroup(groupAName);
    await regularUserPage.waitForURL(/\/app\/groups\/([a-f0-9-]+)\/members/);

    let url = regularUserPage.url();
    const groupAId = url.match(/\/app\/groups\/([a-f0-9-]+)\/members/)?.[1];
    expect(groupAId).toBeDefined();
    console.log(`[E2E] Group A created: ${groupAId}`);

    // Go back to groups list and create Group B
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    const groupBName = `Group B ${Date.now()}`;
    await groupsPage.createGroup(groupBName);
    await regularUserPage.waitForURL(/\/app\/groups\/([a-f0-9-]+)\/members/);

    url = regularUserPage.url();
    const groupBId = url.match(/\/app\/groups\/([a-f0-9-]+)\/members/)?.[1];
    expect(groupBId).toBeDefined();
    expect(groupBId).not.toBe(groupAId); // Ensure different groups
    console.log(`[E2E] Group B created: ${groupBId}`);

    // Verify user can access both groups
    await regularUserPage.goto(`/app/groups/${groupAId}/members`);
    await regularUserPage.waitForLoadState('networkidle');
    expect(
      await regularUserPage
        .locator('h1, h2')
        .allTextContents()
        .then(texts => texts.some(t => /members/i.test(t)))
    ).toBe(true);
    console.log('[E2E] ✓ User can access Group A members');

    await regularUserPage.goto(`/app/groups/${groupBId}/members`);
    await regularUserPage.waitForLoadState('networkidle');
    expect(
      await regularUserPage
        .locator('h1, h2')
        .allTextContents()
        .then(texts => texts.some(t => /members/i.test(t)))
    ).toBe(true);
    console.log('[E2E] ✓ User can access Group B members');

    // Step 4: Admin revokes permission for Group A only
    const adminDashboard = new AdminDashboardPage(page);
    await adminDashboard.goto();
    await adminDashboard.waitForLoad();

    await adminDashboard.searchUsers(regularUser.email);
    const userId = regularUser.id!;

    const permissionToRevoke = `members:read:${groupAId}`;
    await revokePermissionViaAPI(page, userId, permissionToRevoke);
    console.log(`[E2E] Admin revoked: ${permissionToRevoke}`);

    // Step 5-6: Verify access control is scoped to the specific group
    // User should NOT be able to access Group A
    await regularUserPage.goto(`/app/groups/${groupAId}/members`);
    await regularUserPage.waitForLoadState('networkidle');

    const accessDeniedGroupA = await regularUserPage
      .getByText(/Access Denied|You don't have permission|Not authorized/i)
      .isVisible()
      .catch(() => false);

    expect(accessDeniedGroupA).toBe(true);
    console.log('[E2E] ✓ User cannot access Group A members (permission revoked)');

    // User SHOULD still be able to access Group B
    await regularUserPage.goto(`/app/groups/${groupBId}/members`);
    await regularUserPage.waitForLoadState('networkidle');

    const canAccessGroupB = await regularUserPage
      .locator('h1, h2')
      .allTextContents()
      .then(texts => texts.some(t => /members/i.test(t)))
      .catch(() => false);

    expect(canAccessGroupB).toBe(true);
    console.log('[E2E] ✓ User can still access Group B members');

    // Clean up
    await regularUserContext.close();
    console.log('[E2E] Test completed and resources cleaned up');

    console.log(
      '[E2E] ✓ Test passed: User can access other groups after permission revoked for one'
    );
  });
});
