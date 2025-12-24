import { type Page, expect } from '@playwright/test';

export class GroupsPageDebug {
  constructor(public readonly page: Page) {}

  async goto() {
    console.log('[GroupsPage] Navigating to /groups');
    await this.page.goto('/groups');
  }

  async waitForLoad() {
    console.log('[GroupsPage] Waiting for page to load');
    await this.page.waitForLoadState('networkidle');
    await this.page.getByTestId('groups-page-header').waitFor({ state: 'visible' });
    console.log('[GroupsPage] Page loaded');
  }

  async clickCreateGroup() {
    console.log('[GroupsPage] Looking for Create Group button');

    // Check if button exists
    const button = this.page
      .getByTestId('groups-page-header')
      .getByRole('button', { name: 'Create Group' });

    const isVisible = await button.isVisible();
    console.log(`[GroupsPage] Button visible: ${isVisible}`);

    if (!isVisible) {
      // Try alternative: empty state button
      console.log('[GroupsPage] Trying empty state button');
      const emptyButton = this.page.getByTestId('empty-state-create-group');
      const emptyVisible = await emptyButton.isVisible().catch(() => false);
      console.log(`[GroupsPage] Empty state button visible: ${emptyVisible}`);

      if (emptyVisible) {
        await emptyButton.click();
        console.log('[GroupsPage] Clicked empty state button');
      } else {
        throw new Error('No Create Group button found');
      }
    } else {
      await button.click();
      console.log('[GroupsPage] Clicked header button');
    }

    // Wait for dialog
    console.log('[GroupsPage] Waiting for dialog to open...');
    try {
      await this.page
        .getByPlaceholder('Enter group name')
        .waitFor({ state: 'visible', timeout: 10000 });
      console.log('[GroupsPage] Dialog opened successfully');
    } catch (e) {
      console.log('[GroupsPage] Dialog did not open!');
      console.log('[GroupsPage] Taking screenshot...');
      await this.page.screenshot({ path: '/tmp/dialog-not-opened.png', fullPage: true });

      // Check what's on the page
      const bodyText = await this.page.locator('body').textContent();
      console.log('[GroupsPage] Page content:', bodyText?.substring(0, 500));
      throw e;
    }
  }

  async fillGroupName(name: string) {
    await this.page.getByPlaceholder('Enter group name').fill(name);
  }

  async submitGroupForm() {
    await this.page.keyboard.press('Enter');
  }

  async createGroup(name: string) {
    await this.clickCreateGroup();
    await this.fillGroupName(name);
    await this.submitGroupForm();
  }

  async expectGroupVisible(groupName: string) {
    await expect(this.page.getByText(groupName)).toBeVisible();
  }
}
