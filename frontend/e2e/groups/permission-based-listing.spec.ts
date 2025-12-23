import { test, expect, type Page } from '@playwright/test';
import {
  createRegularUser,
  createAdminUser,
  createUserWithoutLogin,
  grantPermissionViaAPI,
  revokePermissionViaAPI,
} from '../helpers';
import { GroupsPage } from '../page-objects/GroupsPage';

/**
 * Helper function to create a group via the API
 * Requires the requesting user to be authenticated
 *
 * @param page Playwright page object (provides request context with auth)
 * @param groupName Name of the group to create
 * @returns Object containing group id and name
 */
const createGroupViaAPI = async (
  page: Page,
  groupName: string
): Promise<{ id: string; name: string }> => {
  console.log(`[E2E] Creating group via API: ${groupName}`);

  const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';

  // Get the access token from localStorage
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));

  if (!token) {
    throw new Error('[E2E] No access token found in localStorage');
  }

  const response = await page.request.post(`${apiBaseUrl}/api/v1/groups`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      name: groupName,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to create group: ${response.status()} - ${body}`);
  }

  const group = await response.json();
  console.log(`[E2E] Group created successfully with ID: ${group.id}`);
  return { id: group.id, name: group.name };
};

test.describe('Permission-Based Group Listing', () => {
  let groupsPage: GroupsPage;

  test.beforeEach(async ({ page }) => {
    groupsPage = new GroupsPage(page);
  });

  test('user sees own created groups', async ({ page, context }) => {
    console.log('[Test] Starting: user sees own created groups');

    // 1. Create regular user
    const user = await createRegularUser(page, context);
    console.log(`[Test] Created user: ${user.id}`);

    // 2. Create a group via UI
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    const groupName = `My Group ${Date.now()}`;
    console.log(`[Test] Creating group: ${groupName}`);
    await groupsPage.createGroup(groupName);

    // 3. Navigate back to groups list and verify group appears
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    console.log(`[Test] Verifying group appears in list`);
    await expect(page.getByText(groupName).first()).toBeVisible({
      timeout: 5000,
    });

    console.log('[Test] ✓ User sees own created groups');
  });

  test("user doesn't see other users' groups by default", async ({ page, context, browser }) => {
    console.log('[Test] Starting: user does not see other users groups by default');

    // 1. Create User A and create a group
    const userA = await createRegularUser(page, context);
    console.log(`[Test] Created User A: ${userA.id}`);

    const groupName = `User A Private Group ${Date.now()}`;
    console.log(`[Test] User A creating group: ${groupName}`);
    await groupsPage.goto();
    await groupsPage.waitForLoad();
    await groupsPage.createGroup(groupName);

    // 2. Create User B in a separate context
    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const userB = await createRegularUser(userBPage, userBContext);
    console.log(`[Test] Created User B: ${userB.id}`);

    // 3. User B navigates to groups list
    const userBGroupsPage = new GroupsPage(userBPage);
    await userBGroupsPage.goto();
    await userBGroupsPage.waitForLoad();

    console.log(`[Test] User B checking if they see User A's group (should NOT)`);

    // Verify User A's group is NOT visible
    await expect(userBPage.getByText(groupName)).not.toBeVisible();

    // Verify empty state is shown instead
    await expect(userBPage.getByText(/No groups yet/i)).toBeVisible();

    console.log('[Test] ✓ User does not see other users groups by default');

    // Cleanup
    await userBContext.close();
  });

  test('user sees group after being granted permission', async ({ page, context, browser }) => {
    console.log('[Test] Starting: user sees group after being granted permission');

    // 1. Create admin user (for granting permissions)
    const admin = await createAdminUser(page, context);
    console.log(`[Test] Created admin user: ${admin.id}`);

    // 2. Create User A without logging in (via API)
    const userA = await createUserWithoutLogin(page, 'user');
    console.log(`[Test] Created User A (not logged in): ${userA.id}`);

    // 3. Create a group as User A (need to login temporarily)
    const userAContext = await browser.newContext();
    const userAPage = await userAContext.newPage();
    // Setup auth state for User A to create a group
    const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';
    const userALoginResponse = await userAPage.request.post(`${apiBaseUrl}/api/v1/auth/login`, {
      data: {
        email: userA.email,
        password: userA.password,
      },
    });
    if (!userALoginResponse.ok()) {
      throw new Error('Failed to login User A');
    }
    const userALoginData = await userALoginResponse.json();
    const userAToken = userALoginData.access_token;

    // Set auth state in User A's page
    const frontendBaseUrl = process.env.CI ? 'http://frontend:5173' : 'http://localhost:5173';
    await userAPage.goto(frontendBaseUrl);
    await userAPage.waitForLoadState('domcontentloaded');
    await userAPage.evaluate(
      ({ token, userData }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem(
          'auth-storage',
          JSON.stringify({
            state: {
              user: {
                id: userData.id,
                email: userData.email,
                name: userData.name,
              },
            },
            version: 0,
          })
        );
      },
      { token: userAToken, userData: userA }
    );

    // Create group as User A
    const groupName = `User A Group ${Date.now()}`;
    console.log(`[Test] User A creating group: ${groupName}`);
    const group = await createGroupViaAPI(userAPage, groupName);
    console.log(`[Test] Group created with ID: ${group.id}`);

    await userAContext.close();

    // 4. Create User B in separate context
    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const userB = await createRegularUser(userBPage, userBContext);
    console.log(`[Test] Created User B: ${userB.id}`);

    // 5. User B navigates to groups list - should see empty state
    const userBGroupsPage = new GroupsPage(userBPage);
    await userBGroupsPage.goto();
    await userBGroupsPage.waitForLoad();

    console.log(`[Test] Verifying User B sees empty state initially`);
    await expect(userBPage.getByText(/No groups yet/i)).toBeVisible();
    await expect(userBPage.getByText(groupName)).not.toBeVisible();

    // 6. Admin grants permission to User B
    console.log(`[Test] Admin granting groups:read:${group.id} permission to User B`);
    await grantPermissionViaAPI(page, userB.id, `groups:read:${group.id}`);

    // 7. User B reloads page and should now see the group
    console.log(`[Test] User B reloading groups page`);
    await userBPage.reload();
    await userBPage.waitForLoadState('networkidle');
    await userBGroupsPage.waitForLoad();

    console.log(`[Test] Verifying User B now sees User A's group`);
    await expect(userBPage.getByText(groupName).first()).toBeVisible({
      timeout: 5000,
    });

    console.log('[Test] ✓ User sees group after being granted permission');

    // Cleanup
    await userBContext.close();
  });

  test('user can access group after being granted permission', async ({
    page,
    context,
    browser,
  }) => {
    console.log('[Test] Starting: user can access group after being granted permission');

    // 1. Create admin user
    const admin = await createAdminUser(page, context);
    console.log(`[Test] Created admin user: ${admin.id}`);

    // 2. Create User A and group via API
    const userA = await createUserWithoutLogin(page, 'user');
    console.log(`[Test] Created User A: ${userA.id}`);

    // Login as User A temporarily to create a group
    const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';
    const userAContext = await browser.newContext();
    const userAPage = await userAContext.newPage();
    const userALoginResponse = await userAPage.request.post(`${apiBaseUrl}/api/v1/auth/login`, {
      data: {
        email: userA.email,
        password: userA.password,
      },
    });
    const userALoginData = await userALoginResponse.json();
    const userAToken = userALoginData.access_token;

    const frontendBaseUrl = process.env.CI ? 'http://frontend:5173' : 'http://localhost:5173';
    await userAPage.goto(frontendBaseUrl);
    await userAPage.waitForLoadState('domcontentloaded');
    await userAPage.evaluate(
      ({ token, userData }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem(
          'auth-storage',
          JSON.stringify({
            state: {
              user: {
                id: userData.id,
                email: userData.email,
                name: userData.name,
              },
            },
            version: 0,
          })
        );
      },
      { token: userAToken, userData: userA }
    );

    const groupName = `Shared Group ${Date.now()}`;
    console.log(`[Test] User A creating group: ${groupName}`);
    const group = await createGroupViaAPI(userAPage, groupName);

    await userAContext.close();

    // 3. Create User B
    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const userB = await createRegularUser(userBPage, userBContext);
    console.log(`[Test] Created User B: ${userB.id}`);

    // 4. Admin grants permissions (groups:read:group_id to see it in list, members:read to access it)
    console.log(
      `[Test] Admin granting groups:read:${group.id} and members:read permissions to User B`
    );
    await grantPermissionViaAPI(page, userB.id, `groups:read:${group.id}`);
    await grantPermissionViaAPI(page, userB.id, 'members:read');

    // 5. User B navigates to groups list
    const userBGroupsPage = new GroupsPage(userBPage);
    await userBGroupsPage.goto();
    await userBGroupsPage.waitForLoad();

    // 6. User B clicks on the group
    console.log(`[Test] User B clicking on group: ${groupName}`);
    const groupLink = userBPage.getByText(groupName).first();
    await expect(groupLink).toBeVisible();
    await groupLink.click();

    // Wait for navigation to group detail page
    await userBPage.waitForURL(/\/app\/groups\/[a-f0-9-]+\/?$/, {
      timeout: 5000,
    });

    // 7. Wait for group details page to load
    console.log(`[Test] Verifying User B is on group detail page`);
    await userBPage.waitForLoadState('networkidle');

    // Verify we see the group details page header
    const groupDetailsHeader = userBPage.getByRole('heading', { name: /Group Details/i });
    await expect(groupDetailsHeader).toBeVisible({ timeout: 5000 });

    // 8. Click the "View Members" button to navigate to members page
    console.log(`[Test] User B clicking View Members button`);
    const viewMembersButton = userBPage.getByRole('button', { name: /View Members/i });
    await expect(viewMembersButton).toBeVisible();
    await viewMembersButton.click();

    // Wait for navigation to members page
    await userBPage.waitForURL(/\/app\/groups\/[a-f0-9-]+\/members/, {
      timeout: 5000,
    });

    // 9. Verify User B is on members page (not Access Denied)
    console.log(`[Test] Verifying User B is on members page`);
    await userBPage.waitForLoadState('networkidle');

    // Check that we're not on an error page
    const accessDeniedText = await userBPage
      .getByText('Access Denied')
      .isVisible()
      .catch(() => false);
    expect(accessDeniedText).toBe(false);

    // Verify we see members page content
    const memberHeader = userBPage.locator('h1, h2').filter({ hasText: /Members/i });
    await expect(memberHeader).toBeVisible({ timeout: 5000 });

    console.log('[Test] ✓ User can access group after being granted permission');

    // Cleanup
    await userBContext.close();
  });

  test('admin sees all groups', async ({ page, context, browser }) => {
    console.log('[Test] Starting: admin sees all groups');

    const adminGroupsPage = new GroupsPage(page);

    // 1. Create admin user
    const admin = await createAdminUser(page, context);
    console.log(`[Test] Created admin user: ${admin.id}`);

    // 2. Create User A and their group
    const userAContext = await browser.newContext();
    const userAPage = await userAContext.newPage();
    const userA = await createRegularUser(userAPage, userAContext);
    console.log(`[Test] Created User A: ${userA.id}`);

    const groupAName = `User A Group ${Date.now()}`;
    console.log(`[Test] User A creating group: ${groupAName}`);
    const userAGroupsPage = new GroupsPage(userAPage);
    await userAGroupsPage.goto();
    await userAGroupsPage.waitForLoad();
    await userAGroupsPage.createGroup(groupAName);

    await userAContext.close();

    // 3. Create User B and their group
    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const userB = await createRegularUser(userBPage, userBContext);
    console.log(`[Test] Created User B: ${userB.id}`);

    const groupBName = `User B Group ${Date.now()}`;
    console.log(`[Test] User B creating group: ${groupBName}`);
    const userBGroupsPage = new GroupsPage(userBPage);
    await userBGroupsPage.goto();
    await userBGroupsPage.waitForLoad();
    await userBGroupsPage.createGroup(groupBName);

    await userBContext.close();

    // 4. Admin navigates to groups list
    console.log(`[Test] Admin navigating to groups list`);
    await adminGroupsPage.goto();
    await adminGroupsPage.waitForLoad();

    // 5. Search for User A's group specifically
    console.log(`[Test] Searching for User A's group: ${groupAName}`);
    const searchInput = page.getByPlaceholder(/Search groups/i);
    await searchInput.fill(groupAName);
    await page.waitForLoadState('networkidle');

    // Verify User A's group appears in search results
    await expect(page.getByText(groupAName).first()).toBeVisible({
      timeout: 5000,
    });
    console.log(`[Test] ✓ Found User A's group in search results`);

    // 6. Clear search and search for User B's group
    console.log(`[Test] Searching for User B's group: ${groupBName}`);
    await searchInput.clear();
    await searchInput.fill(groupBName);
    await page.waitForLoadState('networkidle');

    // Verify User B's group appears in search results
    await expect(page.getByText(groupBName).first()).toBeVisible({
      timeout: 5000,
    });
    console.log(`[Test] ✓ Found User B's group in search results`);

    console.log('[Test] ✓ Admin sees all groups');
  });

  test('revoking permission removes group from list', async ({ page, context, browser }) => {
    console.log('[Test] Starting: revoking permission removes group from list');

    // 1. Create admin user
    const admin = await createAdminUser(page, context);
    console.log(`[Test] Created admin user: ${admin.id}`);

    // 2. Create User A and group
    const userA = await createUserWithoutLogin(page, 'user');
    console.log(`[Test] Created User A: ${userA.id}`);

    const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';
    const userAContext = await browser.newContext();
    const userAPage = await userAContext.newPage();
    const userALoginResponse = await userAPage.request.post(`${apiBaseUrl}/api/v1/auth/login`, {
      data: {
        email: userA.email,
        password: userA.password,
      },
    });
    const userALoginData = await userALoginResponse.json();
    const userAToken = userALoginData.access_token;

    const frontendBaseUrl = process.env.CI ? 'http://frontend:5173' : 'http://localhost:5173';
    await userAPage.goto(frontendBaseUrl);
    await userAPage.waitForLoadState('domcontentloaded');
    await userAPage.evaluate(
      ({ token, userData }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem(
          'auth-storage',
          JSON.stringify({
            state: {
              user: {
                id: userData.id,
                email: userData.email,
                name: userData.name,
              },
            },
            version: 0,
          })
        );
      },
      { token: userAToken, userData: userA }
    );

    const groupName = `Revoke Test Group ${Date.now()}`;
    console.log(`[Test] User A creating group: ${groupName}`);
    const group = await createGroupViaAPI(userAPage, groupName);

    await userAContext.close();

    // 3. Create User B
    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const userB = await createRegularUser(userBPage, userBContext);
    console.log(`[Test] Created User B: ${userB.id}`);

    // 4. Admin grants permission
    console.log(`[Test] Admin granting groups:read:${group.id} permission to User B`);
    await grantPermissionViaAPI(page, userB.id, `groups:read:${group.id}`);

    // 5. User B navigates to groups and sees the group
    const userBGroupsPage = new GroupsPage(userBPage);
    await userBGroupsPage.goto();
    await userBGroupsPage.waitForLoad();

    console.log(`[Test] Verifying User B sees the group after permission granted`);
    await expect(userBPage.getByText(groupName).first()).toBeVisible({
      timeout: 5000,
    });

    // 6. Admin revokes permission
    console.log(`[Test] Admin revoking groups:read:${group.id} permission from User B`);
    await revokePermissionViaAPI(page, userB.id, `groups:read:${group.id}`);

    // 7. User B reloads page - group should disappear
    console.log(`[Test] User B reloading groups page`);
    await userBPage.reload();
    await userBPage.waitForLoadState('networkidle');
    await userBGroupsPage.waitForLoad();

    console.log(`[Test] Verifying group is no longer visible after permission revoked`);
    await expect(userBPage.getByText(groupName)).not.toBeVisible();

    // Verify empty state is shown
    await expect(userBPage.getByText(/No groups yet/i)).toBeVisible();

    console.log('[Test] ✓ Revoking permission removes group from list');

    // Cleanup
    await userBContext.close();
  });
});
