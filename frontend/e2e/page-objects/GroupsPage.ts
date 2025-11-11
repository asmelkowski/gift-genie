import { type Page, expect } from '@playwright/test';
import { BasePageObject } from './BasePageObject';

export class GroupsPage extends BasePageObject {
  constructor(page: Page) {
    super(page);
  }

  // Navigation
  async goto() {
    await this.navigateTo('/app/groups');
  }

  // Waits - IMPROVED with diagnostics
  async waitForLoad() {
    this.log('GroupsPage: waitForLoad() starting...');
    const startTime = Date.now();

    try {
      // First, make sure app is ready
      await this.waitForAppReady(15000);

      // Then wait for the header to appear
      // Use a shorter timeout since app is already ready
      this.log('GroupsPage: Waiting for groups-page-header...');

      await this.page.getByTestId('groups-page-header').waitFor({
        state: 'visible',
        timeout: 8000,
      });

      const duration = Date.now() - startTime;
      this.log(`✓ Groups page loaded successfully in ${duration}ms`);

      // Wait for network to settle after page content is visible
      try {
        await this.waitForNetworkIdle(5000);
      } catch {
        // Network idle timeout is not fatal if page is already visible
        this.log('⚠ Network did not fully idle, but page is visible');
      }
    } catch {
      const duration = Date.now() - startTime;
      this.log(`✗ Groups page failed to load after ${duration}ms`, {
        error: String(error),
      });

      // Capture detailed diagnostics
      const pageState = await this.capturePageState();
      const diagnostics = await this.getDiagnostics();

      throw new Error(
        `Groups page failed to load within timeout\n` +
          `Duration: ${duration}ms\n` +
          `Page state: ${JSON.stringify(pageState, null, 2)}\n` +
          `Full diagnostics: ${JSON.stringify(diagnostics, null, 2)}`
      );
    }
  }

  /**
   * Get detailed state of groups page for debugging
   */
  async getPageState() {
    this.log('GroupsPage: Capturing page state...');

    const state = await this.page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowAny = window as any;
      const header = document.querySelector('[data-testid="groups-page-header"]');
      const loadingState = document.querySelector('[data-testid="loading-state"]');
      const errorState = document.querySelector('[data-testid="error-state"]');
      const emptyState = document.querySelector('[data-testid="empty-state"]');
      const groupsList = document.querySelector('[data-testid="groups-grid"]');

      return {
        url: window.location.href,
        headerVisible: header !== null,
        headerText: header?.textContent?.substring(0, 100) || null,
        loadingVisible: loadingState !== null,
        errorVisible: errorState !== null,
        errorText: errorState?.textContent?.substring(0, 100) || null,
        emptyStateVisible: emptyState !== null,
        groupsListVisible: groupsList !== null,
        numberOfGroups: groupsList
          ? groupsList.querySelectorAll('[data-testid^="group-"]').length
          : 0,
        appReady: windowAny.__app_ready || false,
      };
    });

    this.log('GroupsPage: Page state captured', state);
    return state;
  }

  /**
   * Wait for groups data to load and be visible
   */
  async waitForGroupsData(timeout = 10000) {
    this.log('GroupsPage: Waiting for groups data to load...');
    const startTime = Date.now();

    try {
      await this.page.waitForFunction(
        () => {
          const header = document.querySelector('[data-testid="groups-page-header"]');
          // Check that we're not in loading or error state
          const notLoading =
            !document.querySelector('[data-testid="loading-state"]') ||
            document.querySelector('[data-testid="groups-grid"]');

          return header && notLoading;
        },
        { timeout }
      );

      const duration = Date.now() - startTime;
      this.log(`✓ Groups data loaded in ${duration}ms`);
    } catch {
      const duration = Date.now() - startTime;
      const state = await this.getPageState();

      throw new Error(
        `Groups data did not load within ${timeout}ms (after ${duration}ms)\n` +
          `Page state: ${JSON.stringify(state, null, 2)}`
      );
    }
  }

  /**
   * Verify page is in a usable state
   */
  async expectPageVisible() {
    this.log('GroupsPage: Verifying page is visible...');
    const state = await this.getPageState();

    if (!state.headerVisible) {
      throw new Error(`Groups page header not visible. State: ${JSON.stringify(state, null, 2)}`);
    }

    await expect(this.page.getByTestId('groups-page-header')).toBeVisible();
    this.log('✓ Groups page is visible');
  }

  // Actions
  async clickCreateGroup() {
    this.log('GroupsPage: Clicking create group button...');
    await this.page
      .getByTestId('groups-page-header')
      .getByRole('button', { name: 'Create Group' })
      .click();
    this.log('✓ Create group button clicked');
  }

  async fillGroupName(name: string) {
    this.log(`GroupsPage: Filling group name: ${name}`);
    await this.page.getByPlaceholder('Enter group name').fill(name);
    this.log('✓ Group name filled');
  }

  async submitGroupForm() {
    this.log('GroupsPage: Submitting group form...');
    // Submit by pressing Enter
    await this.page.keyboard.press('Enter');
    this.log('✓ Group form submitted');
  }

  async createGroup(name: string) {
    this.log(`GroupsPage: Creating group: ${name}`);
    await this.clickCreateGroup();
    await this.fillGroupName(name);
    await this.submitGroupForm();
    this.log(`✓ Group created: ${name}`);
  }

  // Assertions
  async expectGroupVisible(groupName: string) {
    this.log(`GroupsPage: Checking if group is visible: ${groupName}`);
    await expect(this.page.getByText(groupName)).toBeVisible();
    this.log(`✓ Group is visible: ${groupName}`);
  }

  async expectCreateButtonVisible() {
    this.log('GroupsPage: Checking if create button is visible...');
    await expect(this.page.getByRole('button', { name: 'Create Group' })).toBeVisible();
    this.log('✓ Create button is visible');
  }
}
