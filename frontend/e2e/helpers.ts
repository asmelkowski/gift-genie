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

const loginUser = async function (page: Page, context: BrowserContext, data: UserData) {
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
  const cookies = await context.cookies();
  context.addCookies(cookies);
};

export { registerUser, loginUser, generateRandomString, generateUser, type UserData };
