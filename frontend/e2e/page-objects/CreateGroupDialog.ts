import { Page, expect, Locator } from '@playwright/test';

/**
 * Page Object for the Create Group Dialog
 * Encapsulates all interactions with the group creation dialog
 */
export class CreateGroupDialog {
  readonly page: Page;

  // Dialog elements
  readonly dialog: Locator;
  readonly dialogTitle: Locator;
  readonly groupNameInput: Locator;
  readonly groupNameLabel: Locator;
  readonly historicalExclusionsCheckbox: Locator;
  readonly lookbackInput: Locator;
  readonly lookbackLabel: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.dialog = page.getByTestId('create-group-dialog');
    this.dialogTitle = page.getByRole('heading', { name: /create group/i });
    this.groupNameInput = page.getByTestId('group-name-input');
    this.groupNameLabel = page.getByText('Group Name *');
    this.historicalExclusionsCheckbox = page.getByTestId('historical-exclusions-checkbox');
    this.lookbackInput = page.getByTestId('lookback-input');
    this.lookbackLabel = page.getByText('Lookback (draws)');
    this.createButton = page.getByTestId('submit-create-group');
    this.cancelButton = page.getByTestId('cancel-create-group');
  }

  /**
   * Verify the dialog is visible
   */
  async expectVisible() {
    await expect(this.dialog).toBeVisible();
    await expect(this.dialogTitle).toBeVisible();
  }

  /**
   * Verify the dialog is closed/not visible
   */
  async expectClosed() {
    await expect(this.dialog).not.toBeVisible();
  }

  /**
   * Fill in the group name
   * @param name - The name for the group
   */
  async fillGroupName(name: string) {
    await this.groupNameInput.fill(name);
  }

  /**
   * Clear the group name input
   */
  async clearGroupName() {
    await this.groupNameInput.clear();
  }

  /**
   * Toggle the historical exclusions checkbox
   */
  async toggleHistoricalExclusions() {
    await this.historicalExclusionsCheckbox.click();
  }

  /**
   * Enable historical exclusions
   */
  async enableHistoricalExclusions() {
    const isChecked = await this.historicalExclusionsCheckbox.isChecked();
    if (!isChecked) {
      await this.historicalExclusionsCheckbox.click();
    }
  }

  /**
   * Disable historical exclusions
   */
  async disableHistoricalExclusions() {
    const isChecked = await this.historicalExclusionsCheckbox.isChecked();
    if (isChecked) {
      await this.historicalExclusionsCheckbox.click();
    }
  }

  /**
   * Verify historical exclusions checkbox is checked
   */
  async expectHistoricalExclusionsEnabled() {
    await expect(this.historicalExclusionsCheckbox).toBeChecked();
  }

  /**
   * Verify historical exclusions checkbox is unchecked
   */
  async expectHistoricalExclusionsDisabled() {
    await expect(this.historicalExclusionsCheckbox).not.toBeChecked();
  }

  /**
   * Set the lookback value
   * @param value - The lookback value (number of draws)
   */
  async setLookback(value: number) {
    await this.lookbackInput.fill(value.toString());
  }

  /**
   * Verify lookback input is visible
   */
  async expectLookbackVisible() {
    await expect(this.lookbackInput).toBeVisible();
    await expect(this.lookbackLabel).toBeVisible();
  }

  /**
   * Verify lookback input is not visible
   */
  async expectLookbackNotVisible() {
    await expect(this.lookbackInput).not.toBeVisible();
  }

  /**
   * Get the current value of the lookback input
   */
  async getLookbackValue(): Promise<string> {
    return (await this.lookbackInput.inputValue()) || '';
  }

  /**
   * Click the Create button
   */
  async clickCreate() {
    await this.createButton.click();
  }

  /**
   * Click the Cancel button
   */
  async clickCancel() {
    await this.cancelButton.click();
  }

  /**
   * Submit the form (press Enter)
   */
  async submitForm() {
    await this.groupNameInput.press('Enter');
  }

  /**
   * Blur the group name input (trigger validation)
   */
  async blurGroupNameInput() {
    await this.groupNameInput.blur();
  }

  /**
   * Blur the lookback input (trigger validation)
   */
  async blurLookbackInput() {
    await this.lookbackInput.blur();
  }

  /**
   * Verify an error message is displayed for a specific field
   * @param message - The expected error message
   */
  async expectError(message: string) {
    const errorElement = this.page.getByText(message);
    await expect(errorElement).toBeVisible();
  }

  /**
   * Verify group name error is displayed
   * @param message - Expected error message
   */
  async expectGroupNameError(message: string) {
    const errorElement = this.page.getByTestId('group-name-error');
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText(message);
  }

  /**
   * Verify lookback error is displayed
   * @param message - Expected error message
   */
  async expectLookbackError(message: string) {
    const errorElement = this.page.getByTestId('lookback-error');
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText(message);
  }

  /**
   * Verify no error messages are visible
   */
  async expectNoErrors() {
    // Check common error messages are not present
    await expect(this.page.getByText('Group name is required')).not.toBeVisible();
    await expect(this.page.getByText('Lookback must be a positive integer')).not.toBeVisible();
  }

  /**
   * Verify Create button is disabled
   */
  async expectCreateButtonDisabled() {
    await expect(this.createButton).toBeDisabled();
  }

  /**
   * Verify Create button is enabled
   */
  async expectCreateButtonEnabled() {
    await expect(this.createButton).toBeEnabled();
  }

  /**
   * Verify Cancel button is disabled
   */
  async expectCancelButtonDisabled() {
    await expect(this.cancelButton).toBeDisabled();
  }

  /**
   * Verify the Create button shows loading state
   */
  async expectCreatingState() {
    await expect(this.createButton).toContainText('Creating...');
    await expect(this.createButton).toBeDisabled();
  }

  /**
   * Verify all form fields are present and in initial state
   */
  async expectInitialState() {
    await this.expectVisible();
    await expect(this.groupNameInput).toBeVisible();
    await expect(this.groupNameInput).toHaveValue('');
    await expect(this.historicalExclusionsCheckbox).toBeChecked();
    await this.expectLookbackVisible();
    await expect(this.createButton).toBeEnabled();
    await expect(this.cancelButton).toBeEnabled();
  }

  /**
   * Fill and submit the form with valid data
   * @param name - Group name
   * @param options - Optional settings
   */
  async createGroup(
    name: string,
    options?: {
      historicalExclusionsEnabled?: boolean;
      lookback?: number;
    }
  ) {
    await this.fillGroupName(name);

    if (options?.historicalExclusionsEnabled !== undefined) {
      const isChecked = await this.historicalExclusionsCheckbox.isChecked();
      if (isChecked !== options.historicalExclusionsEnabled) {
        await this.toggleHistoricalExclusions();
      }
    }

    if (options?.lookback !== undefined && options?.historicalExclusionsEnabled !== false) {
      await this.setLookback(options.lookback);
    }

     await this.clickCreate();
     await this.expectClosedAfterSubmission();
  }

  /**
   * Verify form data is cleared (reset to initial state)
   */
  async expectFormCleared() {
    await expect(this.groupNameInput).toHaveValue('');
    await expect(this.historicalExclusionsCheckbox).toBeChecked();
    const lookbackValue = await this.getLookbackValue();
    expect(lookbackValue).toBe('1');
  }

  /**
   * Verify the group name input has focus
   */
  async expectGroupNameInputFocused() {
    await expect(this.groupNameInput).toBeFocused();
  }

  /**
   * Get the max length of the group name input
   */
  async getGroupNameMaxLength(): Promise<number> {
    const maxLength = await this.groupNameInput.getAttribute('maxlength');
    return maxLength ? parseInt(maxLength, 10) : 0;
  }

  /**
   * Type text into group name (for testing input behavior)
   * @param text - Text to type
   */
  async typeGroupName(text: string) {
    await this.groupNameInput.type(text);
  }

  /**
   * Close the dialog using Escape key
   */
  async closeWithEscape() {
    await this.page.keyboard.press('Escape');
  }

  /**
   * Verify dialog closes after successful submission
   */
  async expectClosedAfterSubmission() {
    await this.page.waitForTimeout(500); // Wait for any animations
    await this.expectClosed();
  }
}


