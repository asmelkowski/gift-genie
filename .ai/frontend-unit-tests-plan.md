# Frontend Unit Tests Implementation Plan

## Overview

This document outlines a comprehensive plan for implementing ~80-100+ missing unit tests in the frontend application. Currently, only 6 test files exist. This plan prioritizes tests by business impact and implementation complexity.

**Current Test Coverage:** 6 test files (~42 tests total)
**Target Test Files:** ~35-40 test files (~120+ tests total)
**Estimated Effort:** 2-3 weeks for high-priority items

---

## 1. CRITICAL PRIORITY (Start Here)

### 1.1 Utility Functions - lib/drawUtils.ts ⭐⭐⭐

**File:** `frontend/src/lib/drawUtils.test.ts`

**Tests Needed (8 tests):**

- [ ] `formatDrawTimestamp()` - Formats date correctly for en-US locale
- [ ] `formatDrawTimestamp()` - Returns null when passed invalid date string
- [ ] `transformToDrawViewModel()` - Maps pending draw with no assignments to 'created' lifecycle
- [ ] `transformToDrawViewModel()` - Maps pending draw with assignments to 'executed' lifecycle
- [ ] `transformToDrawViewModel()` - Maps finalized draw to 'finalized' lifecycle
- [ ] `transformToDrawViewModel()` - Maps draw with notification_sent_at to 'notified' lifecycle
- [ ] `transformToDrawViewModel()` - Correctly sets canExecute, canFinalize, canNotify, canDelete flags
- [ ] `exportToCSV()` - Creates CSV blob and triggers download with correct filename
- [ ] `copyToClipboard()` - Uses navigator.clipboard when available
- [ ] `copyToClipboard()` - Falls back to textarea method when clipboard unavailable
- [ ] `shouldShowConfetti()` - Returns false when prefers-reduced-motion is set
- [ ] `shouldShowConfetti()` - Returns true when flag is set in sessionStorage
- [ ] `shouldShowConfetti()` - Returns false when flag is not in sessionStorage
- [ ] `clearConfettiFlag()` - Removes flag from sessionStorage

**Implementation Notes:**
- Use `vi.mock()` for browser APIs (navigator.clipboard, window.matchMedia, sessionStorage)
- Test date edge cases (timezones, different formats)
- This module contains critical business logic for draw state management

---

### 1.2 Utility Functions - lib/utils.ts ⭐

**File:** `frontend/src/lib/utils.test.ts`

**Tests Needed (3 tests):**

- [ ] `cn()` - Merges class names correctly with clsx
- [ ] `cn()` - Handles Tailwind class conflicts with twMerge
- [ ] `cn()` - Filters out undefined/null values

---

### 1.3 Authentication Store - hooks/useAuthStore.ts ⭐⭐⭐

**File:** `frontend/src/hooks/useAuthStore.test.ts`

**Tests Needed (6 tests):**

- [ ] Initial state has null user and null csrfToken
- [ ] `login()` stores user and csrfToken
- [ ] `logout()` clears user and csrfToken
- [ ] `isAuthenticated()` returns true when user is set
- [ ] `isAuthenticated()` returns false when user is null
- [ ] State persists across browser sessions (localStorage test)

**Implementation Notes:**
- Mock `zustand/middleware` persist
- Use `beforeEach` to reset store state
- Test persistence by checking localStorage

---

### 1.4 Core React Query Hooks (Queries) ⭐⭐⭐

**Files:** `frontend/src/hooks/use*Query.test.ts` (8 files)

**Hooks to test:**
1. `useGroupsQuery.ts`
2. `useGroupDetailsQuery.ts`
3. `useMembersQuery.ts`
4. `useExclusionsQuery.ts`
5. `useDrawsQuery.ts`
6. `useDrawQuery.ts`
7. `useAssignmentsQuery.ts`

**Tests per hook (3-4 tests each = 24 tests total):**

- [ ] Query key is correctly constructed
- [ ] Hook returns data when API succeeds
- [ ] Hook returns error state when API fails
- [ ] Hook respects enabled/disabled flag
- [ ] Query parameters are properly passed to API

**Implementation Notes:**
- Use `@tanstack/react-query` testing utilities
- Mock `lib/api.ts` functions
- Create wrapper with QueryClientProvider

---

### 1.5 Core React Query Hooks (Mutations) ⭐⭐⭐

**Files:** `frontend/src/hooks/use*Mutation.test.ts` (11 files)

**Hooks to test:**
1. `useCreateGroupMutation.ts`
2. `useCreateMemberMutation.ts`
3. `useUpdateMemberMutation.ts`
4. `useDeleteMemberMutation.ts`
5. `useCreateExclusionMutation.ts`
6. `useDeleteExclusionMutation.ts`
7. `useCreateBulkExclusionsMutation.ts`
8. `useCreateDrawMutation.ts`
9. `useExecuteDrawMutation.ts`
10. `useFinalizeDrawMutation.ts`
11. `useDeleteDrawMutation.ts`
12. `useNotifyDrawMutation.ts`

**Tests per mutation (3-4 tests each = 36 tests total):**

- [ ] Mutation calls correct API endpoint
- [ ] Mutation passes data correctly to API
- [ ] Mutation invalidates appropriate query keys on success
- [ ] Mutation handles error responses
- [ ] Mutation's onSuccess/onError callbacks work

**Implementation Notes:**
- Mock API functions and QueryClient
- Test query invalidation behavior
- Test error handling and callbacks

---

## 2. HIGH PRIORITY (Week 1-2)

### 2.1 Form Components ⭐⭐

**Files:** `frontend/src/components/*/[Component]Form.test.tsx`

#### 2.1.1 GroupsPage/CreateGroupDialog.test.tsx

**Tests Needed (8 tests):**

- [ ] Dialog renders with form fields (name, description)
- [ ] Validates required name field
- [ ] Submits with valid data
- [ ] Calls onSubmit callback with form data
- [ ] Calls onCancel when cancel button clicked
- [ ] Disables form while loading
- [ ] Shows error message on submission error
- [ ] Clears form after successful submission

---

#### 2.1.2 MembersPage/MemberForm.test.tsx

**Tests Needed (8 tests):**

- [ ] Renders form fields (name, email)
- [ ] Validates required fields
- [ ] Validates email format
- [ ] Populates form when editing existing member
- [ ] Submits form with correct data
- [ ] Calls onSubmit callback
- [ ] Disables form while loading
- [ ] Shows validation errors

---

#### 2.1.3 ExclusionsPage/ExclusionDialog.test.tsx

**Tests Needed (5 tests):**

- [ ] Dialog renders with ExclusionForm
- [ ] Passes members to form
- [ ] Calls onClose when dialog dismissed
- [ ] Handles form submission
- [ ] Shows loading state

---

### 2.2 Card Components ⭐⭐

**Files:** `frontend/src/components/*/[Component]Card.test.tsx`

#### 2.2.1 GroupsPage/GroupCard.test.tsx

**Tests Needed (6 tests):**

- [ ] Renders group name and member count
- [ ] Displays group creation date
- [ ] Click navigates to group details
- [ ] Shows edit/delete actions
- [ ] Edit action triggers edit callback
- [ ] Delete action triggers delete callback

---

#### 2.2.2 DrawsPage/DrawCard.test.tsx

**Tests Needed (8 tests):**

- [ ] Renders draw name and status
- [ ] Shows correct status label/color based on lifecycle
- [ ] Displays formatted timestamps
- [ ] Shows action buttons based on permissions (execute, finalize, notify, delete)
- [ ] Execute button triggers execute callback
- [ ] Finalize button triggers finalize callback
- [ ] Notify button triggers notify callback
- [ ] Delete button triggers delete callback

---

#### 2.2.3 MembersPage/MemberCard.test.tsx

**Tests Needed (5 tests):**

- [ ] Renders member name and email
- [ ] Shows active/inactive status
- [ ] Edit action triggers edit callback
- [ ] Delete action triggers delete callback
- [ ] Displays member join date

---

#### 2.2.4 ExclusionsPage/ExclusionCard.test.tsx (Already exists - add tests)

**Additional Tests Needed (3 tests):**

- [ ] Shows mutual exclusion badge
- [ ] Displays giver and receiver names
- [ ] Delete action works correctly

---

### 2.3 Grid/List Components ⭐⭐

**Files:** `frontend/src/components/*/[Component]Grid.test.tsx`

#### 2.3.1 GroupsPage/GroupsGrid.test.tsx

**Tests Needed (5 tests):**

- [ ] Renders empty state when no groups
- [ ] Maps groups to GroupCard components
- [ ] Passes onClick handler to cards
- [ ] Handles loading state
- [ ] Handles error state

---

#### 2.3.2 DrawsPage/DrawsGrid.test.tsx

**Tests Needed (5 tests):**

- [ ] Renders draws in grid layout
- [ ] Passes draw data to DrawCard components
- [ ] Handles empty state
- [ ] Handles loading state
- [ ] Handles error state

---

#### 2.3.3 MembersPage/MembersGrid.test.tsx

**Tests Needed (5 tests):**

- [ ] Renders members in grid
- [ ] Passes member data to MemberCard
- [ ] Handles empty state
- [ ] Handles loading state
- [ ] Handles error state

---

### 2.4 Toolbar Components ⭐

**Files:** `frontend/src/components/*/[Component]Toolbar.test.tsx`

#### 2.4.1 GroupsPage/GroupsToolbar.test.tsx

**Tests Needed (5 tests):**

- [ ] Renders search input
- [ ] Renders create group button
- [ ] Search input onChange triggers onSearch callback
- [ ] Create button triggers onCreate callback
- [ ] Shows filter options

---

#### 2.4.2 DrawsPage/DrawsToolbar.test.tsx

**Tests Needed (5 tests):**

- [ ] Renders search/filter controls
- [ ] Renders create draw button
- [ ] Filters work correctly
- [ ] Search filters draws
- [ ] Create button is clickable

---

#### 2.4.3 MembersPage/MembersToolbar.test.tsx

**Tests Needed (5 tests):**

- [ ] Renders search input
- [ ] Renders add member button
- [ ] Renders bulk actions (add exclusions)
- [ ] Search triggers onSearch callback
- [ ] Add button triggers onCreate callback

---

### 2.5 Table Component ⭐⭐

**File:** `frontend/src/components/DrawResultsPage/AssignmentsTable.test.tsx`

**Tests Needed (6 tests):**

- [ ] Renders table with headers
- [ ] Maps assignments to table rows
- [ ] Displays giver and receiver names correctly
- [ ] Handles empty assignments list
- [ ] Shows pagination when needed
- [ ] Exports button triggers export

---

## 3. MEDIUM PRIORITY (Week 2-3)

### 3.1 Dialog/Modal Components ⭐

**Files:** `frontend/src/components/DrawsPage/*.test.tsx`

#### 3.1.1 FinalizeConfirmationDialog.test.tsx

**Tests Needed (4 tests):**

- [ ] Renders confirmation message
- [ ] Confirms finalization on yes
- [ ] Cancels on no button
- [ ] Shows loading state while finalizing

---

#### 3.1.2 NotifyDrawDialog.test.tsx

**Tests Needed (4 tests):**

- [ ] Renders notification form
- [ ] Submits notification request
- [ ] Shows error if notification fails
- [ ] Closes dialog on success

---

#### 3.1.3 NotificationResultDialog.test.tsx

**Tests Needed (3 tests):**

- [ ] Shows notification success message
- [ ] Displays recipients count
- [ ] Close button works

---

### 3.2 Layout Components ⭐

**Files:** `frontend/src/components/AppLayout/*.test.tsx`

#### 3.2.1 AppLayout.test.tsx

**Tests Needed (3 tests):**

- [ ] Renders header and sidebar
- [ ] Renders children content
- [ ] Shows breadcrumbs

---

#### 3.2.2 Header.test.tsx

**Tests Needed (3 tests):**

- [ ] Renders app title/logo
- [ ] Renders user menu
- [ ] Mobile menu button visible on small screens

---

#### 3.2.3 Sidebar.test.tsx

**Tests Needed (4 tests):**

- [ ] Renders navigation links
- [ ] Active link has correct styling
- [ ] Links navigate to correct routes
- [ ] Collapses on mobile

---

#### 3.2.4 UserMenu.test.tsx

**Tests Needed (4 tests):**

- [ ] Renders user name
- [ ] Dropdown shows on click
- [ ] Shows logout button
- [ ] Logout triggers logout action

---

#### 3.2.5 Breadcrumb.test.tsx

**Tests Needed (3 tests):**

- [ ] Renders breadcrumb trail
- [ ] Links are clickable
- [ ] Shows current page as non-link

---

### 3.3 Custom Hooks ⭐

**Files:** `frontend/src/hooks/use*.test.ts` (parameter & layout hooks)

#### 3.3.1 useDrawsParams.test.ts

**Tests Needed (4 tests):**

- [ ] Parses URL query parameters
- [ ] Updates URL when parameters change
- [ ] Handles missing parameters
- [ ] Validates parameter types

---

#### 3.3.2 useMembersParams.test.ts

**Tests Needed (4 tests):**

- [ ] Parses pagination/filter params
- [ ] Updates URL on param change
- [ ] Provides default values
- [ ] Clears invalid parameters

---

#### 3.3.3 useGroupsParams.ts (in GroupsPage folder)

**Tests Needed (4 tests):**

- [ ] Parses URL parameters
- [ ] Updates URL on change
- [ ] Handles pagination
- [ ] Handles search term

---

#### 3.3.4 useBreadcrumbs.test.ts

**Tests Needed (4 tests):**

- [ ] Generates breadcrumbs from route
- [ ] Includes home link
- [ ] Shows current page last
- [ ] Handles nested routes

---

#### 3.3.5 useAppLayout.test.ts

**Tests Needed (3 tests):**

- [ ] Manages layout state
- [ ] Toggle sidebar visibility
- [ ] Persists layout preferences

---

### 3.4 State/Logic Components ⭐

#### 3.4.1 ProtectedRoute.test.tsx

**Tests Needed (4 tests):**

- [ ] Renders component when authenticated
- [ ] Redirects to login when not authenticated
- [ ] Shows loading state while checking auth
- [ ] Passes user info to protected component

---

#### 3.4.2 ErrorMessage.test.tsx

**Tests Needed (3 tests):**

- [ ] Renders error message
- [ ] Shows error icon
- [ ] Dismissal callback works

---

## 4. LOWER PRIORITY (Nice to Have)

### 4.1 Page Components ⭐

**Files:** `frontend/src/pages/*.test.tsx` and `frontend/src/components/*Page/*.test.tsx`

#### 4.1.1 LoginPage.test.tsx

**Tests Needed (2 tests):**

- [ ] Renders LoginForm
- [ ] Shows registration link

---

#### 4.1.2 ExclusionsPage/ExclusionsPage.test.tsx

**Tests Needed (3 tests):**

- [ ] Loads and displays exclusions
- [ ] Shows empty state when no exclusions
- [ ] Handles error state

---

### 4.2 UI Component Library ⭐

**Files:** `frontend/src/components/ui/*.test.tsx`

#### 4.2.1 button.test.tsx

**Tests Needed (3 tests):**

- [ ] Renders button with text
- [ ] Handles click events
- [ ] Disabled state works

---

#### 4.2.2 input.test.tsx

**Tests Needed (3 tests):**

- [ ] Renders input field
- [ ] Handles value changes
- [ ] Supports placeholder

---

#### 4.2.3 dialog.test.tsx

**Tests Needed (3 tests):**

- [ ] Opens/closes dialog
- [ ] Renders content
- [ ] Handles outside click

---

#### 4.2.4 card.test.tsx

**Tests Needed (2 tests):**

- [ ] Renders card with children
- [ ] Applies className correctly

---

### 4.3 Loading & Empty States ⭐

**Files:** Various component folders

- [ ] `LoadingState.test.tsx` files (5+ test files)
- [ ] `EmptyState.test.tsx` files (5+ test files)
- [ ] `ErrorState.test.tsx` files (5+ test files)
- [ ] `PaginationControls.test.tsx` files (3+ test files)

---

## 5. IMPLEMENTATION STRATEGY

### Phase 1: Foundation (Week 1)
**Goal:** Establish testing patterns and cover critical business logic

1. **Day 1-2:** Implement tests for `lib/drawUtils.ts` and `lib/utils.ts`
   - These define the testing patterns
   - No dependencies on other tests

2. **Day 3-4:** Implement `useAuthStore.test.ts`
   - Foundation for auth-dependent tests
   - Establishes mocking patterns for Zustand

3. **Day 5:** Implement 3-4 React Query hooks tests
   - Establish patterns for hooks testing
   - Create reusable test utilities

### Phase 2: Core Features (Week 1-2)
**Goal:** Test critical user workflows

4. Implement all remaining React Query hooks (queries + mutations)
5. Implement form components (Group, Member, Exclusion)
6. Implement card components (Group, Draw, Member)

### Phase 3: UI & Workflow (Week 2-3)
**Goal:** Complete remaining UI tests

7. Implement grid/toolbar/table components
8. Implement dialog components
9. Implement layout components
10. Implement custom hooks

### Phase 4: Polish (Week 3)
**Goal:** Fill gaps and reach target coverage

11. Implement page components
12. Implement UI library components
13. Implement state/loading components

---

## 6. TEST UTILITIES & SETUP

### Recommended Helper Functions

Create `frontend/src/test/test-utils.tsx`:

```typescript
// Query client setup for tests
export const createTestQueryClient = () => new QueryClient({ ... });

// Wrapper with providers
export const createTestWrapper = () => ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

// Mock API responses
export const mockApiResponse = (data, status = 200) => ({
  status,
  data,
});

// Mock mutation with callbacks
export const mockMutation = () => vi.fn();
```

### Mocking Strategy

- **API calls:** Mock `lib/api.ts` functions with `vi.mock()`
- **Browser APIs:** Use `vi.mock()` for localStorage, sessionStorage, clipboard
- **React Query:** Use `QueryClient` with `retry: false` in tests
- **Zustand:** Mock store creation or use real store with cleanup

---

## 7. SUCCESS CRITERIA

- [ ] All high-priority tests (Phase 1-2) pass
- [ ] Code coverage reaches 80%+ for key modules
- [ ] All form validations have test coverage
- [ ] All state mutations have test coverage
- [ ] All API hooks have test coverage
- [ ] All critical business logic (drawUtils) has 100% coverage

---

## 8. TRACKING

Use this checklist to mark progress:

### Phase 1 - Foundation ✅ COMPLETE
- [x] lib/drawUtils.test.ts (26 tests) ✅
- [x] lib/utils.test.ts (12 tests) ✅
- [x] hooks/useAuthStore.test.ts (9 tests) ✅
- [x] hooks/use*Query.test.ts x7 (46 tests) ✅
  - [x] useGroupsQuery.test.ts (8 tests)
  - [x] useGroupDetailsQuery.test.ts (7 tests)
  - [x] useMembersQuery.test.ts (6 tests)
  - [x] useExclusionsQuery.test.ts (6 tests)
  - [x] useDrawsQuery.test.ts (7 tests)
  - [x] useDrawQuery.test.ts (6 tests)
  - [x] useAssignmentsQuery.test.ts (6 tests)
- [x] hooks/use*Mutation.test.ts x12 (63 tests) ✅
  - [x] useCreateGroupMutation.test.ts (7 tests)
  - [x] useCreateMemberMutation.test.ts (7 tests)
  - [x] useUpdateMemberMutation.test.ts (5 tests)
  - [x] useDeleteMemberMutation.test.ts (6 tests)
  - [x] useCreateExclusionMutation.test.ts (5 tests)
  - [x] useDeleteExclusionMutation.test.ts (4 tests)
  - [x] useCreateBulkExclusionsMutation.test.ts (4 tests)
  - [x] useCreateDrawMutation.test.ts (5 tests)
  - [x] useDeleteDrawMutation.test.ts (5 tests)
  - [x] useExecuteDrawMutation.test.ts (4 tests)
  - [x] useFinalizeDrawMutation.test.ts (5 tests)
  - [x] useNotifyDrawMutation.test.ts (6 tests)

**Phase 1 Subtotal: 156 tests ✅ (102% of 77 target)**

### Phase 2 - Core Features (IN PROGRESS)
- [x] GroupsPage/CreateGroupDialog.test.tsx (13 tests) ✅
- [ ] MembersPage/MemberForm.test.tsx (8 tests)
- [ ] ExclusionsPage/ExclusionDialog.test.tsx (5 tests)
- [ ] GroupsPage/GroupCard.test.tsx (6 tests)
- [ ] DrawsPage/DrawCard.test.tsx (8 tests)
- [ ] MembersPage/MemberCard.test.tsx (5 tests)
- [ ] ExclusionsPage/ExclusionCard.test.tsx updates (3 tests)
- [ ] GroupsPage/GroupsGrid.test.tsx (5 tests)
- [ ] DrawsPage/DrawsGrid.test.tsx (5 tests)
- [ ] MembersPage/MembersGrid.test.tsx (5 tests)

**Phase 2 Progress: 13 of 58 tests (22%)**

### Phase 3 - UI & Workflow (STARTED)
- [x] ProtectedRoute.test.tsx (3 tests) ✅
- [x] ErrorMessage.test.tsx (3 tests) ✅
- [ ] Toolbar components (15 tests)
- [ ] DrawResultsPage/AssignmentsTable.test.tsx (6 tests)
- [ ] Dialog components (11 tests)
- [ ] Layout components (17 tests)
- [ ] Custom hooks (19 tests)

**Phase 3 Progress: 6 of 75 tests (8%)**

### Phase 4 - Polish
- [ ] Page components (5 tests)
- [ ] UI library components (11 tests)
- [ ] State/Loading components (15+ tests)

**Phase 4 Progress: 0 of 31+ tests**

---

## SUMMARY
- **Phase 1**: ✅ COMPLETE (156/156 tests)
- **Phase 2**: 🟠 IN PROGRESS (13/58 tests = 22%)
- **Phase 3**: 🔵 STARTED (6/75 tests = 8%)
- **Phase 4**: ⚪ NOT STARTED

**TOTAL COMPLETED: 175 tests across 25 test files (73% of 240+ target)**

**Next Priority:**
1. Grid components (GroupsGrid, DrawsGrid, MembersGrid) - 15 tests
2. Card components (GroupCard, DrawCard, MemberCard) - 19 tests
3. Form components (MemberForm, ExclusionDialog) - 13 tests
