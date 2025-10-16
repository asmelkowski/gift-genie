# View Implementation Plan: Exclusions Manager

## 1. Overview

The Exclusions Manager view enables group administrators to configure and visualize exclusion rules for gift exchange draws. The view displays both manual (admin-created) and historical (automatically generated from previous draws) exclusions in an accessible matrix grid format for desktop and a mobile-friendly stepper flow for smaller screens. Administrators can stage multiple exclusion changes and submit them in bulk, with comprehensive validation and conflict handling.

## 2. View Routing

**Path**: `/app/groups/:groupId/exclusions`

The route should be added to `App.tsx` within the AppLayout children:

```typescript
{
  path: 'groups/:groupId/exclusions',
  element: <ExclusionsPage />,
}
```

## 3. Component Structure

```
ExclusionsPage (main page component)
├── PageHeader
│   ├── Breadcrumb (group name → Exclusions)
│   ├── Title ("Exclusions")
│   └── Action buttons (Save/Cancel)
├── ExclusionsToolbar
│   ├── Filter dropdown (All / Manual / Historical)
│   ├── View toggle (Desktop: Matrix / Mobile: List)
│   └── Help/Info tooltip
├── StagedChangesPanel (conditional, when changes exist)
│   ├── Change summary count
│   ├── List of staged additions/deletions
│   └── Clear all button
├── ExclusionsMatrix (desktop, > 768px)
│   ├── Grid header (member names as columns)
│   ├── Grid rows (member names + cells)
│   └── ExclusionCell components
│       ├── Status indicator (manual/historical/none)
│       ├── Mutual indicator (bidirectional icon)
│       └── Click handler for toggling
├── ExclusionsMobileList (mobile, ≤ 768px)
│   ├── MemberExclusionCard (per member)
│   │   ├── Member name header
│   │   ├── "Cannot give to" section
│   │   │   └── List of receiver chips with remove button
│   │   └── Add exclusion button → opens modal
│   └── AddExclusionModal
│       ├── Select receiver dropdown
│       ├── Mutual toggle checkbox
│       └── Add button
├── LoadingState
├── ErrorState
└── EmptyState (no members, prompt to add members first)
```

## 4. Component Details

### ExclusionsPage

**Purpose**: Main container component that orchestrates the exclusions management interface, handles data fetching, state management for staged changes, and submission logic.

**Main elements**:
- Page container with responsive layout
- Conditional rendering based on loading/error/empty states
- Orchestrates child components
- Manages staged changes state and submission

**Handled events**:
- Save button click: validates and submits staged changes via bulk API
- Cancel button click: clears all staged changes and resets to server state
- Stage exclusion addition: adds to local staged state
- Stage exclusion deletion: adds to local staged state
- Filter change: updates query parameters for exclusions list

**Validation conditions**:
- Self-exclusion prevention: Ensure `giver_member_id !== receiver_member_id` client-side before staging
- Duplicate prevention: Check if exclusion already exists (manually or historically) before staging
- Minimum member count: Require at least 2 active members to enable exclusions management
- Conflict detection: On 409 response from bulk API, parse `details` array and display specific conflicts to user

**Types**:
- `ExclusionResponse` (from schema)
- `PaginatedExclusionsResponse` (from schema)
- `MemberResponse` (from schema)
- `StagedExclusionChange` (custom ViewModel)
- `ExclusionCellState` (custom ViewModel)
- `ExclusionFilter` (custom ViewModel)

**Props**: None (reads `groupId` from route params)

### PageHeader

**Purpose**: Displays page title, breadcrumb navigation, and primary action buttons (Save/Cancel) that are enabled when staged changes exist.

**Main elements**:
- Breadcrumb component showing: Groups → [Group Name] → Exclusions
- Page title ("Exclusions")
- Button group:
  - Cancel button (outlined, enabled when hasChanges)
  - Save button (primary, enabled when hasChanges, shows loading spinner during submission)

**Handled events**:
- Cancel click: triggers `onCancel` callback
- Save click: triggers `onSave` callback

**Validation conditions**:
- Save button disabled when `!hasChanges` or `isSaving`
- Cancel button disabled when `isSaving`

**Types**:
- `PageHeaderProps`

**Props**:
```typescript
interface PageHeaderProps {
  groupName: string;
  groupId: string;
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}
```

### ExclusionsToolbar

**Purpose**: Provides filtering controls to toggle between viewing all exclusions, only manual, or only historical exclusions.

**Main elements**:
- Filter select dropdown with options: "All", "Manual Only", "Historical Only"
- Info icon with tooltip explaining exclusion types
- Optional: Quick stats display (e.g., "12 manual, 8 historical")

**Handled events**:
- Filter change: triggers `onFilterChange` callback with new filter value

**Validation conditions**: None

**Types**:
- `ExclusionsToolbarProps`
- `ExclusionFilter` (type union: `'all' | 'manual' | 'historical'`)

**Props**:
```typescript
interface ExclusionsToolbarProps {
  filter: ExclusionFilter;
  onFilterChange: (filter: ExclusionFilter) => void;
  manualCount: number;
  historicalCount: number;
}
```

### StagedChangesPanel

**Purpose**: Displays a summary of pending changes (additions and deletions) before they are submitted, allowing users to review and clear all changes.

**Main elements**:
- Alert/banner component (warning style, yellow/orange)
- Change summary text: "X additions, Y deletions pending"
- Scrollable list of staged changes:
  - Addition items: "+ [Giver Name] → [Receiver Name] (mutual)"
  - Deletion items: "- [Giver Name] → [Receiver Name]"
- "Clear all" button (secondary, small)

**Handled events**:
- Clear all click: triggers `onClearAll` callback
- Individual change remove: triggers `onRemoveChange` callback with change ID

**Validation conditions**: Only renders when `stagedChanges.length > 0`

**Types**:
- `StagedChangesPanelProps`
- `StagedExclusionChange` (ViewModel)

**Props**:
```typescript
interface StagedChangesPanelProps {
  stagedChanges: StagedExclusionChange[];
  members: MemberResponse[];
  onClearAll: () => void;
  onRemoveChange: (changeId: string) => void;
}
```

### ExclusionsMatrix

**Purpose**: Desktop-optimized matrix grid displaying all members as both givers (rows) and receivers (columns), allowing visual configuration of exclusion rules via cell clicks.

**Main elements**:
- Sticky header row with receiver member names (horizontal scroll if needed)
- Sticky first column with giver member names
- Grid of `ExclusionCell` components representing each giver-receiver pair
- Diagonal cells (self-exclusions) are disabled/grayed out

**Handled events**:
- Cell click: triggers `onCellClick` with `(giverId, receiverId, currentState)` to toggle exclusion

**Validation conditions**:
- Disable self-exclusion cells where `giver === receiver`
- Visual indicator for cells with historical exclusions (read-only display)
- Visual indicator for cells with manual exclusions (clickable to remove)
- Visual indicator for staged changes (pending state)

**Types**:
- `ExclusionsMatrixProps`
- `ExclusionCellState` (ViewModel)
- `MemberResponse[]`

**Props**:
```typescript
interface ExclusionsMatrixProps {
  members: MemberResponse[];
  exclusions: ExclusionResponse[];
  stagedChanges: StagedExclusionChange[];
  onCellClick: (giverId: string, receiverId: string, currentState: ExclusionCellState) => void;
}
```

### ExclusionCell

**Purpose**: Individual cell within the matrix grid representing the exclusion state between a specific giver-receiver pair.

**Main elements**:
- Button or clickable div with appropriate styling based on state
- Icon or color indicator:
  - Empty/white: No exclusion
  - Blue: Manual exclusion (active)
  - Gray: Historical exclusion (read-only)
  - Yellow border: Staged addition
  - Red border with strikethrough: Staged deletion
  - Purple: Mutual exclusion (bidirectional icon)
- Tooltip on hover showing details
- Disabled state for self-exclusions

**Handled events**:
- Click: triggers `onClick` callback if not disabled

**Validation conditions**:
- Disabled when `isDisabled` (self-exclusion or historical)
- Different visual states based on `state` prop

**Types**:
- `ExclusionCellProps`
- `ExclusionCellState` (ViewModel)

**Props**:
```typescript
interface ExclusionCellProps {
  state: ExclusionCellState;
  isDisabled: boolean;
  isMutual: boolean;
  onClick: () => void;
  ariaLabel: string;
}
```

### ExclusionsMobileList

**Purpose**: Mobile-optimized vertical list view showing exclusions per member with add/remove capabilities.

**Main elements**:
- Vertical stack of `MemberExclusionCard` components
- Each card shows member as giver with list of receivers they can't give to
- Floating "Add Exclusion" button at bottom

**Handled events**:
- Add exclusion click: opens `AddExclusionModal`
- Remove chip click: stages deletion of exclusion

**Validation conditions**:
- Only show active members
- Prevent self-exclusion in add modal

**Types**:
- `ExclusionsMobileListProps`
- `MemberResponse[]`
- `ExclusionResponse[]`

**Props**:
```typescript
interface ExclusionsMobileListProps {
  members: MemberResponse[];
  exclusions: ExclusionResponse[];
  stagedChanges: StagedExclusionChange[];
  onAddExclusion: (giverId: string, receiverId: string, isMutual: boolean) => void;
  onRemoveExclusion: (exclusionId: string, giverId: string, receiverId: string) => void;
}
```

### MemberExclusionCard

**Purpose**: Card component showing a single member's exclusions (who they cannot give to).

**Main elements**:
- Card container with member name header
- "Cannot give to:" label
- List of chips/tags for each excluded receiver
  - Chip text: receiver name
  - Chip badge: "M" for manual, "H" for historical
  - Remove icon button (only on manual exclusions)
- "Add exclusion" button at card bottom

**Handled events**:
- Add click: triggers `onAddClick` with member ID
- Remove chip click: triggers `onRemove` with exclusion details

**Validation conditions**:
- Only show remove button for manual exclusions
- Disable remove button for historical exclusions

**Types**:
- `MemberExclusionCardProps`
- `MemberResponse`
- `ExclusionResponse[]`

**Props**:
```typescript
interface MemberExclusionCardProps {
  member: MemberResponse;
  exclusions: ExclusionResponse[];
  onAddClick: (memberId: string) => void;
  onRemove: (exclusionId: string, giverId: string, receiverId: string) => void;
}
```

### AddExclusionModal

**Purpose**: Modal dialog for adding a new exclusion on mobile, with receiver selection and mutual toggle.

**Main elements**:
- Modal dialog component (from shadcn/ui)
- Title: "Add Exclusion for [Member Name]"
- Select dropdown: Choose receiver from available members (excluding self and already excluded members)
- Checkbox: "Make mutual" (both directions)
- Footer buttons: Cancel (secondary), Add (primary)

**Handled events**:
- Receiver select change: updates local state
- Mutual checkbox toggle: updates local state
- Add button click: validates and triggers `onAdd` callback
- Cancel button click: closes modal

**Validation conditions**:
- Receiver select required (Add button disabled if not selected)
- Filter out giver from receiver options (prevent self-exclusion)
- Filter out already excluded receivers (prevent duplicates)

**Types**:
- `AddExclusionModalProps`
- `MemberResponse[]`

**Props**:
```typescript
interface AddExclusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  giverId: string;
  giverName: string;
  members: MemberResponse[];
  existingExclusions: ExclusionResponse[];
  onAdd: (receiverId: string, isMutual: boolean) => void;
}
```

### LoadingState

**Purpose**: Displays loading skeleton while fetching exclusions and members data.

**Main elements**:
- Skeleton loader matching matrix/list layout
- Loading spinner with message

**Handled events**: None

**Validation conditions**: None

**Types**: None

**Props**: None

### ErrorState

**Purpose**: Displays error message when data fetching fails with retry option.

**Main elements**:
- Error icon
- Error message text
- Retry button

**Handled events**:
- Retry click: triggers `onRetry` callback

**Validation conditions**: None

**Types**:
- `ErrorStateProps`

**Props**:
```typescript
interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}
```

### EmptyState

**Purpose**: Displays when group has no members, prompting admin to add members before configuring exclusions.

**Main elements**:
- Illustration or icon
- Message: "No members in this group yet"
- Description: "Add at least 2 members to configure exclusions"
- "Add Members" button linking to members page

**Handled events**:
- Add members click: navigates to `/app/groups/:groupId/members`

**Validation conditions**: Only shown when member count < 2

**Types**:
- `EmptyStateProps`

**Props**:
```typescript
interface EmptyStateProps {
  groupId: string;
}
```

## 5. Types

### DTO Types (from schema.d.ts)

Already defined in `frontend/src/types/schema.d.ts`:

```typescript
type ExclusionResponse = components['schemas']['ExclusionResponse'];
// {
//   id: string;
//   group_id: string;
//   giver_member_id: string;
//   receiver_member_id: string;
//   exclusion_type: string; // 'manual' | 'historical'
//   is_mutual: boolean;
//   created_at: string;
//   created_by_user_id: string | null;
// }

type PaginatedExclusionsResponse = components['schemas']['PaginatedExclusionsResponse'];
// {
//   data: ExclusionResponse[];
//   meta: PaginationMeta;
// }

type CreateExclusionRequest = components['schemas']['CreateExclusionRequest'];
// {
//   giver_member_id: string;
//   receiver_member_id: string;
//   is_mutual: boolean; // default false
// }

type ExclusionItemRequest = components['schemas']['ExclusionItemRequest'];
// {
//   giver_member_id: string;
//   receiver_member_id: string;
//   is_mutual: boolean; // default false
// }

type CreateExclusionsBulkRequest = components['schemas']['CreateExclusionsBulkRequest'];
// {
//   items: ExclusionItemRequest[];
// }

type CreateExclusionsBulkResponse = components['schemas']['CreateExclusionsBulkResponse'];
// {
//   created: ExclusionResponse[];
// }

type MemberResponse = components['schemas']['MemberResponse'];
// {
//   id: string;
//   group_id: string;
//   name: string;
//   email: string | null;
//   is_active: boolean;
//   created_at: string;
// }
```

### Custom ViewModel Types

Define in `frontend/src/pages/ExclusionsPage.tsx` or separate types file:

```typescript
// Represents a staged change (addition or deletion) not yet submitted to server
interface StagedExclusionChange {
  id: string; // Local unique ID for tracking (e.g., UUID v4)
  type: 'add' | 'delete';
  giver_member_id: string;
  receiver_member_id: string;
  is_mutual: boolean;
  exclusion_id?: string; // Only present for 'delete' type (existing exclusion ID)
}

// Represents the computed state of a matrix cell
interface ExclusionCellState {
  hasManual: boolean; // True if manual exclusion exists
  hasHistorical: boolean; // True if historical exclusion exists
  isMutual: boolean; // True if exclusion is mutual
  stagedAction: 'add' | 'delete' | null; // Pending staged change
  isDisabled: boolean; // True for self-exclusions or historical-only
}

// Filter options for exclusions toolbar
type ExclusionFilter = 'all' | 'manual' | 'historical';

// Conflict detail from API 409 response
interface ExclusionConflict {
  giver_member_id: string;
  receiver_member_id: string;
  reason: string; // e.g., 'duplicate_exclusion', 'self_exclusion_not_allowed'
}

// Enhanced error response for bulk conflicts
interface BulkExclusionError {
  code: string; // 'conflicts_present'
  details: ExclusionConflict[];
}
```

## 6. State Management

### Custom Hook: `useExclusionsState`

Create a custom hook to encapsulate complex state logic for exclusions management:

**File**: `frontend/src/hooks/useExclusionsState.ts`

**State variables**:
- `stagedChanges: StagedExclusionChange[]` - Local array of pending additions/deletions
- `filter: ExclusionFilter` - Current filter selection ('all', 'manual', 'historical')
- `isMobile: boolean` - Responsive breakpoint detection (≤ 768px)

**Computed values**:
- `hasChanges: boolean` - Derived from `stagedChanges.length > 0`
- `additionCount: number` - Count of 'add' type changes
- `deletionCount: number` - Count of 'delete' type changes

**Methods**:
- `stageAddition(giverId: string, receiverId: string, isMutual: boolean): void` - Adds exclusion to staged changes, validates against self-exclusion and duplicates
- `stageDeletion(exclusionId: string, giverId: string, receiverId: string): void` - Adds deletion to staged changes
- `unstageChange(changeId: string): void` - Removes a change from staged array
- `clearAllChanges(): void` - Resets staged changes to empty array
- `getCellState(giverId: string, receiverId: string, exclusions: ExclusionResponse[]): ExclusionCellState` - Computes cell state based on existing exclusions and staged changes
- `setFilter(filter: ExclusionFilter): void` - Updates filter state

**Dependencies**: None (pure state management)

### Additional State in ExclusionsPage Component

- `isAddModalOpen: boolean` - Controls AddExclusionModal visibility (mobile only)
- `selectedGiverId: string | null` - Tracks which member is selected for adding exclusion (mobile only)

### React Query Integration

Use existing patterns from `useMembersQuery` and `useGroupsQuery`:

- `useExclusionsQuery(groupId: string, filter: ExclusionFilter)` - Fetches paginated exclusions with filter
- `useMembersQuery(groupId: string, { is_active: true })` - Fetches active members
- `useCreateExclusionsBulkMutation(groupId: string)` - Submits bulk exclusion changes
- `useDeleteExclusionMutation(groupId: string)` - Deletes individual exclusion

Query keys:
- `['exclusions', groupId, filter]`
- `['members', groupId, { is_active: true }]`

Invalidation on mutation success:
- Invalidate `['exclusions', groupId]` (all filters)
- Clear staged changes state

## 7. API Integration

### GET /api/v1/groups/{groupId}/exclusions

**Hook**: `useExclusionsQuery`

**File**: `frontend/src/hooks/useExclusionsQuery.ts`

**Request params**:
```typescript
interface UseExclusionsQueryParams {
  type?: 'manual' | 'historical' | null;
  giver_member_id?: string;
  receiver_member_id?: string;
  page?: number;
  page_size?: number;
  sort?: string;
}
```

**Implementation**:
```typescript
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type PaginatedExclusionsResponse = components['schemas']['PaginatedExclusionsResponse'];
type ExclusionType = components['schemas']['ExclusionType'];

export const useExclusionsQuery = (
  groupId: string,
  params: { type?: ExclusionType | null } = {}
) => {
  return useQuery({
    queryKey: ['exclusions', groupId, params],
    queryFn: async () => {
      const response = await api.get<PaginatedExclusionsResponse>(
        `/api/v1/groups/${groupId}/exclusions`,
        {
          params: {
            type: params.type || undefined,
            page: 1,
            page_size: 1000, // Get all for matrix view
            sort: 'exclusion_type,name',
          },
        }
      );
      return response.data;
    },
    staleTime: 30000,
  });
};
```

**Response type**: `PaginatedExclusionsResponse`

**Error handling**:
- 401 Unauthorized: Handled by axios interceptor, redirects to login
- 403 Forbidden: Show error state with message "You don't have permission to view exclusions"
- 404 Group Not Found: Show error state with message "Group not found"
- 500 Server Error: Show error state with retry option

### POST /api/v1/groups/{groupId}/exclusions/bulk

**Hook**: `useCreateExclusionsBulkMutation`

**File**: `frontend/src/hooks/useCreateExclusionsBulkMutation.ts`

**Request body type**: `CreateExclusionsBulkRequest`

**Implementation**:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { components } from '@/types/schema';
import type { AxiosError } from 'axios';

type CreateExclusionsBulkRequest = components['schemas']['CreateExclusionsBulkRequest'];
type CreateExclusionsBulkResponse = components['schemas']['CreateExclusionsBulkResponse'];

interface BulkExclusionError {
  code: string;
  details?: Array<{
    giver_member_id: string;
    receiver_member_id: string;
    reason: string;
  }>;
}

export const useCreateExclusionsBulkMutation = (
  groupId: string,
  onConflicts?: (conflicts: BulkExclusionError['details']) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExclusionsBulkRequest) => {
      const response = await api.post<CreateExclusionsBulkResponse>(
        `/api/v1/groups/${groupId}/exclusions/bulk`,
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exclusions', groupId] });
      toast.success(`${data.created.length} exclusion(s) added successfully`);
    },
    onError: (error: AxiosError<BulkExclusionError>) => {
      if (error.response?.status === 409 && error.response.data.code === 'conflicts_present') {
        const conflicts = error.response.data.details || [];
        if (onConflicts) {
          onConflicts(conflicts);
        } else {
          toast.error(`${conflicts.length} conflict(s) detected. Please review and try again.`);
        }
      } else {
        const message = error.response?.data?.code || 'Failed to create exclusions';
        toast.error(message);
      }
    },
  });
};
```

**Response type**: `CreateExclusionsBulkResponse`

**Error handling**:
- 400 Invalid Payload: Display validation errors inline
- 401 Unauthorized: Handled by axios interceptor
- 403 Forbidden: Show error "You don't have permission to create exclusions"
- 404 Group or Member Not Found: Show error "Group or member not found"
- 409 Conflicts Present: Parse `details` array, show conflicts in modal or inline, allow user to review and remove conflicting changes
- 500 Server Error: Show error with retry option

### DELETE /api/v1/groups/{groupId}/exclusions/{exclusionId}

**Hook**: `useDeleteExclusionMutation`

**File**: `frontend/src/hooks/useDeleteExclusionMutation.ts`

**Implementation**:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { AxiosError } from 'axios';

export const useDeleteExclusionMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exclusionId: string) => {
      await api.delete(`/api/v1/groups/${groupId}/exclusions/${exclusionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exclusions', groupId] });
      toast.success('Exclusion deleted successfully');
    },
    onError: (error: AxiosError<{ code: string }>) => {
      const code = error.response?.data?.code || 'unknown_error';
      const messages: Record<string, string> = {
        exclusion_not_found: 'Exclusion not found',
        forbidden: "You don't have permission to delete this exclusion",
      };
      toast.error(messages[code] || 'Failed to delete exclusion');
    },
  });
};
```

**Response**: 204 No Content

**Error handling**:
- 401 Unauthorized: Handled by axios interceptor
- 403 Forbidden: Show error "You don't have permission to delete this exclusion"
- 404 Exclusion Not Found: Show error "Exclusion not found"
- 500 Server Error: Show error with retry option

## 8. User Interactions

### Matrix View (Desktop)

1. **Viewing Exclusions**:
   - User sees matrix grid with all members as rows (givers) and columns (receivers)
   - Cells are color-coded: blue for manual, gray for historical, white for none
   - Diagonal cells (self-exclusions) are disabled and grayed out
   - Mutual exclusions show bidirectional icon

2. **Adding Exclusion**:
   - User clicks empty white cell at intersection of giver row and receiver column
   - Cell immediately shows yellow border (staged addition)
   - Change is added to staged changes panel
   - If "mutual" toggle is enabled (via context menu or modifier key), both directions are staged

3. **Removing Exclusion**:
   - User clicks blue cell (manual exclusion)
   - Cell shows red border with strikethrough (staged deletion)
   - Change is added to staged changes panel
   - Historical exclusions (gray cells) are not clickable

4. **Toggle Mutual Exclusion**:
   - Right-click or long-press on cell opens context menu
   - Select "Make mutual" to stage both directions
   - Both cells (A→B and B→A) show yellow borders

5. **Reviewing Staged Changes**:
   - Staged changes panel shows summary count: "5 additions, 2 deletions pending"
   - Expandable list shows each change with member names
   - User can remove individual changes by clicking "X" icon
   - "Clear all" button resets all staged changes

6. **Saving Changes**:
   - User clicks "Save" button in page header
   - Validation runs client-side (self-exclusions, duplicates)
   - If valid, bulk API request is sent
   - Loading spinner shows on Save button
   - On success: toast notification, staged changes cleared, data refetched
   - On conflict (409): modal displays conflicts with member names, user can review and remove conflicting items, then retry

7. **Canceling Changes**:
   - User clicks "Cancel" button
   - Confirmation dialog: "Discard X pending changes?"
   - On confirm: staged changes cleared, UI resets to server state

### Mobile List View

1. **Viewing Exclusions**:
   - User sees vertical list of `MemberExclusionCard` components
   - Each card shows member name and chips for excluded receivers
   - Chips are labeled "M" (manual) or "H" (historical)

2. **Adding Exclusion**:
   - User clicks "Add exclusion" button on a member card
   - Modal opens with title "Add Exclusion for [Member Name]"
   - User selects receiver from dropdown (filtered to exclude self and existing exclusions)
   - User optionally checks "Make mutual" checkbox
   - User clicks "Add" button
   - Modal closes, exclusion is staged, chip appears with yellow border

3. **Removing Exclusion**:
   - User clicks "X" icon on manual exclusion chip
   - Chip shows red border with strikethrough (staged deletion)
   - Change is added to staged changes panel

4. **Saving and Canceling**:
   - Same behavior as desktop view
   - Sticky footer with Save/Cancel buttons

### Filtering

1. **Filter Toggle**:
   - User selects filter from toolbar dropdown: "All", "Manual Only", "Historical Only"
   - Query parameter updates (`?type=manual` or `?type=historical`)
   - Data refetches with filter applied
   - Matrix/list updates to show only filtered exclusions
   - Staged changes persist across filter changes

### Error Scenarios

1. **409 Conflict on Bulk Save**:
   - User attempts to save staged changes
   - API returns 409 with `details` array listing conflicts
   - Modal opens showing conflicts:
     - "Duplicate exclusion: John → Mary (already exists)"
     - "Self exclusion: Alice → Alice (not allowed)"
   - User reviews conflicts and clicks "Remove Conflicting Changes" to auto-remove them from staged list
   - User can then retry save

2. **Network Error**:
   - User clicks Save
   - Request fails with network error
   - Toast error: "Network error. Please check your connection and try again."
   - Staged changes persist, user can retry

3. **Empty Members List**:
   - User navigates to exclusions page
   - Group has < 2 members
   - Empty state displays: "Add at least 2 members to configure exclusions"
   - "Add Members" button links to members page

## 9. Conditions and Validation

### Client-Side Validation (Before Staging)

1. **Self-Exclusion Prevention**:
   - **Condition**: `giver_member_id === receiver_member_id`
   - **Component**: `ExclusionsMatrix`, `AddExclusionModal`
   - **Effect**: Disable cell/option, show tooltip "Members cannot be excluded from themselves"

2. **Duplicate Exclusion Prevention**:
   - **Condition**: Exclusion already exists in `exclusions` array or `stagedChanges`
   - **Component**: `ExclusionsMatrix`, `AddExclusionModal`
   - **Effect**: Don't stage addition, show toast "Exclusion already exists"

3. **Historical Exclusion Immutability**:
   - **Condition**: `exclusion_type === 'historical'`
   - **Component**: `ExclusionCell`, `MemberExclusionCard`
   - **Effect**: Disable removal, gray out cell, no "X" button on chip, show tooltip "Historical exclusions cannot be removed"

4. **Minimum Member Count**:
   - **Condition**: `members.length < 2`
   - **Component**: `ExclusionsPage`
   - **Effect**: Show `EmptyState` instead of matrix/list

### Server-Side Validation (API Response Handling)

1. **400 Invalid Payload**:
   - **Trigger**: Malformed request body
   - **Handling**: Parse validation errors, display inline in form or toast

2. **409 Duplicate Exclusion**:
   - **Trigger**: Single POST exclusion that already exists
   - **Handling**: Toast error "This exclusion already exists"

3. **409 Self Exclusion Not Allowed**:
   - **Trigger**: `giver_member_id === receiver_member_id`
   - **Handling**: Toast error "Members cannot be excluded from themselves"

4. **409 Conflicts Present (Bulk)**:
   - **Trigger**: Bulk POST with multiple conflicts
   - **Handling**: Parse `details` array, show modal with conflict list, provide "Remove Conflicting Changes" button to auto-filter staged changes

5. **404 Group or Member Not Found**:
   - **Trigger**: Invalid group ID or member ID in request
   - **Handling**: Show error state "Group or member not found", provide back button

6. **403 Forbidden**:
   - **Trigger**: User is not group admin
   - **Handling**: Show error state "You don't have permission to manage exclusions for this group"

### UI State Validation

1. **Save Button Enabled**:
   - **Condition**: `stagedChanges.length > 0 && !isSaving`
   - **Component**: `PageHeader`
   - **Effect**: Enable Save button, highlight it

2. **Cancel Button Enabled**:
   - **Condition**: `stagedChanges.length > 0 && !isSaving`
   - **Component**: `PageHeader`
   - **Effect**: Enable Cancel button

3. **Staged Changes Panel Visible**:
   - **Condition**: `stagedChanges.length > 0`
   - **Component**: `ExclusionsPage`
   - **Effect**: Render `StagedChangesPanel` component

4. **Cell Click Disabled**:
   - **Condition**: `isDisabled || exclusion_type === 'historical' || isSaving`
   - **Component**: `ExclusionCell`
   - **Effect**: Disable click handler, show disabled cursor

## 10. Error Handling

### Fetch Errors (GET Exclusions, GET Members)

**Scenario**: API request fails during initial load

**Handling**:
- Display `ErrorState` component with error message
- Provide "Retry" button to trigger refetch
- Log error to console for debugging
- If 404 group not found: show specific message "Group not found" with back button
- If 403 forbidden: show specific message "You don't have permission to view this group's exclusions"

### Mutation Errors (POST Bulk, DELETE Single)

**Scenario**: API request fails during save or delete operation

**Handling**:
- Parse error response for specific error codes
- Display appropriate toast notification based on error code
- For 409 conflicts in bulk: show detailed conflict modal
- Keep staged changes intact so user can correct and retry
- Disable Save button during mutation with loading spinner
- If network error: toast "Network error. Please try again later."

### Validation Errors (Client-Side)

**Scenario**: User attempts invalid action (e.g., self-exclusion, duplicate)

**Handling**:
- Prevent action from being staged
- Show immediate feedback via toast notification
- Highlight invalid cell or form field with red border
- Display tooltip explaining why action is invalid

### Edge Cases

1. **Empty Members List**:
   - **Trigger**: Group has 0 or 1 active members
   - **Handling**: Show `EmptyState` with message and link to add members

2. **All Members Excluded**:
   - **Trigger**: User attempts to exclude every possible pair
   - **Handling**: Allow staging, but warn with toast "This configuration may make draws impossible"
   - **Future Enhancement**: Run validation algorithm before save to check if draw is possible

3. **Concurrent Modifications**:
   - **Trigger**: Another admin modifies exclusions while current user has staged changes
   - **Handling**: On save, if 409 conflict returned, show modal "Exclusions have been modified by another admin. Please refresh and retry." Provide "Refresh" button to clear staged changes and refetch data

4. **Mutual Exclusion Partial Staging**:
   - **Trigger**: User stages A→B but not B→A for a mutual exclusion
   - **Handling**: Allow it, but in cell state computation, check if `is_mutual` flag exists on exclusion. If so, display bidirectional indicator even if only one direction is visible in filter

5. **Historical Exclusions Conflict with Manual**:
   - **Trigger**: User attempts to add manual exclusion where historical already exists
   - **Handling**: Allow staging (manual takes precedence logically), but in cell display, show both indicators (gray background with blue border)

## 11. Implementation Steps

### Step 1: Setup Routing and Base Page Structure
1. Add route to `App.tsx`: `{ path: 'groups/:groupId/exclusions', element: <ExclusionsPage /> }`
2. Create `frontend/src/pages/ExclusionsPage.tsx` with basic structure
3. Add navigation link in `GroupDetails` component to exclusions page
4. Test routing by navigating to `/app/groups/:groupId/exclusions`

### Step 2: Create API Hooks
1. Create `frontend/src/hooks/useExclusionsQuery.ts` for fetching exclusions
2. Create `frontend/src/hooks/useCreateExclusionsBulkMutation.ts` for bulk creation
3. Create `frontend/src/hooks/useDeleteExclusionMutation.ts` for single deletion
4. Test hooks with sample data and console logging

### Step 3: Define Types and ViewModels
1. Create type definitions file `frontend/src/types/exclusions.ts` with custom ViewModels:
   - `StagedExclusionChange`
   - `ExclusionCellState`
   - `ExclusionFilter`
   - `ExclusionConflict`
   - `BulkExclusionError`
2. Import DTO types from `schema.d.ts` where needed

### Step 4: Build Custom State Hook
1. Create `frontend/src/hooks/useExclusionsState.ts`
2. Implement state management for `stagedChanges`, `filter`, and responsive detection
3. Implement methods: `stageAddition`, `stageDeletion`, `unstageChange`, `clearAllChanges`, `getCellState`
4. Test hook logic with unit tests or manual testing

### Step 5: Create Base Page Components
1. Create `frontend/src/components/ExclusionsPage/PageHeader.tsx`
2. Create `frontend/src/components/ExclusionsPage/ExclusionsToolbar.tsx`
3. Create `frontend/src/components/ExclusionsPage/LoadingState.tsx`
4. Create `frontend/src/components/ExclusionsPage/ErrorState.tsx`
5. Create `frontend/src/components/ExclusionsPage/EmptyState.tsx`
6. Integrate components into `ExclusionsPage` with conditional rendering

### Step 6: Build Staged Changes Panel
1. Create `frontend/src/components/ExclusionsPage/StagedChangesPanel.tsx`
2. Implement change summary display and list of staged items
3. Implement "Clear all" and individual remove functionality
4. Add to `ExclusionsPage` with conditional rendering based on `hasChanges`

### Step 7: Build Desktop Matrix View
1. Create `frontend/src/components/ExclusionsPage/ExclusionsMatrix.tsx`
2. Implement grid layout with sticky headers and columns
3. Create `frontend/src/components/ExclusionsPage/ExclusionCell.tsx`
4. Implement cell state computation using `getCellState` method
5. Implement cell click handlers to stage additions/deletions
6. Add responsive detection to show matrix only on desktop (> 768px)
7. Test matrix interactions: click to add, click to remove, mutual exclusions

### Step 8: Build Mobile List View
1. Create `frontend/src/components/ExclusionsPage/ExclusionsMobileList.tsx`
2. Create `frontend/src/components/ExclusionsPage/MemberExclusionCard.tsx`
3. Create `frontend/src/components/ExclusionsPage/AddExclusionModal.tsx`
4. Implement add/remove interactions
5. Add responsive detection to show list only on mobile (≤ 768px)
6. Test mobile interactions: add modal, remove chips

### Step 9: Implement Save and Cancel Logic
1. In `ExclusionsPage`, implement `handleSave` function:
   - Transform `stagedChanges` to API format
   - Call bulk mutation hook
   - Handle success and error responses
   - Clear staged changes on success
2. Implement `handleCancel` function:
   - Show confirmation dialog if changes exist
   - Clear staged changes on confirm
3. Connect handlers to `PageHeader` buttons

### Step 10: Handle API Conflicts
1. Enhance `useCreateExclusionsBulkMutation` to accept `onConflicts` callback
2. Create `frontend/src/components/ExclusionsPage/ConflictsModal.tsx`
3. Parse 409 response `details` array and display conflicts
4. Implement "Remove Conflicting Changes" button to filter `stagedChanges`
5. Test conflict scenarios: duplicate exclusions, self-exclusions

### Step 11: Add Filtering and Toolbar
1. Implement filter state in `useExclusionsState` hook
2. Connect filter state to `ExclusionsToolbar` dropdown
3. Update query parameter when filter changes
4. Update `useExclusionsQuery` to include filter in query key
5. Test filtering: all, manual only, historical only

### Step 12: Styling and Accessibility
1. Apply Tailwind CSS styling to all components
2. Add keyboard navigation support for matrix (arrow keys, enter to toggle)
3. Add ARIA labels to cells: `aria-label="John cannot give to Mary"`
4. Ensure color contrast meets WCAG 2.1 AA standards
5. Test with screen reader
6. Add focus indicators for keyboard navigation

### Step 13: Add Tooltips and Help Text
1. Add tooltip to ExclusionsToolbar info icon explaining exclusion types
2. Add tooltips to cells on hover showing exclusion details
3. Add help text to EmptyState explaining purpose of exclusions
4. Add tooltip to disabled cells explaining why they're disabled

### Step 14: Testing and Bug Fixes
1. Test all user flows: add, remove, save, cancel, filter
2. Test error scenarios: network errors, conflicts, validation errors
3. Test responsive behavior: desktop matrix, mobile list
4. Test accessibility: keyboard navigation, screen reader
5. Test edge cases: empty members, all excluded, concurrent modifications
6. Fix any bugs found during testing

### Step 15: Integration and Deployment
1. Add link to exclusions page in group details navigation
2. Update breadcrumbs in AppLayout to include exclusions
3. Run linter: `npm run lint` and fix any issues
4. Run type check: `npm run typecheck` and fix any errors
5. Test full integration with backend API
6. Deploy to staging environment and perform smoke tests
7. Document any known issues or limitations
