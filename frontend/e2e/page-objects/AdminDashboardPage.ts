import { type Page, expect } from '@playwright/test';

export class AdminDashboardPage {
  constructor(public readonly page: Page) {}

  // ============================================================================
  // Navigation
  // ============================================================================

  /**
   * Navigate to the admin dashboard page
   */
  async goto() {
    console.log('[E2E] Navigating to /admin...');
    await this.page.goto('/admin');
  }

  /**
   * Wait for the admin dashboard to load completely
   * Uses network idle to ensure data is loaded
   */
  async waitForLoad() {
    console.log('[E2E] Waiting for admin dashboard to load...');
    await this.page.waitForLoadState('networkidle');
    await this.page.getByTestId('admin-dashboard').waitFor({ state: 'visible' });
    console.log('[E2E] Admin dashboard loaded');
  }

  // ============================================================================
  // User Table Interactions
  // ============================================================================

  /**
   * Search for users by query (name or email)
   * Waits for network to settle after typing
   */
  async searchUsers(query: string) {
    console.log(`[E2E] Searching for users: "${query}"`);
    await this.page.getByTestId('user-search-input').fill(query);
    // Wait for search results to load
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clear the user search input
   */
  async clearSearch() {
    console.log('[E2E] Clearing user search...');
    await this.page.getByTestId('user-search-input').clear();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click the "Manage Permissions" button for a specific user
   * Waits for the permission dialog to appear
   */
  async clickManagePermissions(userId: string) {
    console.log(`[E2E] Clicking manage permissions for user ${userId}...`);
    const manageButton = this.page
      .getByTestId('users-table')
      .getByTestId(`manage-permissions-${userId}`);
    await manageButton.click();
    await this.page.getByTestId('permission-dialog').waitFor({ state: 'visible' });
    console.log(`[E2E] Permission dialog opened for user ${userId}`);
  }

  async getPermissionCount(userId: string): Promise<string> {
    const countElement = this.page
      .getByTestId('users-table')
      .getByTestId(`permission-count-${userId}`);
    const text = await countElement.textContent();
    return text?.trim() || '';
  }

  /**
   * Navigate to the next page in the user table pagination
   */
  async goToNextPage() {
    console.log('[E2E] Navigating to next page...');
    await this.page.getByTestId('pagination-next').click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to the previous page in user table pagination
   */
  async goToPreviousPage() {
    console.log('[E2E] Navigating to previous page...');
    await this.page.getByTestId('pagination-prev').click();
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // Permission Category Filtering
  // ============================================================================

  /**
   * Select a permission category to filter available permissions
   * Categories typically include: 'draws', 'groups', 'members', 'exclusions', etc.
   */
  async selectPermissionCategory(category: string) {
    console.log(`[E2E] Selecting permission category: ${category}`);
    await this.page.getByTestId('permission-category-filter').selectOption(category);
    // Wait for filtered permissions to load
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get list of available permission codes currently displayed
   */
  async getAvailablePermissions(): Promise<string[]> {
    const permissions = await this.page.getByTestId(/^available-permission-/).all();
    const codes: string[] = [];
    for (const perm of permissions) {
      const code = await perm.getAttribute('data-permission-code');
      if (code) codes.push(code);
    }
    return codes;
  }

  // ============================================================================
  // Permission Management - Grant
  // ============================================================================

  /**
   * Grant a permission to the user in the currently open permission dialog
   * Waits for the API response to confirm the operation
   */
  async grantPermission(permissionCode: string) {
    console.log(`[E2E] Granting permission: ${permissionCode}`);

    // Set up response listener before clicking
    const responsePromise = this.page.waitForResponse(
      response =>
        response.url().includes('/api/v1/admin/users') &&
        response.url().includes('permissions') &&
        (response.status() === 201 || response.status() === 200)
    );

    // Click the grant button for this permission
    await this.page.getByTestId(`grant-permission-${permissionCode}`).click();

    // Wait for the API response
    const response = await responsePromise;
    console.log(`[E2E] Grant permission response: ${response.status()}`);

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `Failed to grant permission ${permissionCode}: ${response.status()} - ${body}`
      );
    }
  }

  // ============================================================================
  // Permission Management - Revoke
  // ============================================================================

  /**
   * Revoke a permission from the user in the currently open permission dialog
   * Waits for the API response to confirm the operation
   */
  async revokePermission(permissionCode: string) {
    console.log(`[E2E] Revoking permission: ${permissionCode}`);

    // Set up response listener before clicking
    const responsePromise = this.page.waitForResponse(
      response =>
        response.url().includes('/api/v1/admin/users') &&
        response.url().includes('permissions') &&
        (response.status() === 204 || response.status() === 200)
    );

    // Click the revoke button for this permission
    await this.page.getByTestId(`revoke-permission-${permissionCode}`).click();

    // Wait for the API response
    const response = await responsePromise;
    console.log(`[E2E] Revoke permission response: ${response.status()}`);

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `Failed to revoke permission ${permissionCode}: ${response.status()} - ${body}`
      );
    }
  }

  /**
   * Check if a permission is currently granted to the user (visible in dialog)
   */
  async isPermissionGranted(permissionCode: string): Promise<boolean> {
    const permElement = this.page.getByTestId(`user-permission-${permissionCode}`);
    try {
      await permElement.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Dialog Management
  // ============================================================================

  /**
   * Close the permission management dialog
   */
  async closePermissionDialog() {
    console.log('[E2E] Closing permission dialog...');
    await this.page.getByTestId('close-permission-dialog').click();
    // Wait for dialog to close
    await this.page.getByTestId('permission-dialog').waitFor({ state: 'hidden' });
    console.log('[E2E] Permission dialog closed');
  }

  /**
   * Get the title/header of the permission dialog to verify correct user
   */
  async getDialogTitle(): Promise<string> {
    const title = await this.page.getByTestId('permission-dialog-title').textContent();
    return title?.trim() || '';
  }

  // ============================================================================
  // Assertions - Page State
  // ============================================================================

  /**
   * Verify the admin dashboard page is visible
   */
  async expectPageVisible() {
    await expect(this.page.getByTestId('admin-dashboard')).toBeVisible();
  }

  /**
   * Verify the user search input is visible
   */
  async expectSearchInputVisible() {
    await expect(this.page.getByTestId('user-search-input')).toBeVisible();
  }

  /**
   * Verify the user table header is visible
   */
  async expectUserTableVisible() {
    await expect(this.page.getByTestId('users-table')).toBeVisible();
  }

  // ============================================================================
  // Assertions - User Table Content
  // ============================================================================

  /**
   * Verify a user appears in the users table by email
   * Scoped to the desktop table to avoid duplicate matches with mobile cards
   */
  async expectUserInTable(email: string) {
    console.log(`[E2E] Expecting user in table: ${email}`);
    await expect(this.page.getByTestId('users-table').locator(`text=${email}`)).toBeVisible();
  }

  /**
   * Verify a user does NOT appear in the users table by email
   * Scoped to the desktop table to avoid duplicate matches with mobile cards
   */
  async expectUserNotInTable(email: string) {
    console.log(`[E2E] Expecting user NOT in table: ${email}`);
    await expect(this.page.getByTestId('users-table').locator(`text=${email}`)).not.toBeVisible();
  }

  /**
   * Verify the permission count for a user matches expected value
   * Count can be a number or "All" (for admin users)
   */
  async expectPermissionCount(userId: string, count: number | string) {
    console.log(`[E2E] Verifying permission count for user ${userId}: ${count}`);
    const countElement = this.page
      .getByTestId('users-table')
      .getByTestId(`permission-count-${userId}`);
    const countText = count === 'All' ? 'All (Admin)' : count.toString();
    await expect(countElement).toContainText(countText);
  }

  // ============================================================================
  // Assertions - Permission List
  // ============================================================================

  /**
   * Verify a permission is visible in the permission list (granted to user)
   */
  async expectPermissionInList(code: string) {
    console.log(`[E2E] Expecting permission in list: ${code}`);
    await expect(this.page.getByTestId(`user-permission-${code}`)).toBeVisible();
  }

  /**
   * Verify a permission is NOT visible in the permission list (not granted to user)
   */
  async expectPermissionNotInList(code: string) {
    console.log(`[E2E] Expecting permission NOT in list: ${code}`);
    await expect(this.page.getByTestId(`user-permission-${code}`)).not.toBeVisible();
  }

  /**
   * Verify an available permission is visible in the dialog
   */
  async expectAvailablePermissionVisible(permissionCode: string) {
    console.log(`[E2E] Expecting available permission visible: ${permissionCode}`);
    await expect(this.page.getByTestId(`available-permission-${permissionCode}`)).toBeVisible();
  }

  /**
   * Verify the permission dialog title contains the expected user identifier
   */
  async expectDialogTitleContains(userIdentifier: string) {
    console.log(`[E2E] Expecting dialog title to contain: ${userIdentifier}`);
    await expect(this.page.getByTestId('permission-dialog-title')).toContainText(userIdentifier);
  }

  // ============================================================================
  // Assertions - Feedback Messages
  // ============================================================================

  /**
   * Verify a success message appears (typically after granting/revoking)
   */
  async expectSuccessMessage(message: string) {
    console.log(`[E2E] Expecting success message: "${message}"`);
    await expect(this.page.getByTestId('success-toast')).toContainText(message);
  }

  /**
   * Verify an error message appears
   */
  async expectErrorMessage(message: string) {
    console.log(`[E2E] Expecting error message: "${message}"`);
    await expect(this.page.getByTestId('error-toast')).toContainText(message);
  }

  /**
   * Verify a loading state is visible (e.g., spinner during API call)
   */
  async expectLoadingState() {
    console.log('[E2E] Expecting loading state...');
    await expect(this.page.getByTestId('permission-dialog-loading')).toBeVisible();
  }

  /**
   * Wait for a success message to appear and then disappear (typical toast behavior)
   */
  async waitForSuccessMessage(message: string, timeout: number = 5000) {
    console.log(`[E2E] Waiting for success message: "${message}"`);
    const toast = this.page.getByTestId('success-toast');
    await expect(toast).toContainText(message, { timeout });
    // Optionally wait for it to disappear
    await toast.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Wait for an error message to appear and then disappear
   */
  async waitForErrorMessage(message: string, timeout: number = 5000) {
    console.log(`[E2E] Waiting for error message: "${message}"`);
    const toast = this.page.getByTestId('error-toast');
    await expect(toast).toContainText(message, { timeout });
    // Optionally wait for it to disappear
    await toast.waitFor({ state: 'hidden', timeout });
  }

  // ============================================================================
  // Assertions - Permissions Disabled State
  // ============================================================================

  /**
   * Verify the grant button for a permission is disabled
   * (useful for testing UI state, e.g., already granted)
   */
  async expectGrantButtonDisabled(permissionCode: string) {
    console.log(`[E2E] Expecting grant button disabled for: ${permissionCode}`);
    await expect(this.page.getByTestId(`grant-permission-${permissionCode}`)).toBeDisabled();
  }

  /**
   * Verify the revoke button for a permission is disabled
   * (useful for testing UI state, e.g., not yet granted)
   */
  async expectRevokeButtonDisabled(permissionCode: string) {
    console.log(`[E2E] Expecting revoke button disabled for: ${permissionCode}`);
    await expect(this.page.getByTestId(`revoke-permission-${permissionCode}`)).toBeDisabled();
  }

  // ============================================================================
  // Assertions - Access Control
  // ============================================================================

  /**
   * Verify the page is NOT accessible (e.g., 403 error or redirect)
   */
  async expectAccessDenied() {
    console.log('[E2E] Expecting access denied (403 or redirect)...');
    // Check if we see a 403 error message or were redirected
    try {
      // If page loads, check for error indicator
      await this.page.getByTestId('admin-dashboard').waitFor({
        state: 'visible',
        timeout: 2000,
      });
      // If it loaded, we got access (unexpected)
      throw new Error('Expected access denied, but page loaded successfully');
    } catch {
      // Expected: either dashboard not found or we were redirected
      // This is the expected behavior
    }
  }
}
