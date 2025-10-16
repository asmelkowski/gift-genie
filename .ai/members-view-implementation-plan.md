# View Implementation Plan: Members Management

## 1. Overview

The Members view enables admins to manage group members who participate in gift exchanges. This view provides full CRUD operations (Create, Read, Update, Delete) for members, with support for filtering by active status, search by name/email, pagination, and inline editing of member details. Members are lightweight entities separate from app users, requiring only a name (unique within the group) and an optional email address.

## 2. View Routing

- **Path**: `/app/groups/:groupId/members`
- **Route Protection**: Requires authentication (wrapped in `ProtectedRoute`)
- **Parent Route**: `/app/groups/:groupId` (nested under group details)

## 3. Component Structure

```
MembersPage (page component)
├── PageHeader
│   ├── Breadcrumb navigation
│   ├── Page title
│   └── Add Member button
├── MembersToolbar
│   ├── Active status filter (All/Active/Inactive)
│   ├── Search input (name/email)
│   └── Sort dropdown
├── LoadingState (skeleton cards)
├── ErrorState (error message with retry)
├── EmptyState (no members message with CTA)
├── MembersGrid (grid of member cards)
│   └── MemberCard[] (individual member cards)
│       ├── Member name
│       ├── Member email (if provided)
│       ├── Active/Inactive badge
│       ├── Created date
│       ├── Edit button
│       └── Delete button (with confirmation)
├── PaginationControls
└── MemberDialog (create/edit modal)
    └── MemberForm
        ├── Name input (required, unique validation)
        ├── Email input (optional, unique validation)
        ├── Active status toggle
        ├── Cancel button
        └── Submit button
```

## 4. Component Details

### MembersPage

**Purpose**: Main container component orchestrating member list display, filtering, pagination, and member management operations.

**Main Elements**:
- Page layout container (`<div className="space-y-6">`)
- PageHeader component
- MembersToolbar component
- Conditional rendering of: LoadingState, ErrorState, EmptyState, or MembersGrid with PaginationControls
- MemberDialog component (controlled by `isDialogOpen` state)

**Handled Events**:
- Add member click → opens dialog in create mode
- Member card click → opens dialog in edit mode with pre-filled data
- Delete member click → shows confirmation, then deletes member
- Filter change → updates query params and refetches
- Search input → debounced update to query params
- Sort change → updates query params
- Page change → updates query params
- Dialog close → closes dialog and resets form state

**State Management**:
- `isDialogOpen: boolean` - Controls dialog visibility
- `editingMember: MemberResponse | null` - Stores member being edited (null for create mode)
- Query params via `useMembersParams` hook: `{ groupId, is_active, search, page, page_size, sort }`
- React Query state via `useMembersQuery` hook

**Types**:
- `MemberResponse` (from schema.d.ts)
- `MembersPageParams` (custom type for query params)

**Props**: None (top-level page component, reads groupId from URL params)

### PageHeader

**Purpose**: Displays page title, breadcrumb navigation, and primary action button.

**Main Elements**:
- Breadcrumb component showing: Home > Groups > {Group Name} > Members
- Page title (`<h1>`)
- "Add Member" button (primary variant)

**Handled Events**:
- Add button click → triggers `onAddClick` callback

**Types**: None (presentational)

**Props**:
```typescript
interface PageHeaderProps {
  groupName: string;
  groupId: string;
  onAddClick: () => void;
}
```

### MembersToolbar

**Purpose**: Provides filtering, search, and sort controls for the member list.

**Main Elements**:
- Active status filter: Button group or segmented control with options: "All", "Active", "Inactive"
- Search input with search icon and clear button
- Sort dropdown: "Name (A-Z)", "Name (Z-A)", "Newest First", "Oldest First"

**Handled Events**:
- Active status change → calls `onActiveFilterChange(boolean | null)`
- Search input change → calls `onSearchChange(string)` (debounced 300ms)
- Search clear → calls `onSearchChange('')`
- Sort change → calls `onSortChange(string)`

**Validation**: None (all inputs are optional filters)

**Types**:
- `is_active: boolean | null`
- `search: string`
- `sort: string`

**Props**:
```typescript
interface MembersToolbarProps {
  isActive: boolean | null;
  search: string;
  sort: string;
  onActiveFilterChange: (value: boolean | null) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
}
```

### MembersGrid

**Purpose**: Displays members in a responsive grid layout.

**Main Elements**:
- Grid container (`<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`)
- MemberCard components for each member

**Handled Events**:
- Card interactions delegated to child MemberCard components

**Types**:
- `MemberResponse[]`

**Props**:
```typescript
interface MembersGridProps {
  members: MemberResponse[];
  onMemberEdit: (member: MemberResponse) => void;
  onMemberDelete: (memberId: string) => void;
}
```

### MemberCard

**Purpose**: Displays individual member information with inline action buttons.

**Main Elements**:
- Card container (using Card component from ui/card)
- CardHeader: Member name with active/inactive badge
- CardContent:
  - Email address (with icon, or "No email" placeholder)
  - Created date (formatted: "Jan 15, 2024")
  - Action buttons row:
    - Edit button (outline variant with edit icon)
    - Delete button (destructive variant with trash icon)

**Handled Events**:
- Edit button click → calls `onEdit(member)`
- Delete button click → calls `onDelete(member.id)` after confirmation

**Validation**: None (display only)

**Types**:
- `MemberResponse`

**Props**:
```typescript
interface MemberCardProps {
  member: MemberResponse;
  onEdit: (member: MemberResponse) => void;
  onDelete: (memberId: string) => void;
}
```

### MemberDialog

**Purpose**: Modal dialog for creating or editing a member.

**Main Elements**:
- Dialog component (from ui/dialog)
- Dialog title: "Add Member" or "Edit Member"
- MemberForm component

**Handled Events**:
- Dialog close → calls `onClose` callback
- Form submission → handled by child MemberForm

**Types**:
- `MemberResponse | null` (null for create mode)

**Props**:
```typescript
interface MemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberResponse | null;
  groupId: string;
}
```

### MemberForm

**Purpose**: Form for creating or editing member details with validation.

**Main Elements**:
- Form element with `onSubmit` handler
- Name input field:
  - Label: "Name *"
  - Input component with maxLength={100}
  - Error message display
- Email input field:
  - Label: "Email (optional)"
  - Input component with type="email"
  - Error message display
- Active status toggle:
  - Checkbox or switch component
  - Label: "Active member"
  - Helper text: "Inactive members are excluded from draws"
- Form actions:
  - Cancel button (outline variant)
  - Submit button (primary variant): "Add Member" or "Save Changes"

**Handled Events**:
- Name input change → updates form state
- Name input blur → validates name (required, length, uniqueness check)
- Email input change → updates form state
- Email input blur → validates email (format, uniqueness if provided)
- Active toggle change → updates form state
- Form submit → validates all fields, calls API mutation

**Validation Conditions**:
1. **Name field**:
   - Required (cannot be empty after trim)
   - Length: 1-100 characters
   - Unique within group (case-insensitive check)
   - Display error immediately on blur if invalid
   - Display 409 conflict error from API if name exists

2. **Email field**:
   - Optional (can be empty)
   - If provided: valid email format (basic regex check)
   - If provided: unique within group (case-insensitive)
   - Display error on blur if format is invalid
   - Display 409 conflict error from API if email exists

3. **Form-level validation**:
   - Prevent submission if any field has errors
   - Disable submit button while mutation is pending
   - Show loading state on submit button during mutation

**Types**:
- `MemberFormData`: `{ name: string; email: string; is_active: boolean }`
- `MemberFormErrors`: `{ name?: string; email?: string }`
- `CreateMemberRequest` (from schema.d.ts)
- `UpdateMemberRequest` (from schema.d.ts)

**Props**:
```typescript
interface MemberFormProps {
  member: MemberResponse | null;
  groupId: string;
  onSuccess: () => void;
  onCancel: () => void;
}
```

### LoadingState

**Purpose**: Skeleton loading state while data is being fetched.

**Main Elements**:
- Grid container matching MembersGrid layout
- 6-9 skeleton card placeholders with pulsing animation

**Props**: None

### ErrorState

**Purpose**: Error message display with retry action.

**Main Elements**:
- Alert component (destructive variant)
- Error icon
- Error message text
- "Retry" button

**Handled Events**:
- Retry button click → calls `onRetry` callback

**Props**:
```typescript
interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}
```

### EmptyState

**Purpose**: Message displayed when no members exist in the group.

**Main Elements**:
- Empty state illustration or icon
- Heading: "No members yet"
- Description: "Add members to your group to start organizing gift exchanges"
- "Add Member" button (primary CTA)

**Handled Events**:
- Add button click → calls `onAddClick` callback

**Props**:
```typescript
interface EmptyStateProps {
  onAddClick: () => void;
}
```

### PaginationControls

**Purpose**: Navigation controls for paginated member list.

**Main Elements**:
- Page info: "Showing X-Y of Z members"
- Previous button (disabled on first page)
- Page number buttons (current page highlighted)
- Next button (disabled on last page)

**Handled Events**:
- Previous button click → calls `onPageChange(currentPage - 1)`
- Page number click → calls `onPageChange(pageNumber)`
- Next button click → calls `onPageChange(currentPage + 1)`

**Types**:
- `PaginationMeta` (from schema.d.ts)

**Props**:
```typescript
interface PaginationControlsProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}
```

## 5. Types

### Existing Types (from schema.d.ts)

```typescript
// Already defined in schema.d.ts
type MemberResponse = components['schemas']['MemberResponse'];
type CreateMemberRequest = components['schemas']['CreateMemberRequest'];
type UpdateMemberRequest = components['schemas']['UpdateMemberRequest'];
type PaginatedMembersResponse = components['schemas']['PaginatedMembersResponse'];
type PaginationMeta = components['schemas']['PaginationMeta'];
```

### New Custom Types

```typescript
// Query parameters for useMembersParams hook
interface MembersQueryParams {
  groupId: string;
  is_active?: boolean | null;
  search?: string;
  page?: number;
  page_size?: number;
  sort?: string;
}

// Form state for MemberForm component
interface MemberFormData {
  name: string;
  email: string;
  is_active: boolean;
}

// Form validation errors
interface MemberFormErrors {
  name?: string;
  email?: string;
}

// Active filter options
type ActiveFilterValue = boolean | null; // null = all, true = active, false = inactive
```

## 6. State Management

### Component-Level State

**MembersPage**:
- `isDialogOpen: boolean` - Dialog visibility (managed with useState)
- `editingMember: MemberResponse | null` - Member being edited (useState)
- Query params via custom hook `useMembersParams()` (encapsulates URL search params)

**MemberForm**:
- `formData: MemberFormData` - Form field values (useState)
- `errors: MemberFormErrors` - Field-level validation errors (useState)

### Custom Hooks

**useMembersParams()**:
- Purpose: Manages URL query parameters for filtering, search, pagination, and sorting
- Returns: `{ params: MembersQueryParams, updateParams: (updates: Partial<MembersQueryParams>) => void }`
- Implementation: Uses `useSearchParams` from react-router-dom
- Default values: `{ page: 1, page_size: 12, sort: 'name' }`

**useMembersQuery(groupId: string, params: MembersQueryParams)**:
- Purpose: Fetches paginated member list with filters
- Uses: `useQuery` from @tanstack/react-query
- Query key: `['members', groupId, params]`
- Stale time: 30000ms (30 seconds)
- Returns: `{ data, isLoading, error, refetch }`

**useCreateMemberMutation(groupId: string)**:
- Purpose: Creates a new member
- Uses: `useMutation` from @tanstack/react-query
- On success:
  - Invalidates `['members', groupId]` query
  - Shows success toast: "Member added successfully"
  - Keeps user on members page (decision from UX requirements)
  - Closes dialog
- On error:
  - Handles 409 conflicts (name/email already exists)
  - Shows error toast with API error message
  - Displays inline field errors for conflicts

**useUpdateMemberMutation(groupId: string)**:
- Purpose: Updates existing member
- Uses: `useMutation` from @tanstack/react-query
- On success:
  - Invalidates `['members', groupId]` query
  - Shows success toast: "Member updated successfully"
  - Closes dialog
- On error:
  - Handles 409 conflicts (name/email conflict, pending draw deactivation conflict)
  - Shows error toast with API error message
  - Displays inline field errors for conflicts

**useDeleteMemberMutation(groupId: string)**:
- Purpose: Deletes a member
- Uses: `useMutation` from @tanstack/react-query
- On success:
  - Invalidates `['members', groupId]` query
  - Shows success toast: "Member deleted successfully"
- On error:
  - Shows error toast with API error message

### Global State

No global state required. All data is managed through React Query cache and URL parameters.

## 7. API Integration

### Endpoints Used

**GET /api/v1/groups/{groupId}/members**
- Purpose: Fetch paginated member list
- Query params: `is_active?: boolean, search?: string, page?: number, page_size?: number, sort?: string`
- Request type: None (GET)
- Response type: `PaginatedMembersResponse`
- Error handling:
  - 401 Unauthorized → Redirect to login (handled by axios interceptor)
  - 404 Group not found → Show error state: "Group not found"
  - 403 Forbidden → Show error state: "You don't have permission to view this group"
  - Network errors → Show error state with retry button

**POST /api/v1/groups/{groupId}/members**
- Purpose: Create new member
- Request type: `CreateMemberRequest`
- Response type: `MemberResponse` (201 Created)
- Error handling:
  - 400 Invalid payload → Show validation errors inline
  - 409 Email conflict → Show error on email field: "This email is already used by another member"
  - 409 Name conflict → Show error on name field: "This name is already used by another member"
  - 401 Unauthorized → Redirect to login
  - 404 Group not found → Show toast error
  - 403 Forbidden → Show toast error

**PATCH /api/v1/groups/{groupId}/members/{memberId}**
- Purpose: Update member details
- Request type: `UpdateMemberRequest`
- Response type: `MemberResponse` (200 OK)
- Error handling:
  - 400 Invalid payload → Show validation errors inline
  - 409 Email conflict → Show error on email field
  - 409 Name conflict → Show error on name field
  - 409 Cannot deactivate (pending draw) → Show alert dialog with message: "Cannot deactivate this member because they are part of a pending draw. Please finalize or delete the draw first."
  - 401 Unauthorized → Redirect to login
  - 404 Member not found → Show toast error
  - 403 Forbidden → Show toast error

**DELETE /api/v1/groups/{groupId}/members/{memberId}**
- Purpose: Delete member (cascades exclusions)
- Request type: None
- Response type: None (204 No Content)
- Error handling:
  - 401 Unauthorized → Redirect to login
  - 404 Member not found → Show toast error (ignore silently if already deleted)
  - 403 Forbidden → Show toast error

### API Client Setup

All API calls use the configured `api` instance from `@/lib/api` with:
- Base URL from environment variable
- `withCredentials: true` for cookie-based auth
- CSRF token in request headers for mutations
- Axios interceptors for 401 handling

### Example API Call

```typescript
// In useMembersQuery hook
const response = await api.get<PaginatedMembersResponse>(
  `/api/v1/groups/${groupId}/members`,
  {
    params: {
      is_active: params.is_active ?? undefined,
      search: params.search || undefined,
      page: params.page || 1,
      page_size: params.page_size || 12,
      sort: params.sort || 'name',
    },
  }
);
return response.data;
```

## 8. User Interactions

### Viewing Members

1. User navigates to `/app/groups/:groupId/members`
2. Page loads with loading skeleton
3. Members are fetched and displayed in grid
4. Each card shows: name, email (if provided), active status badge, created date, and action buttons

### Filtering Members

1. User clicks "Active" or "Inactive" filter button
2. URL updates with `?is_active=true` or `?is_active=false`
3. Member list refetches with filter applied
4. Active filter button is highlighted
5. "All" button removes the filter

### Searching Members

1. User types in search input
2. After 300ms debounce, URL updates with `?search={query}`
3. Member list refetches with search applied
4. If no results, show "No members found matching '{query}'" message
5. User can clear search with X button in input or "Clear search" link

### Adding a Member

1. User clicks "Add Member" button in header or empty state
2. Dialog opens with empty form
3. User enters member name (required)
4. User enters email (optional)
5. User toggles active status (default: active)
6. User clicks "Add Member" button
7. Form validates:
   - Name is required and within length limits
   - Email format is valid (if provided)
8. If validation passes, mutation is called
9. On success:
   - Dialog closes
   - Toast shows: "Member added successfully"
   - Member list refetches
   - User stays on members page
10. On error (409 conflict):
    - Error appears under relevant field
    - User corrects the issue and resubmits

### Editing a Member

1. User clicks "Edit" button on member card
2. Dialog opens with form pre-filled with member data
3. User modifies name, email, or active status
4. User clicks "Save Changes" button
5. Form validates (same rules as add)
6. If validation passes, mutation is called
7. On success:
   - Dialog closes
   - Toast shows: "Member updated successfully"
   - Member list refetches
   - Member card updates with new data
8. On error (409 conflict or pending draw):
   - Appropriate error message is shown
   - User takes corrective action

### Deactivating a Member

1. User clicks "Edit" on a member card
2. User unchecks "Active member" toggle
3. User clicks "Save Changes"
4. If member is part of a pending draw:
   - Error alert shows: "Cannot deactivate this member because they are part of a pending draw"
   - User must finalize or delete the draw first
5. If no conflict:
   - Member is deactivated
   - Member card shows "Inactive" badge
   - If "Active" filter is applied, member disappears from list

### Deleting a Member

1. User clicks "Delete" button on member card
2. Confirmation dialog appears:
   - Title: "Delete Member"
   - Message: "Are you sure you want to delete {name}? This will also remove any exclusion rules involving this member. This action cannot be undone."
   - Actions: "Cancel" and "Delete" (destructive)
3. User confirms deletion
4. Mutation is called
5. On success:
   - Toast shows: "Member deleted successfully"
   - Member card is removed from grid
   - Member list refetches
6. On error:
   - Toast shows error message

### Pagination

1. User sees "Showing 1-12 of 45 members" at bottom
2. User clicks "Next" or page number button
3. URL updates with `?page=2`
4. Page scrolls to top
5. Member list refetches for new page
6. New members are displayed

### Sorting

1. User clicks sort dropdown
2. User selects "Name (A-Z)" or "Newest First"
3. URL updates with `?sort=name` or `?sort=-created_at`
4. Member list refetches with new sort order
5. Members are reordered accordingly

## 9. Conditions and Validation

### Client-Side Validation

**Name Field**:
- Trigger: On blur and on form submit
- Conditions:
  - Required: `name.trim().length > 0` → Error: "Name is required"
  - Length: `1 <= name.trim().length <= 100` → Error: "Name must be between 1 and 100 characters"
- Visual feedback: Red border on input, error text below field
- Blocks submission: Yes

**Email Field**:
- Trigger: On blur and on form submit (only if email is provided)
- Conditions:
  - Format (if provided): Basic email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` → Error: "Please enter a valid email address"
- Visual feedback: Red border on input, error text below field
- Blocks submission: Yes (if email is provided but invalid)

### Server-Side Validation (API Errors)

**409 Name Conflict**:
- API response: `{ "detail": "name_conflict_in_group" }`
- Handling: Display error under name field: "This name is already used by another member in this group"
- User action: Change name and resubmit

**409 Email Conflict**:
- API response: `{ "detail": "email_conflict_in_group" }`
- Handling: Display error under email field: "This email is already used by another member in this group"
- User action: Change email or leave empty, then resubmit

**409 Cannot Deactivate (Pending Draw)**:
- API response: `{ "detail": "cannot_deactivate_due_to_pending_draw" }`
- Handling: Display alert dialog with message and action guidance
- User action: Keep member active, or finalize/delete the pending draw first

**400 Invalid Payload**:
- API response: Validation error details
- Handling: Map errors to relevant form fields
- User action: Correct invalid fields and resubmit

### UI State Conditions

**Empty State Display**:
- Condition: `members.length === 0 && !search && !is_active`
- Result: Show EmptyState component with "Add Member" CTA

**No Results Display**:
- Condition: `members.length === 0 && (search || is_active !== null)`
- Result: Show "No members found" message with clear filters option

**Loading State**:
- Condition: `isLoading === true`
- Result: Show LoadingState with skeleton cards

**Error State**:
- Condition: `error !== null`
- Result: Show ErrorState with retry button

**Pagination Visibility**:
- Condition: `meta.total_pages > 1`
- Result: Show PaginationControls

**Delete Button Disabled**:
- Condition: `mutation.isPending === true`
- Result: Disable delete button during deletion

**Form Submit Disabled**:
- Condition: `hasErrors || mutation.isPending`
- Result: Disable submit button

## 10. Error Handling

### Network Errors

**Scenario**: API request fails due to network issues
- Detection: Axios throws network error
- Handling: Show ErrorState component with error message
- User action: Click "Retry" button to refetch
- Prevention: None (user's network issue)

### Authentication Errors (401)

**Scenario**: User session expires during operation
- Detection: API returns 401 status
- Handling: Axios interceptor clears query cache and redirects to `/login`
- User feedback: Toast message: "Session expired. Please login again."
- Prevention: None (handled automatically)

### Authorization Errors (403)

**Scenario**: User attempts to access group they don't own
- Detection: API returns 403 status
- Handling: Show ErrorState with message: "You don't have permission to view this group"
- User action: Navigate back to groups list
- Prevention: None (server-side authorization)

### Resource Not Found (404)

**Scenario**: Group or member no longer exists
- Detection: API returns 404 status
- Handling:
  - Group not found: Show ErrorState with message
  - Member not found: Show toast error and refresh list
- User action: Navigate back or refresh
- Prevention: None (concurrent modifications possible)

### Validation Errors (400)

**Scenario**: Client-side validation missed an issue
- Detection: API returns 400 with validation details
- Handling: Map error details to form fields, display inline errors
- User action: Correct invalid fields and resubmit
- Prevention: Comprehensive client-side validation

### Conflict Errors (409)

**Scenario**: Name or email already exists in group
- Detection: API returns 409 with conflict type
- Handling:
  - `name_conflict_in_group`: Show error under name field
  - `email_conflict_in_group`: Show error under email field
  - `cannot_deactivate_due_to_pending_draw`: Show alert dialog with guidance
- User action: Modify conflicting field or resolve blocking condition
- Prevention: None (concurrent modifications possible)

### Unexpected Errors (500)

**Scenario**: Server-side error during operation
- Detection: API returns 5xx status code
- Handling: Show toast error: "Something went wrong. Please try again."
- User action: Retry operation or refresh page
- Prevention: None (server-side issue)

### Form Validation Errors

**Scenario**: User submits form with invalid data
- Detection: Client-side validation in form submit handler
- Handling: Display errors under relevant fields, focus first error
- User action: Correct errors and resubmit
- Prevention: Validation on blur provides early feedback

### Optimistic Update Failures

**Scenario**: Mutation fails after optimistic UI update
- Detection: Mutation onError callback
- Handling: React Query automatically reverts optimistic update, shows error toast
- User action: Review error message and retry if appropriate
- Prevention: Use conservative optimistic updates only for delete operations

## 11. Implementation Steps

### Step 1: Set Up Routing and Page Structure
1. Add route in `App.tsx`: `<Route path="/app/groups/:groupId/members" element={<MembersPage />} />`
2. Create `src/pages/MembersPage.tsx` with basic structure
3. Create `src/components/MembersPage/` directory for subcomponents
4. Verify route navigation from groups list

### Step 2: Create Custom Hooks for Data Management
1. Create `src/hooks/useMembersParams.ts`:
   - Implement URL search params management
   - Handle query param parsing and updates
   - Set default values
2. Create `src/hooks/useMembersQuery.ts`:
   - Implement React Query hook for fetching members
   - Configure query key, stale time, and error handling
3. Create `src/hooks/useCreateMemberMutation.ts`:
   - Implement mutation with success/error handling
   - Configure cache invalidation
4. Create `src/hooks/useUpdateMemberMutation.ts`:
   - Implement mutation with conflict error handling
5. Create `src/hooks/useDeleteMemberMutation.ts`:
   - Implement mutation with confirmation and success feedback

### Step 3: Build Presentational Components (Bottom-Up)
1. Create `src/components/MembersPage/LoadingState.tsx`:
   - Skeleton cards in grid layout
2. Create `src/components/MembersPage/ErrorState.tsx`:
   - Error message with retry button
3. Create `src/components/MembersPage/EmptyState.tsx`:
   - Empty state message with CTA
4. Create `src/components/MembersPage/MemberCard.tsx`:
   - Card layout with member details
   - Action buttons (edit, delete)
5. Create `src/components/MembersPage/MembersGrid.tsx`:
   - Grid container with MemberCard components
6. Create `src/components/MembersPage/PaginationControls.tsx`:
   - Reuse pattern from GroupsPage/PaginationControls.tsx
7. Create `src/components/MembersPage/PageHeader.tsx`:
   - Breadcrumb, title, and add button

### Step 4: Build Interactive Components
1. Create `src/components/MembersPage/MembersToolbar.tsx`:
   - Active status filter buttons
   - Search input with debounce
   - Sort dropdown
2. Create `src/components/MembersPage/MemberForm.tsx`:
   - Form with validation logic
   - Name, email, and active status inputs
   - Submit and cancel handlers
3. Create `src/components/MembersPage/MemberDialog.tsx`:
   - Dialog wrapper for MemberForm
   - Handle create/edit modes

### Step 5: Integrate Components in MembersPage
1. Wire up MembersPage with custom hooks
2. Implement conditional rendering logic:
   - Loading state → LoadingState component
   - Error state → ErrorState component
   - Empty state → EmptyState component
   - Success state → MembersToolbar + MembersGrid + PaginationControls
3. Handle dialog open/close state
4. Pass callbacks to child components

### Step 6: Implement Delete Confirmation
1. Add confirmation dialog logic to MembersPage
2. Create confirmation dialog UI (reuse Dialog component)
3. Wire up delete mutation with confirmation flow

### Step 7: Add Form Validation
1. Implement client-side validation in MemberForm:
   - Name required and length validation
   - Email format validation
   - Validation on blur and submit
2. Add error state display under form fields
3. Implement form submission blocking when errors exist

### Step 8: Handle API Errors
1. Add error handling in mutation hooks:
   - Map 409 conflicts to form field errors
   - Show toast for general errors
   - Handle pending draw deactivation conflict with alert
2. Test error scenarios (name conflict, email conflict, deactivation blocked)

### Step 9: Implement Search and Filter
1. Add debounced search in MembersToolbar
2. Wire up active status filter with query params
3. Add sort functionality
4. Test filter combinations and URL updates

### Step 10: Add Pagination
1. Wire up PaginationControls with query params
2. Implement page change handler
3. Add scroll-to-top on page change
4. Test pagination with various page sizes

### Step 11: Polish UI and Accessibility
1. Add loading states to buttons during mutations
2. Ensure proper focus management (dialog open/close, form submission)
3. Add ARIA labels to interactive elements
4. Test keyboard navigation
5. Add proper disabled states
6. Test responsive layout on mobile/tablet/desktop

### Step 12: Test Edge Cases
1. Test with no members (empty state)
2. Test with exactly 1 page of members
3. Test with many pages of members
4. Test search with no results
5. Test filter with no results
6. Test concurrent edits (409 conflicts)
7. Test deactivation with pending draw
8. Test delete with existing exclusions
9. Test session expiration during operation

### Step 13: Final Integration and Navigation
1. Update GroupDetails page with link to members view
2. Ensure breadcrumb navigation works correctly
3. Test navigation flow: Groups → Group Details → Members
4. Verify back navigation preserves filters/pagination
5. Test deep linking to members page with filters in URL
