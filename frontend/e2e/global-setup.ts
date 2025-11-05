import { chromium, FullConfig } from "@playwright/test";

/**
 * Global setup that runs once before all E2E tests
 * Registers the test user via the UI to set up test data
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log("🔧 Setting up test data via registration...");
    console.log(`📍 Base URL: ${baseURL}`);

    // Go to registration page
    console.log("📄 Navigating to registration page...");
    await page.goto(`${baseURL}/register`);
    console.log(`✅ Navigated to: ${page.url()}`);

    // Fill registration form using id selectors
    console.log("📝 Filling registration form...");
    await page.fill("#name", "Test User");
    console.log("  ✓ Filled name field");
    
    await page.fill("#email", "test@example.com");
    console.log("  ✓ Filled email field");
    
    await page.fill("#password", "09%#3@0#rH3ksOqbL#qg8LAnT8c*35Vfa&5Q");
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
    // User might already exist, try logging in
    console.log(
      "ℹ️  Registration failed (user may already exist), attempting login...",
    );
    console.log(`❌ Registration error: ${error}`);

    try {
      // Take screenshot for debugging
      console.log("📸 Taking screenshot for debugging...");
      await page.screenshot({ path: 'registration-failure.png' });
      console.log("  ✓ Screenshot saved as registration-failure.png");

      console.log("📄 Navigating to login page...");
      await page.goto(`${baseURL}/login`);
      console.log(`✅ Navigated to: ${page.url()}`);

      console.log("📝 Filling login form...");
      await page.fill('input[type="email"]', "test@example.com");
      console.log("  ✓ Filled email field");
      
      await page.fill(
        'input[type="password"]',
        "09%#3@0#rH3ksOqbL#qg8LAnT8c*35Vfa&5Q",
      );
      console.log("  ✓ Filled password field");

      console.log("🔄 Submitting login form...");
      await page.click('button[type="submit"]');
      console.log("  ✓ Form submitted");

      console.log("⏳ Waiting for redirect to groups page (timeout: 15s)...");
      await page.waitForURL("**/app/groups", { timeout: 15000 });
      console.log(`✅ Successfully redirected to: ${page.url()}`);
      
      console.log("✅ Test user already exists and login successful");
    } catch (loginError) {
      console.error("❌ Failed to set up test user:", loginError);
      
      // Take screenshot for debugging
      console.log("📸 Taking screenshot of login failure...");
      try {
        await page.screenshot({ path: 'login-failure.png' });
        console.log("  ✓ Screenshot saved as login-failure.png");
      } catch (screenshotError) {
        console.error("  ✗ Failed to take screenshot:", screenshotError);
      }

      throw loginError;
    }
  } finally {
    console.log("🧹 Cleaning up browser...");
    await browser.close();
    console.log("✅ Browser closed");
  }
}

export default globalSetup;
