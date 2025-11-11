import { test as setup } from '@playwright/test';
import { GroupsPage } from '../page-objects/GroupsPage';

/**
 * Diagnostic setup test that captures detailed information about E2E environment
 * This runs during setup and provides insights into authentication and app state
 */
setup('capture-diagnostics', async ({ page }, testInfo) => {
  console.log('\n========== E2E DIAGNOSTICS START ==========');
  console.log(`Test Name: ${testInfo.title}`);
  console.log(`Worker: ${testInfo.workerIndex}`);
  console.log(`Retry: ${testInfo.retry}`);
  console.log(`Environment: ${process.env.CI ? 'CI' : 'Local'}`);
  console.log(`Base URL: ${page.context().baseURL}`);

  // Test 1: Check backend connectivity
  console.log('\n--- Test 1: Backend Connectivity ---');
  try {
    const baseUrl = page.context().baseURL || 'http://localhost:8000';
    const healthResponse = await page.request.get(`${baseUrl.replace(/\/$/, '')}/health`);
    console.log(`Backend health: ${healthResponse.status}`);
    console.log(`Backend response: ${await healthResponse.text()}`);
  } catch (error) {
    console.log(`Backend health check failed: ${error}`);
  }

  // Test 2: Check authentication endpoint
  console.log('\n--- Test 2: Authentication Endpoint ---');
  try {
    const baseUrl = page.context().baseURL || 'http://localhost:8000';
    const authResponse = await page.request.get(`${baseUrl.replace(/\/$/, '')}/auth/me`);
    console.log(`Auth /me endpoint status: ${authResponse.status}`);
    if (authResponse.ok) {
      console.log(`Auth response: ${JSON.stringify(await authResponse.json())}`);
    } else {
      console.log(`Auth error: ${await authResponse.text()}`);
    }
  } catch (error) {
    console.log(`Auth /me endpoint failed: ${error}`);
  }

  // Test 3: App initialization
  console.log('\n--- Test 3: App Initialization ---');
  try {
    await page.goto('/');
    console.log('Navigated to home');

    // Wait a bit for app to initialize
    await page.waitForLoadState('networkidle').catch(() => {
      console.log('Network idle timeout (non-critical)');
    });

    const appState = await page.evaluate(() => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appReady: (window as any).__app_ready,
      url: window.location.href,
      readyState: document.readyState,
      title: document.title,
    }));

    console.log(`App state: ${JSON.stringify(appState)}`);
  } catch (error) {
    console.log(`App initialization failed: ${error}`);
  }

  // Test 4: Storage state
  console.log('\n--- Test 4: Storage State ---');
  try {
    const cookies = await page.context().cookies();
    console.log(
      `Cookies: ${cookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`).join(', ')}`
    );

    const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
    console.log(`LocalStorage keys: ${Object.keys(JSON.parse(localStorage)).join(', ')}`);
  } catch (error) {
    console.log(`Storage check failed: ${error}`);
  }

  // Test 5: Groups page rendering
  console.log('\n--- Test 5: Groups Page Rendering (if authenticated) ---');
  try {
    const groupsPage = new GroupsPage(page);
    await groupsPage.goto();
    console.log('Navigated to groups page');

    const state = await groupsPage.getPageState();
    console.log(`Groups page state: ${JSON.stringify(state)}`);
  } catch (error) {
    console.log(`Groups page test failed: ${error}`);
  }

  console.log('========== E2E DIAGNOSTICS END ==========\n');
});
