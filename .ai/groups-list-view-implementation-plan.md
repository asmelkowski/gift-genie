# View Implementation Plan: Groups List

## 1. Overview

The Groups List view displays a paginated list of gift exchange groups owned by the current user. It provides search, sorting, and filtering capabilities with URL-synced state, and allows users to create new groups and navigate to group details. The view emphasizes responsive design with support for both table and card layouts, empty states, and virtualization for performance with many groups.

## 2. View Routing

**Path**: `/app/groups`

**Route Configuration**: Already configured in `App.tsx` as a child route of the protected `/app` layout.

## 3. Component Structure

```
GroupsPage (main container)
├── PageHeader
│   ├── Title and description
│   └── CreateGroupButton
├── GroupsToolbar
│   ├── SearchInput
│   └── SortSelect
├── GroupsList (conditional rendering based on state)
│   ├── EmptyState (when no groups)
│   ├── LoadingState (when fetching)
│   ├── ErrorState (when error)
│   └── GroupsGrid (when data available)
│       └── GroupCard (for each group)
└── PaginationControls
```

## 4. Component Details

### GroupsPage (Main Container)

**Description**: Root component for the groups list view. Manages URL search parameters, fetches groups data, handles create group modal, and orchestrates child components.

**Main Elements**:
- `<div>` container with responsive padding
- `<PageHeader>` for title and create button
- `<GroupsToolbar>` for search and sort controls
- Conditional rendering for loading/error/empty/data states
- `<PaginationControls>` when data available
- `<CreateGroupDialog>` modal

**Handled Interactions**:
- URL parameter changes (search, sort, page)
- Create group button click
- Group card click (navigate to group detail)

**Handled Validation**:
- Validates query parameters from URL (page number, sort format)
- Sanitizes search input

**Types**:
- `GroupSummary` (from schema.d.ts)
- `PaginatedGroupsResponse` (from schema.d.ts)
- `GroupsQueryParams` (custom)

**Props**: None (root component)

### PageHeader

**Description**: Displays page title, description, and primary action button.

**Main Elements**:
- `<div>` flex container
- `<h1>` page title
- `<p>` description text
- `<Button>` create group button

**Handled Interactions**:
- Create button click (passed to parent)

**Handled Validation**: None

**Types**: None specific

**Props**:
```typescript
interface PageHeaderProps {
  onCreateClick: () => void;
}
```

### GroupsToolbar

**Description**: Contains search and sort controls with URL synchronization.

**Main Elements**:
- `<div>` flex container with responsive layout
- `<Input>` for search with debounce
- `<Select>` for sort options

**Handled Interactions**:
- Search input change (debounced 300ms)
- Sort selection change
- Both update URL parameters

**Handled Validation**:
- Trims whitespace from search input
- Validates sort values against allowed options

**Types**:
- `SortOption` (custom)

**Props**:
```typescript
interface GroupsToolbarProps {
  search: string;
  sort: string;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
}
```

### GroupsGrid

**Description**: Responsive grid layout for group cards.

**Main Elements**:
- `<div>` grid container with responsive columns (1 on mobile, 2 on tablet, 3 on desktop)

**Handled Interactions**:
- Forwards click events from child cards

**Handled Validation**: None

**Types**:
- `GroupSummary[]` (from schema.d.ts)

**Props**:
```typescript
interface GroupsGridProps {
  groups: GroupSummary[];
  onGroupClick: (groupId: string) => void;
}
```

### GroupCard

**Description**: Card displaying individual group information with click navigation.

**Main Elements**:
- `<Card>` component from ui/card
- `<CardHeader>` with group name
- `<CardContent>` with metadata:
  - Created date (formatted)
  - Historical exclusions status
  - Historical exclusions lookback count

**Handled Interactions**:
- Click on card navigates to group detail

**Handled Validation**: None

**Types**:
- `GroupSummary` (from schema.d.ts)
- `GroupCardViewModel` (custom, adds formatted dates)

**Props**:
```typescript
interface GroupCardProps {
  group: GroupSummary;
  onClick: (groupId: string) => void;
}
```

### EmptyState

**Description**: Displayed when user has no groups, provides guidance to create first group.

**Main Elements**:
- `<div>` centered container
- Icon or illustration
- `<h3>` title
- `<p>` description
- `<Button>` to create first group

**Handled Interactions**:
- Create group button click

**Handled Validation**: None

**Types**: None

**Props**:
```typescript
interface EmptyStateProps {
  onCreateClick: () => void;
}
```

### LoadingState

**Description**: Skeleton loader displayed while fetching groups.

**Main Elements**:
- Grid of skeleton cards matching actual card layout

**Handled Interactions**: None

**Handled Validation**: None

**Types**: None

**Props**: None

### ErrorState

**Description**: Error message with retry option.

**Main Elements**:
- `<Alert>` component from ui/alert
- Error message
- `<Button>` to retry

**Handled Interactions**:
- Retry button refetches data

**Handled Validation**: None

**Types**: None

**Props**:
```typescript
interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}
```

### PaginationControls

**Description**: Pagination UI with page info and navigation buttons.

**Main Elements**:
- `<div>` flex container
- Page info text (e.g., "Page 1 of 5")
- Previous/Next buttons
- Optional page number inputs for large datasets

**Handled Interactions**:
- Previous button click
- Next button click
- Direct page navigation (optional)

**Handled Validation**:
- Disables previous on first page
- Disables next on last page
- Validates page number input

**Types**:
- `PaginationMeta` (from schema.d.ts)

**Props**:
```typescript
interface PaginationControlsProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}
```

### CreateGroupDialog

**Description**: Modal dialog for creating a new group with form validation.

**Main Elements**:
- `<Dialog>` wrapper
- `<form>` with fields:
  - Group name (required, 1-100 chars)
  - Historical exclusions enabled (checkbox, default true)
  - Historical exclusions lookback (number input, default 1, min 1)
- Submit and cancel buttons
- Error messages

**Handled Interactions**:
- Form submission (creates group)
- Cancel button (closes dialog)
- Field changes (validates on blur)

**Handled Validation**:
- Group name: required, 1-100 characters, trimmed
- Historical exclusions lookback: positive integer >= 1
- Displays API validation errors

**Types**:
- `CreateGroupRequest` (from schema.d.ts)
- `GroupDetailResponse` (from schema.d.ts)

**Props**:
```typescript
interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (group: GroupDetailResponse) => void;
}
```

## 5. Types

### DTOs (from schema.d.ts)

```typescript
// From API schema
interface GroupSummary {
  id: string;
  name: string;
  created_at: string; // ISO 8601 date string
  historical_exclusions_enabled: boolean;
  historical_exclusions_lookback: number;
}

interface PaginatedGroupsResponse {
  data: GroupSummary[];
  meta: PaginationMeta;
}

interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface CreateGroupRequest {
  name: string;
  historical_exclusions_enabled?: boolean | null;
  historical_exclusions_lookback?: number | null;
}

interface GroupDetailResponse {
  id: string;
  name: string;
  admin_user_id: string;
  historical_exclusions_enabled: boolean;
  historical_exclusions_lookback: number;
  created_at: string;
  updated_at: string;
}
```

### Custom ViewModels

```typescript
// Query parameters from URL
interface GroupsQueryParams {
  search?: string;
  page?: number;
  page_size?: number;
  sort?: string;
}

// Sort options for dropdown
interface SortOption {
  value: string;
  label: string;
}

// View model for GroupCard with formatted data
interface GroupCardViewModel extends GroupSummary {
  formattedCreatedAt: string; // e.g., "Jan 15, 2024"
  statusLabel: string; // e.g., "Historical exclusions: 1 draw"
}

// Form state for CreateGroupDialog
interface CreateGroupFormData {
  name: string;
  historical_exclusions_enabled: boolean;
  historical_exclusions_lookback: number;
}
```

## 6. State Management

### URL State (via useSearchParams from react-router-dom)

All list filters and pagination are stored in URL parameters for:
- Direct linking
- Browser back/forward navigation
- Bookmark-ability

**Parameters**:
- `search`: string (group name search)
- `page`: number (default: 1)
- `page_size`: number (default: 12)
- `sort`: string (default: `-created_at`)

### Local Component State

**GroupsPage Component**:
- `isCreateDialogOpen`: boolean - Controls create group modal visibility

**GroupsToolbar Component**:
- `searchInputValue`: string - Local state for input (synced with URL on debounce)

**CreateGroupDialog Component**:
- `formData`: CreateGroupFormData - Form field values
- `errors`: Record<string, string> - Field validation errors
- `isSubmitting`: boolean - Form submission in progress

### Server State (via React Query)

Managed by `useGroupsQuery` custom hook:
- Fetches groups based on URL parameters
- Automatic caching and background refetching
- Loading, error, and success states
- Integrated with query invalidation on mutations

## 7. API Integration

### Custom Hook: useGroupsQuery

**Purpose**: Fetch paginated groups list with search and sort.

**Implementation**:
```typescript
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type PaginatedGroupsResponse = components['schemas']['PaginatedGroupsResponse'];

interface UseGroupsQueryParams {
  search?: string;
  page?: number;
  page_size?: number;
  sort?: string;
}

export const useGroupsQuery = (params: UseGroupsQueryParams) => {
  return useQuery({
    queryKey: ['groups', params],
    queryFn: async () => {
      const response = await api.get<PaginatedGroupsResponse>('/api/v1/groups', {
        params: {
          search: params.search || undefined,
          page: params.page || 1,
          page_size: params.page_size || 12,
          sort: params.sort || '-created_at',
        },
      });
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
};
```

**Request Type**: GET `/api/v1/groups`

**Query Parameters**:
- `search?: string` - Search by group name (partial match)
- `page?: number` - Page number (1-indexed)
- `page_size?: number` - Items per page
- `sort?: string` - Sort field (prefix with `-` for descending)

**Response Type**: `PaginatedGroupsResponse`

**Error Handling**:
- 401: Handled globally by axios interceptor (redirect to login)
- Network errors: Display error state with retry option

### Custom Hook: useCreateGroupMutation

**Purpose**: Create a new group and navigate to its detail page.

**Implementation**:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type CreateGroupRequest = components['schemas']['CreateGroupRequest'];
type GroupDetailResponse = components['schemas']['GroupDetailResponse'];

export const useCreateGroupMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: CreateGroupRequest) => {
      const response = await api.post<GroupDetailResponse>('/api/v1/groups', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created successfully');
      // Navigate to Members tab per PRD decision
      navigate(`/app/groups/${data.id}/members`);
    },
    onError: (error: AxiosError) => {
      const message = error.response?.data?.detail || 'Failed to create group';
      toast.error(message);
    },
  });
};
```

**Request Type**: POST `/api/v1/groups`

**Request Body**: `CreateGroupRequest`
```typescript
{
  name: string;
  historical_exclusions_enabled?: boolean | null;
  historical_exclusions_lookback?: number | null;
}
```

**Response Type**: `GroupDetailResponse` (201 Created)

**Error Responses**:
- 400: Invalid payload (validation errors)
- 401: Unauthorized

## 8. User Interactions

### Search Groups

1. User types in search input
2. Input value stored in local state immediately (responsive UI)
3. After 300ms debounce, URL parameter updated
4. React Query detects query key change and refetches
5. Results update in grid

### Sort Groups

1. User selects sort option from dropdown
2. URL parameter updated immediately
3. React Query refetches with new sort
4. Results re-render in new order

**Sort Options**:
- Name (A-Z): `name`
- Name (Z-A): `-name`
- Newest first: `-created_at` (default)
- Oldest first: `created_at`

### Paginate Results

1. User clicks Previous/Next button
2. Page number in URL updated
3. React Query refetches with new page
4. Scroll position resets to top
5. Pagination controls update

### Create Group

1. User clicks "Create Group" button
2. Modal dialog opens with form
3. User fills in:
   - Group name (required)
   - Historical exclusions enabled (checkbox, default checked)
   - Lookback count (number, default 1)
4. User clicks "Create"
5. Form validates:
   - Name: 1-100 chars, required
   - Lookback: >= 1 if exclusions enabled
6. If valid, POST to API
7. On success:
   - Modal closes
   - Success toast shown
   - Groups list refreshed
   - Navigate to `/app/groups/{id}/members`
8. On error:
   - Display error message in form
   - Keep modal open for corrections

### Navigate to Group Detail

1. User clicks on any group card
2. Navigate to `/app/groups/{groupId}` (or `/app/groups/{groupId}/members` based on routing structure)

## 9. Conditions and Validation

### API-Required Conditions

**List Groups (GET /api/v1/groups)**:
- User must be authenticated (401 if not)
- No other preconditions

**Create Group (POST /api/v1/groups)**:
- User must be authenticated (401 if not)
- Name: 1-100 characters, required (400 if invalid)
- Historical exclusions lookback: >= 1 if provided (400 if invalid)

### Frontend Validation

**GroupsToolbar**:
- Search input: Max 100 characters (warn user if exceeded)
- Sort value: Must be one of allowed options (validated on change)

**CreateGroupDialog**:
- Name field:
  - Required (show error on submit if empty)
  - 1-100 characters (show error on blur if invalid)
  - Auto-trim whitespace
- Historical exclusions lookback:
  - Only validated if historical exclusions enabled
  - Must be positive integer >= 1
  - Show error on blur if invalid
  - Disable input if historical exclusions unchecked

**PaginationControls**:
- Previous button: Disabled when page === 1
- Next button: Disabled when page === total_pages
- Page number validation: 1 <= page <= total_pages

## 10. Error Handling

### Network Errors

**Scenario**: API request fails due to network issues

**Handling**:
- Display `<ErrorState>` component with error message
- Provide "Retry" button that refetches data
- Log error to console for debugging

### Authentication Errors (401)

**Scenario**: User session expires

**Handling**:
- Global axios interceptor catches 401
- Clears auth state and query cache
- Shows toast: "Session expired. Please login again."
- Redirects to `/login`

### Validation Errors (400)

**Scenario**: Create group form submits invalid data

**Handling**:
- Parse error response for field-specific errors
- Display error messages next to relevant form fields
- Keep modal open for user to correct
- Focus first invalid field

### Empty State

**Scenario**: User has no groups yet

**Handling**:
- Display `<EmptyState>` with:
  - Friendly illustration
  - Message: "No groups yet"
  - Guidance: "Create your first gift exchange group to get started"
  - Prominent "Create Group" button

### No Search Results

**Scenario**: Search query returns no results

**Handling**:
- Display message: "No groups found matching '{search}'"
- Show "Clear search" button
- Keep search input visible for refinement

### Pagination Out of Range

**Scenario**: URL has invalid page number (e.g., page=999 when only 5 pages exist)

**Handling**:
- API returns empty data array
- Frontend detects page > total_pages
- Automatically redirect to last valid page
- Update URL parameter

## 11. Implementation Steps

### Step 1: Create Custom Hooks

1. Create `frontend/src/hooks/useGroupsQuery.ts`
   - Implement React Query hook for fetching groups
   - Handle query parameters
   - Configure caching strategy

2. Create `frontend/src/hooks/useCreateGroupMutation.ts`
   - Implement mutation for creating groups
   - Handle success navigation to members tab
   - Invalidate groups query cache

### Step 2: Implement Utility Components

1. Create `frontend/src/components/GroupsPage/LoadingState.tsx`
   - Skeleton loader grid matching card layout
   - Responsive skeleton cards

2. Create `frontend/src/components/GroupsPage/ErrorState.tsx`
   - Error alert with message
   - Retry button

3. Create `frontend/src/components/GroupsPage/EmptyState.tsx`
   - Centered layout with illustration
   - Create group call-to-action

### Step 3: Implement Data Display Components

1. Create `frontend/src/components/GroupsPage/GroupCard.tsx`
   - Card layout with group information
   - Format dates using `date-fns` or `Intl.DateTimeFormat`
   - Click handler for navigation

2. Create `frontend/src/components/GroupsPage/GroupsGrid.tsx`
   - Responsive grid container
   - Map over groups to render cards

### Step 4: Implement Control Components

1. Create `frontend/src/components/GroupsPage/PageHeader.tsx`
   - Title and create button layout

2. Create `frontend/src/components/GroupsPage/GroupsToolbar.tsx`
   - Search input with debounce (use `useDebouncedValue` hook)
   - Sort select with options
   - URL sync logic

3. Create `frontend/src/components/GroupsPage/PaginationControls.tsx`
   - Page info display
   - Previous/Next buttons
   - Update URL on page change

### Step 5: Implement Create Group Feature

1. Create `frontend/src/components/GroupsPage/CreateGroupDialog.tsx`
   - Dialog component (consider using Radix UI Dialog)
   - Form with controlled inputs
   - Validation logic
   - Integration with `useCreateGroupMutation`

### Step 6: Assemble Main Component

1. Update `frontend/src/components/GroupsPage.tsx`
   - Import all child components
   - Implement URL parameter management using `useSearchParams`
   - Connect to `useGroupsQuery`
   - Implement conditional rendering based on query state
   - Handle create group dialog state

### Step 7: Add URL Synchronization

1. Create utility functions for URL management:
   - `parseQueryParams`: Convert URLSearchParams to object
   - `updateQueryParams`: Update URL without full reload
   - `getDefaultParams`: Provide default values

2. Integrate in GroupsPage:
   - Read params on mount
   - Update params on user interactions
   - Sync with React Query key

### Step 8: Polish and Accessibility

1. Add loading states and transitions
2. Implement keyboard navigation
3. Add ARIA labels and roles
4. Test with screen reader
5. Ensure focus management in dialog

### Step 9: Testing

1. Test search functionality with various queries
2. Test sorting with all options
3. Test pagination edge cases (first page, last page, single page)
4. Test create group with valid and invalid data
5. Test empty state when no groups
6. Test error scenarios (network failure, validation errors)
7. Test responsive layout on mobile, tablet, desktop

### Step 10: Integration

1. Ensure routing is correct in App.tsx
2. Test navigation from groups list to group detail
3. Test navigation after creating new group to members tab
4. Verify query cache invalidation works correctly
5. Test browser back/forward with URL parameters
