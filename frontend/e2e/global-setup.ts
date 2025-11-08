import { chromium, FullConfig } from '@playwright/test';
import { mkdir } from 'fs/promises';

/**
 * Global setup that runs once before all E2E tests
 * Registers the test user via the UI to set up test data
 * Also serves as a smoke test for registration and login flows
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const isCI = !!process.env.CI;

  // Ensure screenshot directory exists
  const screenshotDir = 'test-results/screenshots';
  try {
    await mkdir(screenshotDir, { recursive: true });
    console.log(`   📁 Screenshot directory ensured: ${screenshotDir}`);
  } catch (error) {
    console.warn(`   ⚠️  Could not create screenshot directory: ${error}`);
  }

  console.log('='.repeat(80));
  console.log('🚀 Starting E2E Global Setup');
  console.log('='.repeat(80));
  console.log(`📍 Environment: ${isCI ? 'CI' : 'Local'}`);
  console.log(`📍 Base URL: ${baseURL}`);
  console.log(`📍 Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  // Launch browser - it will handle connectivity checks naturally
  console.log('\n🔍 Launching browser for registration/login test...');

  const browser = await chromium.launch({
    args: isCI ? ['--no-sandbox', '--disable-dev-shm-usage'] : undefined,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Test credentials
  const timestamp = Date.now();
  const testEmail = isCI ? 'test@example.com' : `test-${timestamp}@example.com`;
  const testPassword = '09%#3@0#rH3ksOqbL#qg8LAnT8c*35Vfa&5Q';

  try {
    console.log(`   👤 Test email: ${testEmail}`);
    console.log(`   🔐 Test password: ${testPassword.substring(0, 4)}...`);

    // Navigate to registration page - this will naturally test connectivity
    console.log('\n   📄 Navigating to registration page...');
    await page.goto(`${baseURL}/register`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    console.log(`   ✅ Navigation successful: ${page.url()}`);
    console.log(`   ✅ Frontend is accessible and responding`);

    // Fill registration form
    console.log('\n   📝 Filling registration form...');
    await page.fill('#name', 'Test User', { timeout: 15000 });
    console.log('      ✓ Name filled');

    await page.fill('#email', testEmail, { timeout: 15000 });
    console.log('      ✓ Email filled');

    await page.fill('#password', testPassword, { timeout: 15000 });
    console.log('      ✓ Password filled');

    // Submit registration
    console.log('\n   🔄 Submitting registration form...');
    await page.click('button[type="submit"]', { timeout: 15000 });
    console.log('      ✓ Form submitted');

    // Wait for successful registration and redirect
    console.log('\n   ⏳ Waiting for redirect to groups page...');
    try {
      await page.waitForURL('**/app/groups', { timeout: 30000 });
      console.log(`   ✅ Successfully registered and redirected to: ${page.url()}`);
      console.log(`   ✅ Backend API is working (registration succeeded)`);

      // Save authentication state for reuse in tests
      await context.storageState({ path: 'playwright/.auth/user.json' });
      console.log('   ✅ Authentication state saved');
    } catch (redirectError) {
      // Check if user already exists (expected in CI on subsequent runs)
      console.log('\n   ℹ️  Registration redirect timeout, checking for existing user...');

      const emailError = await page
        .locator('text=Email already in use')
        .isVisible({ timeout: 5000 });

      if (emailError) {
        console.log('   ✅ Email conflict detected (user already exists)');
        console.log('   🔄 Attempting login with existing user...');

        // Navigate to login page
        await page.goto(`${baseURL}/login`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        console.log(`   ✅ Navigated to login page: ${page.url()}`);

        // Fill login form
        await page.fill('input[type="email"]', testEmail, { timeout: 15000 });
        await page.fill('input[type="password"]', testPassword, { timeout: 15000 });
        console.log('   ✓ Login form filled');

        // Submit login
        await page.click('button[type="submit"]', { timeout: 15000 });
        console.log('   ✓ Login form submitted');

        // Wait for redirect after login
        await page.waitForURL('**/app/groups', { timeout: 30000 });
        console.log(`   ✅ Successfully logged in and redirected to: ${page.url()}`);
        console.log(`   ✅ Backend API is working (login succeeded)`);

        // Save authentication state
        await context.storageState({ path: 'playwright/.auth/user.json' });
        console.log('   ✅ Authentication state saved');
      } else {
        // Take screenshot for debugging
        const screenshotPath = `${screenshotDir}/setup-failure.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.error('   ❌ Registration failed with unexpected error');
        console.error(`   📸 Screenshot saved to: ${screenshotPath}`);
        throw redirectError;
      }
    }

    console.log('\n✅ Registration & Login test passed');
    console.log('✅ Frontend connectivity verified');
    console.log('✅ Backend API connectivity verified');
  } catch (error) {
    console.error('\n❌ Global setup failed during registration/login:');
    console.error(error);

    // Collect debugging information
    console.log('\n📋 Debug Information:');
    console.log(`   Current URL: ${page.url()}`);
    console.log(`   Page title: ${await page.title().catch(() => 'N/A')}`);

    // Take screenshot
    try {
      const screenshotPath = `${screenshotDir}/setup-error.png`;
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      console.log(`   📸 Screenshot saved to: ${screenshotPath}`);
    } catch (screenshotError) {
      console.error('   ✗ Failed to capture screenshot:', screenshotError);
    }

    throw error;
  } finally {
    await browser.close();
    console.log('\n🧹 Browser closed');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Global Setup Complete');
  console.log('='.repeat(80));
}

export default globalSetup;
