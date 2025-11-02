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

    // Go to registration page
    await page.goto(`${baseURL}/register`);

    // Fill registration form using id selectors
    await page.fill("#name", "Test User");
    await page.fill("#email", "test@example.com");
    await page.fill("#password", "09%#3@0#rH3ksOqbL#qg8LAnT8c*35Vfa&5Q");

    // Submit registration
    await page.click('button[type="submit"]');

    // Wait for successful registration and redirect to groups page
    await page.waitForURL("**/app/groups", { timeout: 10000 });

    console.log("✅ Test user registered successfully");
  } catch (error) {
    // User might already exist, try logging in
    console.log(
      "ℹ️  Registration failed (user may already exist), attempting login...: ",
      error,
    );

    try {
      await page.goto(`${baseURL}/login`);
      await page.fill('input[type="email"]', "test@example.com");
      await page.fill(
        'input[type="password"]',
        "09%#3@0#rH3ksOqbL#qg8LAnT8c*35Vfa&5Q",
      );
      await page.click('button[type="submit"]');
      await page.waitForURL("**/app/groups", { timeout: 10000 });
      console.log("✅ Test user already exists and login successful");
    } catch (loginError) {
      console.error("❌ Failed to set up test user:", loginError);
      throw loginError;
    }
  } finally {
    await browser.close();
  }
}

export default globalSetup;
