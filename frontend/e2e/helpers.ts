import { LoginPage } from './page-objects/LoginPage';
import { RegisterPage } from './page-objects/RegisterPage';
import { BrowserContext, type Page } from '@playwright/test';

const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

interface UserData {
  name: string;
  email: string;
  password: string;
  id?: string;
  role?: 'admin' | 'user';
}

const generateUser = (): UserData => {
  const randomString = generateRandomString(5);
  const username = `Test ${randomString}`;
  const email = username.toLowerCase().replace(/\s/g, '-') + '@example.com';
  const password = `SuperStrong!2${randomString}`;

  return {
    name: username,
    email,
    password,
  };
};

const registerUser = async function (page: Page, data: UserData) {
  const registerPage = new RegisterPage(page);
  await registerPage.goto();
  await registerPage.expectNameVisible();
  await registerPage.expectEmailVisible();
  await registerPage.expectPasswordVisible();
  await registerPage.expectSubmitVisible();

  // Wait for the registration request to complete successfully
  const registerPromise = page.waitForResponse(
    resp => resp.url().includes('/auth/register') && resp.status() === 201
  );

  await registerPage.register(data.name, data.email, data.password);

  await registerPromise;
  await page.waitForLoadState('networkidle');
};

/**
 * Sets up authentication state in the browser using a provided access token and user data.
 * This is the core logic used by both loginUserViaAPI and test user creation helpers.
 *
 * @param page Playwright page object
 * @param accessToken JWT access token for authorization
 * @param user User data object with id, email, name
 * @param navigationPath Optional path to navigate to (defaults to /app/groups)
 */
const setupAuthState = async function (
  page: Page,
  accessToken: string,
  user: { id: string; email: string; name: string; role?: string },
  navigationPath: string = '/app/groups'
) {
  const frontendBaseUrl = process.env.CI ? 'http://frontend:5173' : 'http://localhost:5173';

  // CRITICAL: Navigate to a page first to establish the context
  // This ensures we can set localStorage BEFORE the app initializes
  console.log('[E2E] Navigating to blank page to establish context...');
  await page.goto(frontendBaseUrl);
  await page.waitForLoadState('domcontentloaded');

  // Now set localStorage SYNCHRONOUSLY before the app bootstraps
  console.log('[E2E] Setting localStorage with auth state...');
  await page.evaluate(
    ({ token, userData }) => {
      // Set auth token (if frontend uses it separately)
      localStorage.setItem('auth_token', token);

      // Set up Zustand auth store with the actual user data
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user: {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              ...(userData.role && { role: userData.role }),
            },
            csrfToken: null, // Will be set by /auth/me call if needed
          },
          version: 0,
        })
      );
      console.log(
        '[E2E] localStorage auth state initialized:',
        localStorage.getItem('auth-storage')
      );
    },
    { token: accessToken, userData: user }
  );

  // Set up route interception to inject Authorization header on all API requests
  console.log('[E2E] Setting up route interception for Bearer token...');
  await page.route('**/api/v1/**', async route => {
    const headers = {
      ...route.request().headers(),
      Authorization: `Bearer ${accessToken}`,
    };
    console.log(`[E2E] Intercepting ${route.request().method()} ${route.request().url()}`);
    await route.continue({ headers });
  });

  // NOW navigate to the target page - localStorage is already set!
  console.log(`[E2E] Navigating to ${navigationPath}...`);
  await page.goto(`${frontendBaseUrl}${navigationPath}`);
  await page.waitForLoadState('networkidle');

  // Verify we didn't get redirected to login
  const currentUrl = page.url();
  console.log('[E2E] Final URL:', currentUrl);
  if (currentUrl.includes('/login')) {
    throw new Error('[E2E] Authentication failed: redirected to login page');
  }

  console.log('[E2E] Auth state setup complete');
};

const loginUserViaAPI = async function (page: Page, context: BrowserContext, data: UserData) {
  console.log('[E2E] Starting API-based login for CI environment');
  const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';

  // Make direct API call to login
  console.log('[E2E] Calling login API...');
  const response = await page.request.post(`${apiBaseUrl}/api/v1/auth/login`, {
    data: {
      email: data.email,
      password: data.password,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`API login failed: ${response.status()} - ${body}`);
  }

  const loginData = await response.json();
  const accessToken = loginData.access_token;
  const userData = loginData.user;
  console.log('[E2E] Login successful, got access token and user data');

  // Use the shared auth state setup helper
  await setupAuthState(page, accessToken, userData);
};

const loginUser = async function (page: Page, context: BrowserContext, data: UserData) {
  // In CI, use API-based auth to avoid cross-origin cookie issues
  if (process.env.CI) {
    await loginUserViaAPI(page, context, data);
    return;
  }

  // In local development, use form-based login (tests real user flow)
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.expectEmailVisible();
  await loginPage.expectPasswordVisible();
  await loginPage.expectSubmitVisible();
  await loginPage.login(data.email, data.password);

  // Wait for navigation to groups page
  await page.waitForURL('/app/groups', { timeout: 15000 });

  // Wait for authentication state to be established in localStorage
  await page.waitForFunction(
    () => {
      return window.localStorage.getItem('auth-storage') !== null;
    },
    { timeout: 5000 }
  );
};

/**
 * Creates a regular user (role='user') via test-only backend endpoint
 * Much simpler and faster than the old register + login flow
 *
 * @param page Playwright page object (provides request context with auth)
 * @param _context Browser context for isolated test environment (reserved for future use)
 * @returns User data including generated id from the backend
 */
const createRegularUser = async function (
  page: Page,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: BrowserContext
): Promise<UserData> {
  console.log('[E2E] Creating regular user via test endpoint...');
  const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';
  const randomString = generateRandomString(8);
  const timestamp = Date.now();

  const userData: UserData = {
    name: `Test User ${randomString}`,
    email: `e2e-user-${timestamp}-${randomString}@example.com`,
    password: `SuperStrong!2${randomString}`,
    role: 'user',
  };

  console.log(`[E2E] Calling test endpoint to create user: ${userData.email}`);
  const response = await page.request.post(`${apiBaseUrl}/api/v1/test/users`, {
    data: {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`[E2E] Failed to create test user: ${response.status()} - ${body}`);
  }

  const responseData = await response.json();
  const accessToken = responseData.access_token;
  // User data is at top level, not nested
  const createdUser = {
    id: responseData.id,
    name: responseData.name,
    email: responseData.email,
    role: responseData.role,
  };

  console.log(`[E2E] Test user created successfully: ${userData.email}`);
  console.log(`[E2E] User ID: ${createdUser.id}`);

  // Set up auth state and navigate to app
  await setupAuthState(page, accessToken, createdUser, '/app/groups');

  // Return user data with the server-generated ID
  return {
    ...userData,
    id: createdUser.id,
  };
};

/**
 * Creates an admin user (role='admin') via test-only backend endpoint
 * Much simpler than the old register + login + role update flow
 *
 * The test endpoint automatically:
 * - Creates the user with role='admin' in the database
 * - Returns a valid access token for immediate use
 * - Skips email verification (test-only feature)
 *
 * @param page Playwright page object (provides request context with auth)
 * @param _context Browser context for isolated test environment (reserved for future use)
 * @returns User data including generated id from the backend
 */
const createAdminUser = async function (
  page: Page,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: BrowserContext
): Promise<UserData> {
  console.log('[E2E] Creating admin user via test endpoint...');
  const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';
  const randomString = generateRandomString(8);
  const timestamp = Date.now();

  const userData: UserData = {
    name: `Test Admin ${randomString}`,
    email: `e2e-admin-${timestamp}-${randomString}@example.com`,
    password: `SuperStrong!2${randomString}`,
    role: 'admin',
  };

  console.log(`[E2E] Calling test endpoint to create admin: ${userData.email}`);
  const response = await page.request.post(`${apiBaseUrl}/api/v1/test/users`, {
    data: {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`[E2E] Failed to create test admin user: ${response.status()} - ${body}`);
  }

  const responseData = await response.json();
  const accessToken = responseData.access_token;
  // User data is at top level, not nested
  const createdUser = {
    id: responseData.id,
    name: responseData.name,
    email: responseData.email,
    role: responseData.role,
  };

  console.log(`[E2E] Admin user created successfully: ${userData.email}`);
  console.log(`[E2E] User ID: ${createdUser.id}`);

  // Set up auth state and navigate to app
  await setupAuthState(page, accessToken, createdUser, '/app/admin');

  // Return user data with the server-generated ID
  return {
    ...userData,
    id: createdUser.id,
  };
};

/**
 * Creates a user via test-only backend endpoint WITHOUT logging in as them
 * Useful when admin tests need to create users to manage without switching sessions
 *
 * @param page Playwright page object (provides request context)
 * @param role User role ('admin' or 'user')
 * @returns User data including generated id from the backend
 */
const createUserWithoutLogin = async function (
  page: Page,
  role: 'admin' | 'user' = 'user'
): Promise<UserData> {
  console.log(`[E2E] Creating ${role} user without login...`);
  const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';
  const randomString = generateRandomString(8);
  const timestamp = Date.now();

  const userData: UserData = {
    name: `Test ${role === 'admin' ? 'Admin' : 'User'} ${randomString}`,
    email: `e2e-${role}-${timestamp}-${randomString}@example.com`,
    password: `SuperStrong!2${randomString}`,
    role,
  };

  console.log(`[E2E] Calling test endpoint to create user: ${userData.email}`);
  const response = await page.request.post(`${apiBaseUrl}/api/v1/test/users`, {
    data: {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`[E2E] Failed to create test user: ${response.status()} - ${body}`);
  }

  const responseData = await response.json();

  console.log(`[E2E] ${role} user created successfully: ${userData.email}`);
  console.log(`[E2E] User ID: ${responseData.id}`);

  // Return user data with the server-generated ID
  // DO NOT call setupAuthState - we don't want to log in as this user
  return {
    ...userData,
    id: responseData.id,
  };
};

/**
 * Grant a specific permission to a user via the admin API
 * Requires the requesting user to be an admin
 *
 * @param page Playwright page object (provides request context with auth)
 * @param userId The target user ID to grant permission to
 * @param permissionCode The permission code to grant (e.g., 'draws:execute', 'users:manage')
 *
 * @throws Error if the API call fails with details about the failure
 */
const grantPermissionViaAPI = async function (
  page: Page,
  userId: string,
  permissionCode: string
): Promise<void> {
  console.log(`[E2E] Granting permission '${permissionCode}' to user ${userId}...`);

  const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';

  // Get the access token from localStorage to authenticate the request
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));

  if (!token) {
    throw new Error('[E2E] No access token found in localStorage');
  }

  const response = await page.request.post(
    `${apiBaseUrl}/api/v1/admin/users/${userId}/permissions`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        permission_code: permissionCode,
      },
    }
  );

  if (!response.ok()) {
    const body = await response.text();
    const statusCode = response.status();
    console.error(`[E2E] Failed to grant permission: ${statusCode} - ${body}`);
    throw new Error(
      `Failed to grant permission '${permissionCode}' to user ${userId}: ${statusCode} - ${body}`
    );
  }

  console.log(`[E2E] Successfully granted permission '${permissionCode}' to user ${userId}`);
};

/**
 * Revoke a specific permission from a user via the admin API
 * Requires the requesting user to be an admin
 *
 * Note: This endpoint is idempotent - revoking a non-existent permission returns 204
 *
 * @param page Playwright page object (provides request context with auth)
 * @param userId The target user ID to revoke permission from
 * @param permissionCode The permission code to revoke
 *
 * @throws Error if the API call fails with details about the failure
 */
const revokePermissionViaAPI = async function (
  page: Page,
  userId: string,
  permissionCode: string
): Promise<void> {
  console.log(`[E2E] Revoking permission '${permissionCode}' from user ${userId}...`);

  const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';

  // Get the access token from localStorage to authenticate the request
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));

  if (!token) {
    throw new Error('[E2E] No access token found in localStorage');
  }

  const response = await page.request.delete(
    `${apiBaseUrl}/api/v1/admin/users/${userId}/permissions/${permissionCode}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok()) {
    const body = await response.text();
    const statusCode = response.status();
    console.error(`[E2E] Failed to revoke permission: ${statusCode} - ${body}`);
    throw new Error(
      `Failed to revoke permission '${permissionCode}' from user ${userId}: ${statusCode} - ${body}`
    );
  }

  console.log(`[E2E] Successfully revoked permission '${permissionCode}' from user ${userId}`);
};

/**
 * Get all permissions currently granted to a user
 * Requires the requesting user to be an admin
 *
 * @param page Playwright page object (provides request context with auth)
 * @param userId The target user ID to get permissions for
 *
 * @returns Array of permission codes (e.g., ['draws:execute', 'users:manage'])
 *
 * @throws Error if the API call fails with details about the failure
 */
const getUserPermissions = async function (page: Page, userId: string): Promise<string[]> {
  console.log(`[E2E] Fetching permissions for user ${userId}...`);

  const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';

  // Get the access token from localStorage to authenticate the request
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));

  if (!token) {
    throw new Error('[E2E] No access token found in localStorage');
  }

  const response = await page.request.get(
    `${apiBaseUrl}/api/v1/admin/users/${userId}/permissions`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok()) {
    const body = await response.text();
    const statusCode = response.status();
    console.error(`[E2E] Failed to fetch permissions: ${statusCode} - ${body}`);
    throw new Error(`Failed to fetch permissions for user ${userId}: ${statusCode} - ${body}`);
  }

  const permissions = await response.json();
  const permissionCodes = permissions.map((p: { code: string }) => p.code);

  console.log(`[E2E] User ${userId} has permissions: ${permissionCodes.join(', ')}`);
  return permissionCodes;
};

/**
 * Cleanup test users created via the test endpoint
 * Useful for test teardown to clean up test data
 *
 * @param page Playwright page object (provides request context with auth)
 * @param emailPattern SQL LIKE pattern to match emails (defaults to 'e2e-%')
 * @returns Number of users deleted
 *
 * @throws Error if the API call fails with details about the failure
 */
const cleanupTestUsers = async function (
  page: Page,
  emailPattern: string = 'e2e-%'
): Promise<number> {
  console.log(`[E2E] Cleaning up test users matching pattern: ${emailPattern}...`);

  const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';

  // Get the access token from localStorage to authenticate the request
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));

  if (!token) {
    throw new Error('[E2E] No access token found in localStorage');
  }

  const response = await page.request.delete(`${apiBaseUrl}/api/v1/test/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      email_pattern: emailPattern,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    const statusCode = response.status();
    console.error(`[E2E] Failed to cleanup test users: ${statusCode} - ${body}`);
    throw new Error(
      `Failed to cleanup test users with pattern '${emailPattern}': ${statusCode} - ${body}`
    );
  }

  const result = await response.json();
  const deletedCount = result.deleted_count || 0;

  console.log(`[E2E] Successfully deleted ${deletedCount} test users`);
  return deletedCount;
};

export {
  registerUser,
  loginUser,
  loginUserViaAPI,
  setupAuthState,
  generateRandomString,
  generateUser,
  createRegularUser,
  createAdminUser,
  createUserWithoutLogin,
  grantPermissionViaAPI,
  revokePermissionViaAPI,
  getUserPermissions,
  cleanupTestUsers,
  type UserData,
};
