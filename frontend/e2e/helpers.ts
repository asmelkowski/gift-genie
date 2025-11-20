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

const loginUserViaAPI = async function (page: Page, context: BrowserContext, data: UserData) {
  console.log('[E2E] Starting API-based login for CI environment');
  const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';
  const frontendBaseUrl = process.env.CI ? 'http://frontend:5173' : 'http://localhost:5173';

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
  console.log(`[E2E] Access Token (first 10 chars): ${accessToken?.substring(0, 10)}...`);

  // CRITICAL: Navigate to a page first to establish the context
  // This ensures we can set localStorage BEFORE the app initializes
  console.log('[E2E] Navigating to blank page to establish context...');
  await page.goto(frontendBaseUrl);
  await page.waitForLoadState('domcontentloaded');

  // Now set localStorage SYNCHRONOUSLY before the app bootstraps
  console.log('[E2E] Setting localStorage with auth state...');
  await page.evaluate(
    ({ token, user }) => {
      // Set auth token (if frontend uses it separately)
      localStorage.setItem('auth_token', token);

      // Set up Zustand auth store with the actual user data from login response
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
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
    { token: accessToken, user: userData }
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
  console.log('[E2E] Navigating to /app/groups...');
  await page.goto(`${frontendBaseUrl}/app/groups`);
  await page.waitForLoadState('networkidle');

  // Verify we didn't get redirected to login
  const currentUrl = page.url();
  console.log('[E2E] Final URL:', currentUrl);
  if (currentUrl.includes('/login')) {
    throw new Error('[E2E] Authentication failed: redirected to login page');
  }

  console.log('[E2E] API-based login complete');
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

export {
  registerUser,
  loginUser,
  loginUserViaAPI,
  generateRandomString,
  generateUser,
  type UserData,
};
