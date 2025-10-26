import { Page, expect, Locator } from '@playwright/test';

/**
 * Page Object for the Groups List Page
 * Encapsulates all interactions with /app/groups
 */
export class GroupsPage {
  readonly page: Page;

  // Main page elements
  readonly pageHeader: Locator;
  readonly createGroupButton: Locator;
  readonly searchInput: Locator;
  readonly sortSelect: Locator;
  readonly groupsGrid: Locator;
  readonly loadingState: Locator;
  readonly errorState: Locator;
  readonly emptyState: Locator;
  readonly noResultsMessage: Locator;
  readonly clearSearchButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.pageHeader = page.getByTestId('groups-page-header');
    this.createGroupButton = page.getByTestId('create-group-button');
    this.searchInput = page.getByTestId('search-groups-input');
    this.sortSelect = page.getByTestId('sort-groups-select');
    this.groupsGrid = page.getByTestId('groups-grid');
    this.loadingState = page.getByTestId('loading-state');
    this.errorState = page.getByTestId('error-state');
    this.emptyState = page.getByTestId('empty-state');
    this.noResultsMessage = page.getByText('No groups found');
    this.clearSearchButton = page.getByTestId('clear-search-button');
  }

  /**
   * Navigate to the Groups page
   */
  async goto() {
    await this.page.goto('/app/groups');
  }

  /**
   * Verify the page has loaded successfully
   */
  async expectPageLoaded() {
    await expect(this.pageHeader).toBeVisible();
    await expect(this.pageHeader).toContainText('Groups');
  }

  /**
   * Click the Create Group button in the header
   */
  async clickCreateGroupButton() {
    await this.createGroupButton.click();
  }

  /**
   * Search for groups using the search input
   * @param searchTerm - The term to search for
   */
   async searchGroups(searchTerm: string) {
     await this.searchInput.fill(searchTerm);
     await this.searchInput.dispatchEvent('input');
     // Wait for debounce and results to load
     await this.page.waitForTimeout(600);
   }

  /**
   * Clear the search input
   */
  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click the "Clear search" button in no results state
   */
  async clickClearSearchButton() {
    await this.clearSearchButton.click();
  }

  /**
   * Select a sort option from the dropdown
   * @param option - Sort option value (e.g., 'name', '-created_at')
   */
  async selectSort(option: string) {
    await this.sortSelect.selectOption(option);
    // Wait for results to update
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get a group card by group ID
   * @param groupId - The ID of the group
   */
  getGroupCard(groupId: string): Locator {
    return this.page.getByTestId(`group-card-${groupId}`);
  }

  /**
   * Get a group card by group name
   * @param groupName - The name of the group
   */
  getGroupCardByName(groupName: string): Locator {
    return this.page.locator('[data-testid^="group-card-"][data-slot="card"]').filter({ hasText: groupName });
  }

  /**
   * Get all group cards
   */
  getGroupCards(): Locator {
    return this.page.locator('[data-testid^="group-card-"][data-slot="card"]');
  }

  /**
   * Click on a group card to navigate to details
   * @param groupId - The ID of the group to click
   */
  async clickGroupCard(groupId: string) {
    await this.getGroupCard(groupId).click();
  }

  /**
   * Click on a group card by name
   * @param groupName - The name of the group to click
   */
  async clickGroupCardByName(groupName: string) {
    await this.getGroupCardByName(groupName).click();
  }

  /**
   * Get the group name from a card
   * @param groupId - The ID of the group
   */
  async getGroupName(groupId: string): Promise<string> {
    const card = this.getGroupCard(groupId);
    const nameElement = card.getByTestId('group-card-name');
    return (await nameElement.textContent()) || '';
  }

  /**
   * Navigate to a specific page (Note: Current implementation only supports Previous/Next)
   * @param pageNumber - The page number to navigate to
   */
  async goToPage(pageNumber: number) {
    // Current implementation only has Previous/Next buttons
    // This method would need page number buttons to be implemented
    throw new Error('Page number navigation not implemented in current UI');
  }

  /**
   * Click the next page button
   */
  async goToNextPage() {
    await this.page.getByTestId('pagination-next').click();
  }

  /**
   * Click the previous page button
   */
  async goToPreviousPage() {
    await this.page.getByTestId('pagination-previous').click();
  }

  /**
   * Get current URL search params
   */
  async getUrlParams(): Promise<URLSearchParams> {
    const url = new URL(this.page.url());
    return url.searchParams;
  }

  /**
   * Verify the current page number in URL
   * @param expectedPage - Expected page number
   */
  async expectPageInUrl(expectedPage: number) {
    const params = await this.getUrlParams();
    const page = params.get('page') || '1';
    expect(page).toBe(expectedPage.toString());
  }

  /**
   * Verify search term in URL
   * @param expectedSearch - Expected search term
   */
  async expectSearchInUrl(expectedSearch: string) {
    const params = await this.getUrlParams();
    const search = params.get('search') || '';
    expect(search).toBe(expectedSearch);
  }

  /**
   * Verify sort option in URL
   * @param expectedSort - Expected sort option
   */
  async expectSortInUrl(expectedSort: string) {
    const params = await this.getUrlParams();
    const sort = params.get('sort') || '-created_at';
    expect(sort).toBe(expectedSort);
  }

  /**
   * Verify a group with given name is visible
   * @param groupName - Name of the group
   */
  async expectGroupVisible(groupName: string) {
    await expect(this.getGroupCardByName(groupName)).toBeVisible();
  }

  /**
   * Verify a group with given name is not visible
   * @param groupName - Name of the group
   */
  async expectGroupNotVisible(groupName: string) {
    await expect(this.getGroupCardByName(groupName)).not.toBeVisible();
  }

  /**
   * Verify the empty state is displayed
   */
  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Verify the loading state is displayed
   */
  async expectLoadingState() {
    await expect(this.loadingState).toBeVisible();
  }

  /**
   * Verify the error state is displayed
   */
  async expectErrorState() {
    await expect(this.errorState).toBeVisible();
  }

  /**
   * Verify "No groups found" message for empty search results
   */
  async expectNoResultsMessage() {
    await expect(this.noResultsMessage).toBeVisible();
  }

  /**
   * Verify pagination controls are visible
   */
  async expectPaginationVisible() {
    const pagination = this.page.getByTestId('pagination-controls');
    await expect(pagination).toBeVisible();
  }

  /**
   * Verify pagination controls are not visible
   */
  async expectPaginationNotVisible() {
    const pagination = this.page.getByTestId('pagination-controls');
    await expect(pagination).not.toBeVisible();
  }

  /**
   * Verify previous button is disabled
   */
  async expectPreviousButtonDisabled() {
    const prevButton = this.page.getByTestId('pagination-previous');
    await expect(prevButton).toBeDisabled();
  }

  /**
   * Check if next button is enabled
   */
  async isNextButtonEnabled(): Promise<boolean> {
    const nextButton = this.page.getByTestId('pagination-next');
    return await nextButton.isEnabled();
  }

  /**
   * Verify next button is disabled
   */
  async expectNextButtonDisabled() {
    const nextButton = this.page.getByTestId('pagination-next');
    await expect(nextButton).toBeDisabled();
  }

  /**
   * Count the number of group cards displayed
   */
  async getGroupCardCount(): Promise<number> {
    return await this.getGroupCards().count();
  }

  /**
   * Click the retry button in error state
   */
  async clickRetryButton() {
    const retryButton = this.page.getByTestId('retry-button');
    await retryButton.click();
  }

  /**
   * Verify groups are sorted by name (A-Z)
   */
  async expectGroupsSortedByNameAZ() {
    const cards = this.getGroupCards();
    const count = await cards.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const name = await cards.nth(i).getByTestId('group-card-name').textContent();
      if (name) names.push(name);
    }

    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  }

  /**
   * Verify groups are sorted by name (Z-A)
   */
  async expectGroupsSortedByNameZA() {
    const cards = this.getGroupCards();
    const count = await cards.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const name = await cards.nth(i).getByTestId('group-card-name').textContent();
      if (name) names.push(name);
    }

    const sortedNames = [...names].sort().reverse();
    expect(names).toEqual(sortedNames);
  }
}


