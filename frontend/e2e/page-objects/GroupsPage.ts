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
    await this.page
      .getByTestId('groups-page-header')
      .getByRole('button', { name: 'Create Group' })
      .click();
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
    await expect(this.page.getByText(groupName)).toBeVisible();
  }

  async expectCreateButtonVisible() {
    await expect(this.page.getByRole('button', { name: 'Create Group' })).toBeVisible();
  }
}
