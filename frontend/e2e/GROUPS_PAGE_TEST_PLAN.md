# Groups Page E2E Test Plan

## Overview
This document outlines the comprehensive E2E testing strategy for the Groups page using Playwright. The tests follow the Page Object Model pattern and cover core functionality plus edge cases.

## Test Structure
- **Location**: `/frontend/e2e/groups.spec.ts`
- **Page Objects**: `/frontend/e2e/page-objects/GroupsPage.ts`
- **Fixtures**: Use existing `authenticatedPage` fixture from `/frontend/e2e/fixtures.ts`

---

## Test Categories

### 1. Authentication & Authorization
**Purpose**: Verify access control for the Groups page

#### Tests:
- [ ] **Redirects unauthenticated users to login**
  - Navigate to `/app/groups` without authentication
  - Expect redirect to `/login`
  - Verify URL is `/login`

- [ ] **Allows authenticated users to access page**
  - Use `authenticatedPage` fixture
  - Navigate to `/app/groups`
  - Verify page header is visible
  - Verify no redirect occurs

---

### 2. Page Load & Initial State
**Purpose**: Verify the page loads correctly with proper initial state

#### Tests:
- [ ] **Displays page header with "Groups" title**
  - Navigate to groups page
  - Verify `[data-testid="groups-page-header"]` contains "Groups"

- [ ] **Displays "Create Group" button in header**
  - Verify button is visible
  - Verify button has correct text

- [ ] **Displays search input and sort dropdown in toolbar**
  - Verify search input with placeholder "Search groups..."
  - Verify sort dropdown with default "Newest first"

- [ ] **Shows loading state on initial load**
  - Navigate to page
  - Verify loading skeleton/spinner appears briefly
  - Verify it disappears when data loads

- [ ] **Displays empty state when no groups exist**
  - Test with fresh user account (no groups)
  - Verify empty state message
  - Verify "Create your first group" CTA button
  - Verify clicking CTA opens create dialog

---

### 3. Create Group Functionality
**Purpose**: Test the complete group creation flow

#### Tests:
- [ ] **Opens create dialog when clicking "Create Group" button**
  - Click header "Create Group" button
  - Verify dialog is visible with title "Create Group"
  - Verify form fields are present

- [ ] **Displays all form fields correctly**
  - Verify "Group Name *" input field
  - Verify "Enable historical exclusions" checkbox (checked by default)
  - Verify "Lookback (draws)" input (visible by default)
  - Verify "Cancel" button
  - Verify "Create" button

- [ ] **Validates required group name field**
  - Open dialog
  - Leave name field empty
  - Click "Create" button
  - Verify error message "Group name is required"
  - Verify dialog remains open

- [ ] **Validates name length (max 100 characters)**
  - Type 101 characters in name field
  - Verify only 100 characters are accepted
  - Type valid name
  - Verify no error

- [ ] **Trims whitespace from group name**
  - Type "  Test Group  " (with leading/trailing spaces)
  - Submit form
  - Verify group is created with name "Test Group"

- [ ] **Toggles historical exclusions settings**
  - Open dialog
  - Verify lookback field is visible (checkbox checked by default)
  - Uncheck "Enable historical exclusions"
  - Verify lookback field is hidden
  - Check the checkbox again
  - Verify lookback field reappears

- [ ] **Validates lookback field when historical exclusions enabled**
  - Open dialog
  - Enter group name
  - Set lookback to 0
  - Blur field
  - Verify error "Lookback must be a positive integer"
  - Set lookback to valid value (1)
  - Verify error disappears

- [ ] **Creates group with valid data (historical exclusions enabled)**
  - Open dialog
  - Enter name "Test Group with Exclusions"
  - Keep historical exclusions enabled
  - Set lookback to 2
  - Click "Create"
  - Verify success toast "Group created successfully"
  - Verify navigation to `/app/groups/{groupId}/members`

- [ ] **Creates group with historical exclusions disabled**
  - Open dialog
  - Enter name "Test Group No Exclusions"
  - Uncheck "Enable historical exclusions"
  - Click "Create"
  - Verify success toast
  - Verify navigation to members page

- [ ] **Closes dialog on cancel button**
  - Open dialog
  - Enter some data
  - Click "Cancel"
  - Verify dialog closes
  - Verify data is cleared when reopening

- [ ] **Disables buttons during submission**
  - Open dialog
  - Enter valid data
  - Click "Create"
  - Verify button text changes to "Creating..."
  - Verify "Create" button is disabled
  - Verify "Cancel" button is disabled
  - Wait for completion

- [ ] **Handles API errors gracefully**
  - Mock API to return error (e.g., network error)
  - Attempt to create group
  - Verify error toast appears
  - Verify dialog remains open
  - Verify form data is preserved

---

### 4. Groups List Display
**Purpose**: Test the groups grid and individual group cards

#### Tests:
- [ ] **Displays groups in grid layout**
  - Create 3-4 groups
  - Verify groups appear in grid
  - Verify responsive layout (check grid classes)

- [ ] **Displays correct group information on cards**
  - Verify group name is displayed
  - Verify creation date is displayed
  - Verify member count (if available)
  - Verify card styling

- [ ] **Navigates to group details on card click**
  - Click on a group card
  - Verify navigation to `/app/groups/{groupId}`
  - Verify group details page loads

- [ ] **Displays groups in correct sort order**
  - Create multiple groups with different names
  - Verify default sort (newest first) displays correctly
  - Verify groups are in descending creation date order

---

### 5. Search Functionality
**Purpose**: Test search and filtering of groups

#### Tests:
- [ ] **Filters groups by search term**
  - Create groups: "Family Christmas", "Work Team", "Friends"
  - Type "Family" in search box
  - Verify only "Family Christmas" appears
  - Verify other groups are filtered out

- [ ] **Shows "No groups found" when search has no results**
  - Type search term with no matches (e.g., "NonexistentGroup")
  - Verify "No groups found" message
  - Verify message includes search term
  - Verify "Clear search" button appears

- [ ] **Clears search when clicking "Clear search" button**
  - Perform search with no results
  - Click "Clear search" button
  - Verify search input is cleared
  - Verify all groups are displayed again

- [ ] **Debounces search input**
  - Type quickly in search box
  - Verify API calls are debounced (not called for every keystroke)
  - Wait for debounce to complete
  - Verify results update

- [ ] **Trims search input**
  - Type "  Family  " (with spaces)
  - Verify search is performed with "Family"
  - Verify results are correct

- [ ] **Limits search input to 100 characters**
  - Type 101 characters
  - Verify only 100 characters are accepted
  - Verify search still works

- [ ] **Resets to page 1 when searching**
  - Navigate to page 2 of groups
  - Perform a search
  - Verify URL shows page=1
  - Verify results show first page

- [ ] **Preserves search term in URL params**
  - Search for "Family"
  - Verify URL contains `?search=Family`
  - Refresh page
  - Verify search term persists
  - Verify filtered results still show

- [ ] **Handles special characters in search**
  - Create group with special chars: "O'Reilly & Co."
  - Search for "O'Reilly"
  - Verify group is found
  - Search for "&"
  - Verify proper URL encoding

---

### 6. Sort Functionality
**Purpose**: Test sorting of groups list

#### Tests:
- [ ] **Sorts by newest first (default)**
  - Navigate to groups page
  - Verify sort dropdown shows "Newest first"
  - Verify groups are in descending date order

- [ ] **Sorts by oldest first**
  - Create groups at different times
  - Select "Oldest first" from dropdown
  - Verify groups are in ascending date order
  - Verify URL contains `?sort=created_at`

- [ ] **Sorts by name A-Z**
  - Create groups: "Zebra", "Alpha", "Mike"
  - Select "Name (A-Z)"
  - Verify groups appear as: Alpha, Mike, Zebra
  - Verify URL contains `?sort=name`

- [ ] **Sorts by name Z-A**
  - Select "Name (Z-A)"
  - Verify groups appear as: Zebra, Mike, Alpha
  - Verify URL contains `?sort=-name`

- [ ] **Preserves sort in URL params**
  - Select "Name (A-Z)"
  - Verify URL updates
  - Refresh page
  - Verify sort persists
  - Verify groups still sorted correctly

- [ ] **Resets to page 1 when changing sort**
  - Navigate to page 2
  - Change sort order
  - Verify URL shows page=1

- [ ] **Combines sort with search**
  - Search for "Team"
  - Change sort to "Name (A-Z)"
  - Verify both params in URL
  - Verify results are filtered AND sorted

---

### 7. Pagination
**Purpose**: Test pagination controls and navigation

#### Tests:
- [ ] **Displays pagination when groups exceed page size**
  - Create 15+ groups (default page size is 12)
  - Verify pagination controls appear
  - Verify page numbers are displayed
  - Verify next/previous buttons exist

- [ ] **Hides pagination when groups fit on one page**
  - Have less than 12 groups
  - Verify pagination controls do not appear

- [ ] **Navigates to next page**
  - Create 15+ groups
  - Click "Next" button (or page 2)
  - Verify URL updates to `?page=2`
  - Verify different groups are displayed
  - Verify page scrolls to top

- [ ] **Navigates to previous page**
  - Navigate to page 2
  - Click "Previous" button (or page 1)
  - Verify URL updates to `?page=1`
  - Verify first page groups are displayed

- [ ] **Disables previous button on first page**
  - Be on page 1
  - Verify "Previous" button is disabled or not clickable

- [ ] **Disables next button on last page**
  - Navigate to last page
  - Verify "Next" button is disabled or not clickable

- [ ] **Preserves search and sort when paginating**
  - Search for "Team"
  - Sort by "Name (A-Z)"
  - Navigate to page 2
  - Verify URL contains all params
  - Verify search and sort are maintained

- [ ] **Handles direct URL navigation to specific page**
  - Navigate to `/app/groups?page=2`
  - Verify page 2 is displayed
  - Verify pagination shows correct state

- [ ] **Handles invalid page numbers gracefully**
  - Navigate to `/app/groups?page=999`
  - Verify no crash
  - Verify appropriate handling (empty state or redirect to valid page)

- [ ] **Scrolls to top when page changes**
  - Scroll down on page 1
  - Click page 2
  - Verify window scrolls to top

---

### 8. Error Handling
**Purpose**: Test error states and recovery

#### Tests:
- [ ] **Displays error state when API fails**
  - Mock API to return 500 error
  - Navigate to groups page
  - Verify error message is displayed
  - Verify "Try again" or "Retry" button appears

- [ ] **Retries loading on retry button click**
  - Trigger error state
  - Click "Retry" button
  - Verify API is called again
  - Verify groups load if API succeeds

- [ ] **Handles network timeout gracefully**
  - Mock slow/timeout API response
  - Navigate to page
  - Verify loading state shows
  - Verify timeout error appears
  - Verify user can retry

- [ ] **Handles malformed API response**
  - Mock API to return invalid JSON
  - Navigate to page
  - Verify error is caught
  - Verify user-friendly error message

- [ ] **Maintains functionality after error recovery**
  - Trigger and recover from error
  - Perform normal operations (create, search, sort)
  - Verify everything works normally

---

### 9. Edge Cases
**Purpose**: Test boundary conditions and unusual scenarios

#### Tests:
- [ ] **Handles groups with very long names**
  - Create group with name at max length (100 chars)
  - Verify name displays properly (truncated if needed)
  - Verify card layout isn't broken
  - Verify full name in tooltip or details

- [ ] **Handles groups with minimal data**
  - Create group with only required fields
  - Verify card displays correctly
  - Verify no undefined/null rendering issues

- [ ] **Handles exactly 12 groups (edge of pagination)**
  - Create exactly 12 groups
  - Verify pagination does not appear
  - Create 13th group
  - Verify pagination now appears

- [ ] **Handles rapid consecutive actions**
  - Rapidly click create group multiple times
  - Verify requests are handled properly
  - Verify no duplicate groups
  - Verify UI doesn't break

- [ ] **Handles browser back/forward navigation**
  - Navigate through pages and filters
  - Use browser back button
  - Verify state is restored from URL
  - Use forward button
  - Verify state progresses correctly

- [ ] **Handles page refresh at various states**
  - Apply filters, search, and pagination
  - Refresh page
  - Verify state is restored from URL params
  - Verify data reloads correctly

- [ ] **Handles concurrent modifications**
  - Open page in two tabs
  - Create group in tab 1
  - Refresh/navigate in tab 2
  - Verify new group appears

- [ ] **Handles empty search term edge cases**
  - Type space-only search ("   ")
  - Verify it's treated as empty search
  - Verify all groups are shown

- [ ] **Handles URL manipulation**
  - Manually edit URL with invalid params
  - Examples: `?page=-1`, `?page=abc`, `?sort=invalid`
  - Verify app handles gracefully
  - Verify defaults are applied

- [ ] **Handles session expiry during actions**
  - Start creating a group
  - Expire session (mock 401)
  - Submit form
  - Verify redirect to login
  - Verify error message

---

### 10. Performance & UX
**Purpose**: Test performance and user experience aspects

#### Tests:
- [ ] **Loads page within acceptable time**
  - Navigate to page
  - Measure load time
  - Verify page is interactive within 2 seconds

- [ ] **Displays loading skeletons for better UX**
  - Navigate to page
  - Verify loading skeletons match grid layout
  - Verify smooth transition to actual data

- [ ] **Provides immediate feedback on actions**
  - Click create group
  - Verify button shows loading state immediately
  - Verify toast appears on success/failure

- [ ] **Keyboard navigation works properly**
  - Tab through page elements
  - Verify focus indicators are visible
  - Press Enter on "Create Group" button
  - Verify dialog opens
  - Press Escape in dialog
  - Verify dialog closes

- [ ] **Handles focus management in dialogs**
  - Open create dialog
  - Verify focus moves to first input
  - Close dialog
  - Verify focus returns to trigger button

---

### 11. Integration with Other Features
**Purpose**: Test navigation and integration with related features

#### Tests:
- [ ] **Navigates to group members page after creation**
  - Create a new group
  - Verify navigation to `/app/groups/{groupId}/members`
  - Verify members page loads

- [ ] **Navigates to group details page from card**
  - Click on a group card
  - Verify navigation to `/app/groups/{groupId}`
  - Verify group details page shows correct sections:
    - Members
    - Exclusions
    - Draws

- [ ] **Returns to groups page from details**
  - Navigate to group details
  - Click "Back to Groups" button
  - Verify return to groups list
  - Verify previous state is maintained (if applicable)

- [ ] **Maintains groups list cache when returning**
  - View groups list
  - Navigate to group details
  - Return to groups list
  - Verify data doesn't reload (uses cache)
  - Verify list state is maintained

---

## Test Data Management

### Setup Strategy:
1. **Use dedicated test database** for E2E tests
2. **Create test user** in `authenticatedPage` fixture
3. **Clean up test data** after each test or test suite
4. **Use unique identifiers** in group names for isolation

### Example Test Data:
```typescript
const testGroups = [
  { name: 'E2E Test - Family Christmas', historical_exclusions_enabled: true, lookback: 2 },
  { name: 'E2E Test - Work Secret Santa', historical_exclusions_enabled: false },
  { name: 'E2E Test - Friends Gift Exchange', historical_exclusions_enabled: true, lookback: 1 },
];
```

---

## Page Object Model

### GroupsPage Object Methods:
```typescript
class GroupsPage {
  async goto()
  async expectPageLoaded()
  async clickCreateGroupButton()
  async getGroupCards()
  async getGroupCardByName(name: string)
  async clickGroupCard(groupId: string)
  async searchGroups(term: string)
  async selectSort(option: string)
  async goToPage(pageNumber: number)
  async expectGroupVisible(name: string)
  async expectGroupNotVisible(name: string)
  async expectEmptyState()
  async expectErrorState()
  async expectLoadingState()
}

class CreateGroupDialog {
  async expectVisible()
  async fillGroupName(name: string)
  async toggleHistoricalExclusions()
  async setLookback(value: number)
  async clickCreate()
  async clickCancel()
  async expectError(field: string, message: string)
  async expectClosed()
}
```

---

## Test Execution Strategy

### Parallelization:
- Tests within categories can run in parallel
- Use `test.describe.configure({ mode: 'parallel' })` for independent tests
- Serial execution for tests with dependencies

### Test Isolation:
- Each test should create its own test data
- Use unique prefixes (e.g., timestamps) for group names
- Clean up created resources after tests

### CI/CD Considerations:
- Tests should pass consistently
- Retry failed tests 2 times in CI (configured in playwright.config.ts)
- Run tests on each PR
- Block merges if E2E tests fail

---

## Success Criteria

### Coverage Goals:
- ✅ 100% of core user flows tested
- ✅ 90%+ of edge cases covered
- ✅ All error states verified
- ✅ All navigation paths tested

### Quality Metrics:
- 0 flaky tests (deterministic results)
- < 5 minutes total execution time
- Clear, descriptive test names
- Maintainable page objects

---

## Implementation Priority

### Phase 1 (High Priority):
1. Authentication & Authorization
2. Page Load & Initial State
3. Create Group Functionality (happy paths)
4. Groups List Display
5. Navigation to details

### Phase 2 (Medium Priority):
6. Search Functionality
7. Sort Functionality
8. Pagination
9. Error Handling

### Phase 3 (Lower Priority):
10. Edge Cases
11. Performance & UX
12. Integration tests

---

## Notes

- Use `data-testid` attributes for reliable element selection
- Follow "Arrange, Act, Assert" pattern for test structure
- Keep tests independent and idempotent
- Mock API responses only when testing error states
- Use real API for happy paths to ensure end-to-end validation
- Add visual regression tests (screenshots) for critical flows
- Document any known limitations or deferred tests

