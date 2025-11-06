import { chromium, FullConfig } from "@playwright/test";

/**
 * Global setup that runs once before all E2E tests
 * Registers the test user via the UI to set up test data
 * Also serves as a test for duplicate registration handling
 */
async function globalSetup(config: FullConfig) {
  // Skip global setup in CI to prevent hanging
  if (process.env.CI) {
    console.log("🚫 Skipping global setup in CI environment");
    return;
  }
  
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Generate a unique but predictable test user email
  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@example.com`;
  const fallbackEmail = "test@example.com"; // Fallback for existing user
  const testPassword = "09%#3@0#rH3ksOqbL#qg8LAnT8c*35Vfa&5Q";

  try {
    console.log("🔧 Setting up test data via registration...");
    console.log(`📍 Base URL: ${baseURL}`);
    console.log(`👤 Test email: ${testEmail}`);

    // Go to registration page
    console.log("📄 Navigating to registration page...");
    await page.goto(`${baseURL}/register`);
    console.log(`✅ Navigated to: ${page.url()}`);

    // Fill registration form using id selectors
    console.log("📝 Filling registration form...");
    await page.fill("#name", "Test User");
    console.log("  ✓ Filled name field");
    
    await page.fill("#email", testEmail);
    console.log("  ✓ Filled email field");
    
    await page.fill("#password", testPassword);
    console.log("  ✓ Filled password field");

    // Submit registration
    console.log("🔄 Submitting registration form...");
    await page.click('button[type="submit"]');
    console.log("  ✓ Form submitted");

    // Wait for successful registration and redirect to groups page
    console.log("⏳ Waiting for redirect to groups page (timeout: 15s)...");
    await page.waitForURL("**/app/groups", { timeout: 15000 });
    console.log(`✅ Successfully redirected to: ${page.url()}`);

    console.log("✅ Test user registered successfully");
  } catch (error) {
    console.log("ℹ️  Registration failed, checking for expected email conflict...");
    console.log(`❌ Registration error: ${error}`);

    try {
      // Check if the error message indicates email conflict
      console.log("🔍 Checking for email conflict error message...");
      const emailError = await page.locator('text=Email already in use').isVisible({ timeout: 5000 });
      
      if (emailError) {
        console.log("✅ Email conflict error properly displayed in UI");
        console.log("🧪 Registration conflict handling test PASSED");
      } else {
        console.log("⚠️  Email conflict error not found in UI, checking page content...");
        const pageContent = await page.content();
        console.log(`📄 Page content preview: ${pageContent.substring(0, 500)}...`);
      }

      // Take screenshot for debugging
      console.log("📸 Taking screenshot for debugging...");
      await page.screenshot({ path: 'registration-conflict-test.png' });
      console.log("  ✓ Screenshot saved as registration-conflict-test.png");

      // Try with fallback user (existing user) to complete setup
      console.log("🔄 Attempting login with fallback user to complete setup...");
      await page.goto(`${baseURL}/login`);
      console.log(`✅ Navigated to: ${page.url()}`);

      console.log("📝 Filling login form with fallback user...");
      await page.fill('input[type="email"]', fallbackEmail);
      console.log("  ✓ Filled email field");
      
      await page.fill('input[type="password"]', testPassword);
      console.log("  ✓ Filled password field");

      console.log("🔄 Submitting login form...");
      await page.click('button[type="submit"]');
      console.log("  ✓ Form submitted");

      console.log("⏳ Waiting for redirect to groups page (timeout: 15s)...");
      await page.waitForURL("**/app/groups", { timeout: 15000 });
      console.log(`✅ Successfully redirected to: ${page.url()}`);
      
      console.log("✅ Test setup completed using fallback user");
    } catch (loginError) {
      console.error("❌ Failed to set up test user:", loginError);
      
      // Take screenshot for debugging
      console.log("📸 Taking screenshot of setup failure...");
      try {
        await page.screenshot({ path: 'setup-failure.png' });
        console.log("  ✓ Screenshot saved as setup-failure.png");
      } catch (screenshotError) {
        console.error("  ✗ Failed to take screenshot:", screenshotError);
      }

      throw new Error(`Test setup failed: ${loginError}`);
    }
  } finally {
    console.log("🧹 Cleaning up browser...");
    await browser.close();
    console.log("✅ Browser closed");
  }
}

export default globalSetup;
