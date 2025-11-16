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
  await registerPage.register(data.name, data.email, data.password);
  await page.waitForLoadState('networkidle');
};

const loginUserViaAPI = async function (page: Page, context: BrowserContext, data: UserData) {
  const apiBaseUrl = process.env.CI ? 'http://backend:8000' : 'http://localhost:8000';

  // Make direct API call to login
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

  // Set up route interception to inject Authorization header on all API requests
  await page.route('**/api/v1/**', async route => {
    const headers = {
      ...route.request().headers(),
      Authorization: `Bearer ${accessToken}`,
    };
    await route.continue({ headers });
  });

  // Store token in localStorage for the frontend app to use
  await page.addInitScript(token => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          user: null, // Will be populated by frontend
          isAuthenticated: true,
          csrfToken: null,
        },
        version: 0,
      })
    );
  }, accessToken);

  // Navigate to the groups page
  await page.goto('/app/groups');
  await page.waitForLoadState('networkidle');
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
