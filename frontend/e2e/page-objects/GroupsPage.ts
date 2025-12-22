import { type Page, expect } from '@playwright/test';

export class GroupsPage {
  constructor(public readonly page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto('/app/groups');
  }

  // Waits
  async waitForLoad() {
    // Wait for network to settle and header to be visible
    await this.page.waitForLoadState('networkidle');
    await this.page.getByTestId('groups-page-header').waitFor({ state: 'visible' });
  }

  // Actions
  async clickCreateGroup() {
    // Try header button first (shown when groups exist)
    const headerButton = this.page
      .getByTestId('groups-page-header')
      .getByRole('button', { name: 'Create Group' });

    // Try empty state button (shown when no groups exist)
    const emptyButton = this.page.getByTestId('empty-state-create-group');

    // Check which button is visible and click it
    const headerVisible = await headerButton.isVisible().catch(() => false);
    const emptyVisible = await emptyButton.isVisible().catch(() => false);

    if (headerVisible) {
      await headerButton.click();
    } else if (emptyVisible) {
      await emptyButton.click();
    } else {
      throw new Error('No Create Group button found (neither header nor empty state)');
    }

    // Wait for the dialog to open and form to be ready
    await this.page
      .getByPlaceholder('Enter group name')
      .waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillGroupName(name: string) {
    await this.page.getByPlaceholder('Enter group name').fill(name);
  }

  async submitGroupForm() {
    // Submit by pressing Enter
    await this.page.keyboard.press('Enter');
  }

  async createGroup(name: string) {
    await this.clickCreateGroup();
    await this.fillGroupName(name);
    await this.submitGroupForm();
  }

  // Assertions
  async expectPageVisible() {
    await expect(this.page.getByTestId('groups-page-header')).toBeVisible();
  }

  async expectGroupVisible(groupName: string) {
    // Use .first() to handle multiple elements with same text (link + button)
    await expect(this.page.getByText(groupName).first()).toBeVisible();
  }

  async expectCreateButtonVisible() {
    await expect(this.page.getByText('No groups yet')).toBeVisible();
    await expect(this.page.getByTestId('empty-state-create-group')).toBeVisible();
  }
}
