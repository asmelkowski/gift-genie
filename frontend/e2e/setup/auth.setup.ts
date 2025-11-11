import { test as setup } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';

const authFile = '.auth/user.json';

setup('authenticate', async ({ page }) => {
  const loginPage = new LoginPage(page);

  const testEmail = 'e2e-test-user@example.com';
  const testPassword = 'SecurePassword123!';

  // Navigate and attempt login
  console.log('[Auth Setup] Starting authentication flow...');
  await loginPage.goto();

  try {
    console.log('⚠️  Login attempt...');
    await loginPage.login(testEmail, testPassword);

    // Wait for login to complete (navigation + app ready)
    await loginPage.waitForLoginSuccess(25000);

    console.log('✅ Logged in with existing user');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    console.log('⚠️  Login failed, attempting registration...');

    // If login fails, try registration
    await page.goto('/register');
    await page.getByTestId('register-name').fill('E2E Test User');
    await page.getByTestId('register-email').fill(testEmail);
    await page.getByTestId('register-password').fill(testPassword);
    await page.getByTestId('register-submit').click();

    // After registration, page navigates to /login
    console.log('⚠️  Waiting for registration to complete...');
    await page.waitForURL('/login', { timeout: 15000 });
    console.log('⚠️  Registration successful, now logging in...');

    await loginPage.goto();
    await loginPage.login(testEmail, testPassword);

    // Wait for login to complete after registration
    await loginPage.waitForLoginSuccess(25000);

    console.log('✅ Registered and logged in new user');
  }

  // Save authentication state
  await page.context().storageState({ path: authFile });
  console.log('✅ Authentication state saved to .auth/user.json');
});
