# View Implementation Plan: Group Draws & Draw Results

## 1. Overview

This implementation plan covers two interconnected views:
- **Group Draws View** (`/app/groups/:groupId/draws`): Create and manage draws with full lifecycle management (Create → Execute → Finalize → Notify)
- **Draw Results View** (`/app/draws/:drawId/results`): Display finalized draw assignments with export functionality

The Group Draws view enables admins to create draws, execute the algorithm, finalize results, and send notifications through a stepped workflow. The Draw Results view provides a read-only interface for viewing finalized assignments with member names and export capabilities.

## 2. View Routing

### Group Draws View
- **Path**: `/app/groups/:groupId/draws`
- **Access**: Authenticated users who own the group
- **Breadcrumb**: Home > Groups > [Group Name] > Draws

### Draw Results View
- **Path**: `/app/draws/:drawId/results`
- **Access**: Authenticated users who own the group associated with the draw
- **Breadcrumb**: Home > Groups > [Group Name] > Draws > Draw Results
- **Restrictions**: Only accessible for finalized draws; redirects to 404 for pending draws

## 3. Component Structure

### Group Draws View Hierarchy
```
DrawsPage (page component)
├── PageHeader
│   ├── Breadcrumb (from AppLayout)
│   └── CreateDrawButton
├── DrawsToolbar
│   ├── StatusFilter (All / Pending / Finalized)
│   └── SortSelect (Created Date / Finalized Date / Status)
├── LoadingState
├── ErrorState
├── EmptyState
├── DrawsGrid
│   └── DrawCard (multiple)
│       ├── DrawStatusBadge
│       ├── DrawTimestamps
│       ├── DrawActions
│       │   ├── ExecuteButton (pending only)
│       │   ├── FinalizeButton (pending with assignments)
│       │   ├── NotifyButton (finalized only)
│       │   ├── ViewResultsButton (finalized only)
│       │   └── DeleteButton (pending only)
│       └── DrawLifecycleStepper
└── PaginationControls
```

### Draw Results View Hierarchy
```
DrawResultsPage (page component)
├── PageHeader
│   ├── Breadcrumb
│   └── ExportActions
│       ├── CopyToClipboardButton
│       └── ExportCSVButton
├── DrawMetadata
│   ├── DrawInfo (status, timestamps)
│   └── GroupInfo (name, member count)
├── LoadingState
├── ErrorState
├── AssignmentsToolbar
│   ├── SearchInput (filter by giver/receiver name)
│   └── SortSelect (Giver Name / Receiver Name)
├── AssignmentsTable
│   └── AssignmentRow (multiple)
│       ├── GiverCell
│       ├── ArrowIcon
│       └── ReceiverCell
└── ConfettiOverlay (shows on first load after finalization)
```

## 4. Component Details

### DrawsPage (Main Page Component)
- **Component description**: Main container for the draws view; manages pagination, filtering, sorting, and orchestrates all draw lifecycle operations
- **Main elements**:
  - `PageHeader` with title "Draws" and description
  - `CreateDrawButton` triggering draw creation
  - `DrawsToolbar` for filtering and sorting
  - Conditional rendering: LoadingState / ErrorState / EmptyState / DrawsGrid
  - `PaginationControls` for navigation
- **Handled interactions**:
  - Create draw (POST to `/api/v1/groups/{groupId}/draws`)
  - Execute draw (POST to `/api/v1/draws/{drawId}/execute`)
  - Finalize draw (POST to `/api/v1/draws/{drawId}/finalize`)
  - Notify draw (POST to `/api/v1/draws/{drawId}/notify`)
  - Delete draw (DELETE to `/api/v1/draws/{drawId}`)
  - Filter by status (pending/finalized/all)
  - Sort draws (created_at, finalized_at)
  - Paginate results
- **Handled validation**:
  - Execute: Only enabled for pending draws without assignments
  - Finalize: Only enabled for pending draws with generated assignments; shows confirmation dialog warning about immutability
  - Notify: Only enabled for finalized draws; shows option to resend
  - Delete: Only enabled for pending draws; shows confirmation dialog
  - View Results: Only enabled for finalized draws
- **Types**:
  - `DrawResponse` (from schema.d.ts)
  - `PaginatedDrawsResponse` (from schema.d.ts)
  - `ExecuteDrawResponse` (from schema.d.ts)
  - `NotifyDrawResponse` (from schema.d.ts)
  - `DrawViewModel` (custom)
- **Props**: None (uses route params)

### PageHeader
- **Component description**: Header section displaying page title, description, and primary action button
- **Main elements**:
  - `h1` with "Draws" title
  - `p` with description text
  - `CreateDrawButton` (primary action)
- **Handled interactions**:
  - Create draw button click
- **Handled validation**: None
- **Types**:
  - `onCreateClick: () => void`
  - `groupId: string`
- **Props**:
  - `groupId: string` - Group ID for creating draws
  - `groupName?: string` - Optional group name for display
  - `onCreateClick: () => void` - Handler for create button

### DrawsToolbar
- **Component description**: Toolbar containing filter and sort controls
- **Main elements**:
  - Status filter dropdown (All/Pending/Finalized)
  - Sort select dropdown (Created Date desc, Created Date asc, Status)
- **Handled interactions**:
  - Filter change
  - Sort change
- **Handled validation**: None
- **Types**:
  - `status: 'all' | 'pending' | 'finalized'`
  - `sort: string`
- **Props**:
  - `status: 'all' | 'pending' | 'finalized'`
  - `onStatusChange: (status: 'all' | 'pending' | 'finalized') => void`
  - `sort: string`
  - `onSortChange: (sort: string) => void`

### DrawCard
- **Component description**: Card displaying single draw with status, timestamps, lifecycle stepper, and action buttons
- **Main elements**:
  - Card container
  - `DrawStatusBadge` (pending/finalized)
  - `DrawTimestamps` (created_at, finalized_at, notification_sent_at)
  - `DrawLifecycleStepper` visual progress indicator
  - `DrawActions` button group
- **Handled interactions**:
  - Execute draw (shows loading overlay during execution)
  - Finalize draw (shows confirmation dialog)
  - Notify draw (shows resend option if already notified)
  - View results (navigates to results page)
  - Delete draw (shows confirmation dialog)
- **Handled validation**:
  - Execute button: `status === 'pending' && !hasAssignments`
  - Finalize button: `status === 'pending' && hasAssignments`
  - Notify button: `status === 'finalized'` (badge if already notified)
  - View Results button: `status === 'finalized'`
  - Delete button: `status === 'pending'`
- **Types**:
  - `DrawViewModel` (extends DrawResponse with computed properties)
- **Props**:
  - `draw: DrawViewModel`
  - `onExecute: (drawId: string) => Promise<void>`
  - `onFinalize: (drawId: string) => Promise<void>`
  - `onNotify: (drawId: string, resend: boolean) => Promise<void>`
  - `onDelete: (drawId: string) => Promise<void>`
  - `onViewResults: (drawId: string) => void`
  - `isLoading: boolean`

### DrawLifecycleStepper
- **Component description**: Visual stepper showing draw lifecycle progress (Create → Execute → Finalize → Notify)
- **Main elements**:
  - Four steps with icons and labels
  - Progress indicators (completed/current/pending)
  - Connecting lines between steps
- **Handled interactions**: None (display only)
- **Handled validation**: None
- **Types**:
  - `DrawResponse`
  - `StepState: 'completed' | 'current' | 'pending'`
- **Props**:
  - `draw: DrawResponse`

### ExecuteDrawLoadingOverlay
- **Component description**: Full-screen overlay with loading spinner during draw execution
- **Main elements**:
  - Semi-transparent backdrop
  - Loading spinner
  - Progress message
- **Handled interactions**: None (blocking)
- **Handled validation**: None
- **Types**: None
- **Props**:
  - `isVisible: boolean`
  - `message?: string`

### FinalizeConfirmationDialog
- **Component description**: Confirmation dialog warning about draw immutability before finalization
- **Main elements**:
  - Dialog title "Finalize Draw?"
  - Warning message about immutability
  - Cancel button
  - Confirm button
- **Handled interactions**:
  - Cancel (closes dialog)
  - Confirm (triggers finalize)
- **Handled validation**: None
- **Types**: None
- **Props**:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `onConfirm: () => void`
  - `isLoading: boolean`

### NotifyDrawDialog
- **Component description**: Dialog for sending notifications with resend option
- **Main elements**:
  - Dialog title "Send Notifications"
  - Information about notification
  - Resend checkbox (if notifications already sent)
  - Cancel button
  - Send button
- **Handled interactions**:
  - Toggle resend option
  - Cancel (closes dialog)
  - Send (triggers notify)
- **Handled validation**:
  - Shows resend warning if `notification_sent_at` is not null
- **Types**:
  - `NotifyDrawResponse`
- **Props**:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `onConfirm: (resend: boolean) => Promise<void>`
  - `draw: DrawResponse`
  - `isLoading: boolean`

### NotificationResultDialog
- **Component description**: Dialog showing notification send results (sent/skipped counts)
- **Main elements**:
  - Dialog title "Notifications Sent"
  - Success message with counts
  - Close button
- **Handled interactions**:
  - Close dialog
- **Handled validation**: None
- **Types**:
  - `NotifyDrawResponse`
- **Props**:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `result: NotifyDrawResponse`

### ErrorGuidanceAlert
- **Component description**: Alert displaying guidance for 422 errors (no valid configuration)
- **Main elements**:
  - Alert container
  - Error icon
  - Error message
  - Guidance text (check exclusions, member count)
  - Action buttons (View Exclusions, View Members)
- **Handled interactions**:
  - Navigate to exclusions view
  - Navigate to members view
- **Handled validation**: None
- **Types**: None
- **Props**:
  - `error: string`
  - `groupId: string`

### DrawResultsPage (Main Page Component)
- **Component description**: Main container for draw results view; displays finalized assignments with export functionality
- **Main elements**:
  - `PageHeader` with breadcrumb and export actions
  - `DrawMetadata` showing draw and group information
  - `AssignmentsToolbar` for search and sort
  - `AssignmentsTable` displaying giver-receiver pairs
  - `ConfettiOverlay` (on first load after finalization)
- **Handled interactions**:
  - Search assignments by name
  - Sort assignments (by giver/receiver name)
  - Copy all assignments to clipboard
  - Export assignments as CSV
- **Handled validation**:
  - Only accessible for finalized draws (`status === 'finalized'`)
  - Redirects to 404 if draw not found or not finalized
  - Requires `include=names` query parameter for API call
- **Types**:
  - `DrawResponse` (from schema.d.ts)
  - `AssignmentResponse` (from schema.d.ts)
  - `ListAssignmentsResponse` (from schema.d.ts)
- **Props**: None (uses route params)

### DrawMetadata
- **Component description**: Section displaying draw and group metadata
- **Main elements**:
  - Draw status badge
  - Created timestamp
  - Finalized timestamp
  - Notification status (sent/not sent)
  - Group name
  - Assignment count
- **Handled interactions**: None (display only)
- **Handled validation**: None
- **Types**:
  - `DrawResponse`
  - `GroupDetailResponse` (optional)
- **Props**:
  - `draw: DrawResponse`
  - `assignmentCount: number`
  - `groupName?: string`

### AssignmentsToolbar
- **Component description**: Toolbar with search and sort controls for assignments
- **Main elements**:
  - Search input (filter by giver/receiver name)
  - Sort select (Giver Name A-Z, Giver Name Z-A, Receiver Name A-Z, Receiver Name Z-A)
- **Handled interactions**:
  - Search change (debounced)
  - Sort change
- **Handled validation**: None
- **Types**: None
- **Props**:
  - `search: string`
  - `onSearchChange: (search: string) => void`
  - `sort: 'giver_asc' | 'giver_desc' | 'receiver_asc' | 'receiver_desc'`
  - `onSortChange: (sort: string) => void`

### AssignmentsTable
- **Component description**: Table displaying all giver-receiver assignment pairs
- **Main elements**:
  - Table header (Giver, Arrow, Receiver)
  - Table body with AssignmentRow components
  - Empty state if no assignments after filtering
- **Handled interactions**: None
- **Handled validation**: None
- **Types**:
  - `AssignmentWithNames` (custom ViewModel)
- **Props**:
  - `assignments: AssignmentWithNames[]`

### AssignmentRow
- **Component description**: Single row displaying a giver-receiver pair
- **Main elements**:
  - Giver cell (name)
  - Arrow icon (→)
  - Receiver cell (name)
- **Handled interactions**: None
- **Handled validation**: None
- **Types**:
  - `AssignmentWithNames`
- **Props**:
  - `assignment: AssignmentWithNames`

### ExportActions
- **Component description**: Button group for export functionality
- **Main elements**:
  - Copy to clipboard button
  - Export CSV button
- **Handled interactions**:
  - Copy to clipboard (formats assignments as text, shows toast)
  - Export CSV (downloads assignments as CSV file)
- **Handled validation**: None
- **Types**:
  - `AssignmentWithNames[]`
- **Props**:
  - `assignments: AssignmentWithNames[]`
  - `drawId: string`

### ConfettiOverlay
- **Component description**: Animated confetti overlay shown on first load after finalization (respects prefers-reduced-motion)
- **Main elements**:
  - Confetti animation
  - Success message "Draw Finalized!"
- **Handled interactions**:
  - Auto-dismisses after 3 seconds
  - Can be dismissed by clicking
- **Handled validation**:
  - Checks `sessionStorage` to only show once
  - Respects `prefers-reduced-motion` media query
- **Types**: None
- **Props**:
  - `show: boolean`
  - `onDismiss: () => void`

## 5. Types

### From schema.d.ts (Existing DTOs)
```typescript
// Draw Response
interface DrawResponse {
  id: string;
  group_id: string;
  status: string; // 'pending' | 'finalized'
  created_at: string; // ISO 8601
  finalized_at: string | null; // ISO 8601
  notification_sent_at: string | null; // ISO 8601
}

// Paginated Draws Response
interface PaginatedDrawsResponse {
  data: DrawResponse[];
  meta: PaginationMeta;
}

// Execute Draw Response
interface ExecuteDrawResponse {
  draw: DrawResponse;
  assignments: AssignmentSummary[];
}

interface AssignmentSummary {
  giver_member_id: string;
  receiver_member_id: string;
}

// Notify Draw Response
interface NotifyDrawResponse {
  sent: number;
  skipped: number;
}

// Assignment Response
interface AssignmentResponse {
  id: string;
  draw_id: string;
  giver_member_id: string;
  receiver_member_id: string;
  created_at: string;
  giver_name: string | null;
  receiver_name: string | null;
}

// List Assignments Response
interface ListAssignmentsResponse {
  data: AssignmentResponse[];
  meta: { [key: string]: unknown };
}

// Pagination Meta
interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
```

### New Custom ViewModels

```typescript
// Draw View Model (extends DrawResponse with computed properties)
interface DrawViewModel extends DrawResponse {
  statusLabel: 'Pending' | 'Finalized';
  statusColor: 'yellow' | 'green';
  formattedCreatedAt: string; // "Jan 15, 2025 at 3:45 PM"
  formattedFinalizedAt: string | null;
  formattedNotificationSentAt: string | null;
  hasAssignments: boolean; // Computed based on lifecycle state
  canExecute: boolean; // status === 'pending' && !hasAssignments
  canFinalize: boolean; // status === 'pending' && hasAssignments
  canNotify: boolean; // status === 'finalized'
  canDelete: boolean; // status === 'pending'
  canViewResults: boolean; // status === 'finalized'
  lifecycleStep: 'created' | 'executed' | 'finalized' | 'notified';
  isNotified: boolean; // notification_sent_at !== null
}

// Assignment With Names (for Results view)
interface AssignmentWithNames {
  id: string;
  draw_id: string;
  giver_member_id: string;
  receiver_member_id: string;
  giver_name: string;
  receiver_name: string;
  created_at: string;
}

// Draws Query Params
interface DrawsQueryParams {
  groupId: string;
  status?: 'pending' | 'finalized';
  page?: number;
  page_size?: number;
  sort?: string; // '-created_at' | 'created_at' | '-finalized_at' | 'finalized_at'
}

// Export Format
type ExportFormat = 'clipboard' | 'csv';

// Lifecycle Step State
type StepState = 'completed' | 'current' | 'pending' | 'skipped';

// Draw Lifecycle Step
interface DrawLifecycleStep {
  id: string;
  label: string;
  state: StepState;
  icon: React.ComponentType;
}
```

## 6. State Management

### Group Draws View State

#### URL-synced State (via useDrawsParams custom hook)
- `status`: Filter by draw status ('all' | 'pending' | 'finalized')
- `page`: Current page number
- `page_size`: Items per page (default: 10)
- `sort`: Sort order (default: '-created_at')

Pattern follows existing `useMembersParams` and `useGroupsParams` hooks.

#### Local Component State
- `executingDrawId: string | null` - Track which draw is being executed (for loading overlay)
- `finalizeDialogOpen: boolean` - Control finalize confirmation dialog
- `notifyDialogOpen: boolean` - Control notify dialog
- `notifyResult: NotifyDrawResponse | null` - Store notification result for display
- `deleteConfirmDrawId: string | null` - Track draw pending deletion
- `selectedDrawForNotify: DrawResponse | null` - Draw selected for notification

### Draw Results View State

#### Local Component State
- `searchTerm: string` - Filter assignments by name (client-side)
- `sortBy: 'giver_asc' | 'giver_desc' | 'receiver_asc' | 'receiver_desc'` - Sort order
- `showConfetti: boolean` - Control confetti overlay display
- `isExporting: boolean` - Track export operation status

#### Computed State
- `filteredAssignments` - Assignments filtered by search term
- `sortedAssignments` - Filtered assignments sorted by selected order

### Custom Hooks Required

#### useDrawsQuery
Purpose: Fetch paginated draws for a group with filters
```typescript
const useDrawsQuery = (params: DrawsQueryParams) => {
  return useQuery({
    queryKey: ['draws', params.groupId, params],
    queryFn: async () => {
      const response = await api.get<PaginatedDrawsResponse>(
        `/api/v1/groups/${params.groupId}/draws`,
        { params: {
          status: params.status,
          page: params.page || 1,
          page_size: params.page_size || 10,
          sort: params.sort || '-created_at'
        }}
      );
      return response.data;
    },
    staleTime: 15000, // 15 seconds
  });
};
```

#### useDrawQuery
Purpose: Fetch single draw details
```typescript
const useDrawQuery = (drawId: string) => {
  return useQuery({
    queryKey: ['draw', drawId],
    queryFn: async () => {
      const response = await api.get<DrawResponse>(
        `/api/v1/draws/${drawId}`
      );
      return response.data;
    },
    enabled: !!drawId,
  });
};
```

#### useCreateDrawMutation
Purpose: Create a new pending draw
```typescript
const useCreateDrawMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<DrawResponse>(
        `/api/v1/groups/${groupId}/draws`,
        {}
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draws', groupId] });
      toast.success('Draw created successfully');
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message = error.response?.data?.detail || 'Failed to create draw';
      toast.error(message);
    },
  });
};
```

#### useExecuteDrawMutation
Purpose: Execute draw algorithm
```typescript
const useExecuteDrawMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drawId: string) => {
      const response = await api.post<ExecuteDrawResponse>(
        `/api/v1/draws/${drawId}/execute`,
        {}
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['draws', groupId] });
      queryClient.setQueryData(['draw', data.draw.id], data.draw);
      toast.success(`Draw executed! ${data.assignments.length} assignments generated.`);
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const detail = error.response?.data?.detail;
      if (error.response?.status === 422) {
        // Let component handle 422 with guidance
        throw error;
      }
      toast.error(detail || 'Failed to execute draw');
    },
  });
};
```

#### useFinalizeDrawMutation
Purpose: Finalize a draw (immutable)
```typescript
const useFinalizeDrawMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (drawId: string) => {
      const response = await api.post<DrawResponse>(
        `/api/v1/draws/${drawId}/finalize`,
        {}
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['draws', groupId] });
      queryClient.setQueryData(['draw', data.id], data);

      // Set flag for confetti on results page
      sessionStorage.setItem(`draw-${data.id}-just-finalized`, 'true');

      toast.success('Draw finalized successfully!');
      navigate(`/app/draws/${data.id}/results`);
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message = error.response?.data?.detail || 'Failed to finalize draw';
      toast.error(message);
    },
  });
};
```

#### useNotifyDrawMutation
Purpose: Send email notifications
```typescript
const useNotifyDrawMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ drawId, resend }: { drawId: string; resend: boolean }) => {
      const response = await api.post<NotifyDrawResponse>(
        `/api/v1/draws/${drawId}/notify`,
        { resend }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['draws', groupId] });
      queryClient.invalidateQueries({ queryKey: ['draw', variables.drawId] });
      return data; // Return for component to display
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message = error.response?.data?.detail || 'Failed to send notifications';
      toast.error(message);
    },
  });
};
```

#### useDeleteDrawMutation
Purpose: Delete a pending draw
```typescript
const useDeleteDrawMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drawId: string) => {
      await api.delete(`/api/v1/draws/${drawId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draws', groupId] });
      toast.success('Draw deleted successfully');
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message = error.response?.data?.detail || 'Failed to delete draw';
      toast.error(message);
    },
  });
};
```

#### useAssignmentsQuery
Purpose: Fetch assignments for a draw with member names
```typescript
const useAssignmentsQuery = (drawId: string) => {
  return useQuery({
    queryKey: ['assignments', drawId],
    queryFn: async () => {
      const response = await api.get<ListAssignmentsResponse>(
        `/api/v1/draws/${drawId}/assignments`,
        { params: { include: 'names' }}
      );
      return response.data;
    },
    enabled: !!drawId,
  });
};
```

#### useDrawsParams (Custom Hook)
Purpose: Sync draws filter/sort/pagination with URL query params
```typescript
const useDrawsParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(() => ({
    status: (searchParams.get('status') as 'pending' | 'finalized' | null) || undefined,
    page: parseInt(searchParams.get('page') || '1', 10),
    page_size: parseInt(searchParams.get('page_size') || '10', 10),
    sort: searchParams.get('sort') || '-created_at',
  }), [searchParams]);

  const updateParams = useCallback((updates: Partial<typeof params>) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });

    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  return { params, updateParams };
};
```

## 7. API Integration

### Group Draws View Endpoints

#### List Draws
- **Endpoint**: `GET /api/v1/groups/{groupId}/draws`
- **Request Type**: `DrawsQueryParams`
- **Response Type**: `PaginatedDrawsResponse`
- **Query Parameters**:
  - `status?: 'pending' | 'finalized'`
  - `page?: number` (default: 1)
  - `page_size?: number` (default: 10)
  - `sort?: string` (default: '-created_at')
- **Error Handling**:
  - 401: Redirect to login
  - 403: Show "Access denied" error
  - 404: Show "Group not found" error

#### Create Draw
- **Endpoint**: `POST /api/v1/groups/{groupId}/draws`
- **Request Type**: `{}` (empty body)
- **Response Type**: `DrawResponse`
- **Success**: Status 201, returns new draw
- **Error Handling**:
  - 401: Redirect to login
  - 403: Show "Access denied" error
  - 404: Show "Group not found" error

#### Execute Draw
- **Endpoint**: `POST /api/v1/draws/{drawId}/execute`
- **Request Type**: `{ seed?: string }` (omit seed in production)
- **Response Type**: `ExecuteDrawResponse`
- **Success**: Status 200, returns draw with assignments
- **Error Handling**:
  - 401: Redirect to login
  - 403: Show "Access denied" error
  - 404: Show "Draw not found" error
  - 409: Show "Draw already finalized" or "Assignments already generated" error
  - 422: Show ErrorGuidanceAlert with instructions to check exclusions/members

#### Finalize Draw
- **Endpoint**: `POST /api/v1/draws/{drawId}/finalize`
- **Request Type**: `{}` (empty body)
- **Response Type**: `DrawResponse` (with status='finalized')
- **Success**: Status 200, navigate to results page
- **Error Handling**:
  - 401: Redirect to login
  - 403: Show "Access denied" error
  - 404: Show "Draw not found" error
  - 409: Show "Already finalized" or "No assignments to finalize" error

#### Notify Draw
- **Endpoint**: `POST /api/v1/draws/{drawId}/notify`
- **Request Type**: `{ resend?: boolean }` (default: false)
- **Response Type**: `NotifyDrawResponse`
- **Success**: Status 202, show NotificationResultDialog with sent/skipped counts
- **Error Handling**:
  - 401: Redirect to login
  - 403: Show "Access denied" error
  - 404: Show "Draw not found" error
  - 409: Show "Draw not finalized" error

#### Delete Draw
- **Endpoint**: `DELETE /api/v1/draws/{drawId}`
- **Request Type**: None
- **Response Type**: None (204 No Content)
- **Success**: Status 204, refresh draws list
- **Error Handling**:
  - 401: Redirect to login
  - 403: Show "Access denied" error
  - 404: Show "Draw not found" error
  - 409: Show "Cannot delete finalized draw" error

### Draw Results View Endpoints

#### Get Draw
- **Endpoint**: `GET /api/v1/draws/{drawId}`
- **Request Type**: None
- **Response Type**: `DrawResponse`
- **Error Handling**:
  - 401: Redirect to login
  - 403: Redirect to 404 (treat as not found)
  - 404: Redirect to 404
  - If `status !== 'finalized'`: Redirect to 404

#### List Assignments
- **Endpoint**: `GET /api/v1/draws/{drawId}/assignments?include=names`
- **Request Type**: None
- **Response Type**: `ListAssignmentsResponse`
- **Query Parameters**:
  - `include: 'names'` (required for names)
- **Error Handling**:
  - 401: Redirect to login
  - 403: Redirect to 404
  - 404: Redirect to 404

## 8. User Interactions

### Group Draws View

#### Create Draw
1. User clicks "Create Draw" button
2. System POSTs to `/api/v1/groups/{groupId}/draws`
3. Success: New pending draw appears in list with status "Pending"
4. Error: Toast notification with error message
5. Draw card shows lifecycle stepper at "Created" step

#### Execute Draw
1. User clicks "Execute" button on pending draw card
2. System shows full-screen loading overlay with message "Executing draw algorithm..."
3. System POSTs to `/api/v1/draws/{drawId}/execute`
4. Success:
   - Loading overlay dismisses
   - Toast shows "Draw executed! X assignments generated"
   - Draw card updates to show lifecycle at "Executed" step
   - "Execute" button becomes disabled
   - "Finalize" button becomes enabled
5. Error (422 no valid configuration):
   - Loading overlay dismisses
   - ErrorGuidanceAlert appears with links to Exclusions and Members views
   - Toast shows "No valid configuration found"
6. Error (other):
   - Loading overlay dismisses
   - Toast shows error message

#### Finalize Draw
1. User clicks "Finalize" button on executed pending draw
2. System shows FinalizeConfirmationDialog warning about immutability
3. User clicks "Cancel": Dialog closes, no action
4. User clicks "Confirm":
   - Dialog shows loading state
   - System POSTs to `/api/v1/draws/{drawId}/finalize`
   - Success:
     - Dialog closes
     - Toast shows "Draw finalized successfully!"
     - System navigates to `/app/draws/{drawId}/results`
     - Results page shows confetti animation (if no reduced motion)
   - Error:
     - Dialog remains open with error message
     - Toast shows error details

#### Notify Draw
1. User clicks "Notify" button on finalized draw
2. System shows NotifyDrawDialog
3. If notifications already sent (`notification_sent_at !== null`):
   - Dialog shows "Resend" checkbox with warning
4. User clicks "Cancel": Dialog closes
5. User clicks "Send":
   - Dialog shows loading state
   - System POSTs to `/api/v1/draws/{drawId}/notify` with resend flag
   - Success:
     - NotifyDrawDialog closes
     - NotificationResultDialog appears showing:
       - "Sent: X notifications"
       - "Skipped: Y members (no email)"
     - Draw card updates to show notification badge
   - Error:
     - Dialog shows error message
     - Toast shows error details

#### Delete Draw
1. User clicks "Delete" button on pending draw
2. System shows browser confirmation dialog: "Are you sure you want to delete this draw? This action cannot be undone."
3. User clicks "Cancel": No action
4. User clicks "OK":
   - System DELETEs `/api/v1/draws/{drawId}`
   - Success:
     - Draw card removed from list
     - Toast shows "Draw deleted successfully"
   - Error:
     - Toast shows error message
     - Draw remains in list

#### View Results
1. User clicks "View Results" button on finalized draw
2. System navigates to `/app/draws/{drawId}/results`

#### Filter by Status
1. User selects status from dropdown (All/Pending/Finalized)
2. URL updates with `?status=pending` or `?status=finalized`
3. Draws list updates to show only matching draws
4. Pagination resets to page 1

#### Sort Draws
1. User selects sort option (Created Date desc, Created Date asc, Status)
2. URL updates with `?sort=created_at` or `?sort=-created_at`
3. Draws list reorders accordingly

#### Paginate
1. User clicks pagination controls (Previous/Next/Page number)
2. URL updates with `?page=N`
3. New page of draws loads
4. Page scrolls to top

### Draw Results View

#### View Results
1. User lands on `/app/draws/{drawId}/results`
2. System fetches draw and assignments with names
3. If just finalized (sessionStorage flag):
   - Confetti animation plays (respects prefers-reduced-motion)
   - Flag cleared from sessionStorage
4. AssignmentsTable displays all giver → receiver pairs

#### Search Assignments
1. User types in search input
2. System filters assignments client-side (debounced 300ms)
3. Matching giver or receiver names remain visible
4. Empty state shows if no matches

#### Sort Assignments
1. User selects sort option (Giver A-Z, Giver Z-A, Receiver A-Z, Receiver Z-A)
2. AssignmentsTable reorders accordingly

#### Copy to Clipboard
1. User clicks "Copy to Clipboard" button
2. System formats assignments as text:
   ```
   Draw Results - [Group Name]

   Alice → Bob
   Bob → Charlie
   Charlie → Alice
   ```
3. Text copied to clipboard
4. Toast shows "Copied to clipboard!"

#### Export CSV
1. User clicks "Export CSV" button
2. System generates CSV file:
   ```csv
   Giver,Receiver
   Alice,Bob
   Bob,Charlie
   Charlie,Alice
   ```
3. File downloads as `draw-{drawId}-results.csv`
4. Toast shows "CSV exported successfully!"

#### Dismiss Confetti
1. Confetti appears on first load after finalization
2. Auto-dismisses after 3 seconds
3. User can click anywhere to dismiss immediately
4. Will not show again for this draw (sessionStorage check)

## 9. Conditions and Validation

### Group Draws View

#### Create Draw Button
- **Always enabled** (no conditions)
- Validation performed server-side (group must exist, user must be owner)

#### Execute Button
- **Condition**: `draw.status === 'pending' && !draw.hasAssignments`
- Shown only on pending draws without generated assignments
- Disabled during execution (loading state)
- Hidden on finalized draws

#### Finalize Button
- **Condition**: `draw.status === 'pending' && draw.hasAssignments`
- Shown only on pending draws with generated assignments
- Disabled during finalization (loading state)
- Shows confirmation dialog before action
- Hidden on finalized draws

#### Notify Button
- **Condition**: `draw.status === 'finalized'`
- Shown only on finalized draws
- Disabled during notification (loading state)
- Badge shows "Notified" if `notification_sent_at !== null`
- Resend checkbox appears if already notified

#### View Results Button
- **Condition**: `draw.status === 'finalized'`
- Shown only on finalized draws
- Always enabled when visible

#### Delete Button
- **Condition**: `draw.status === 'pending'`
- Shown only on pending draws
- Disabled during deletion (loading state)
- Shows confirmation dialog before action
- Hidden on finalized draws (immutable)

#### Lifecycle Stepper States
- **Created**: Always shown for all draws
- **Executed**: `status === 'pending' && hasAssignments` OR `status === 'finalized'`
- **Finalized**: `status === 'finalized'`
- **Notified**: `status === 'finalized' && notification_sent_at !== null`

#### Error Guidance (422)
- **Condition**: Execute action returns 422 status
- Shows alert with:
  - Error message from API
  - Guidance: "This means no valid assignment is possible with current exclusions and members"
  - Link to Exclusions view
  - Link to Members view
- Dismissible by user

### Draw Results View

#### Page Access
- **Condition**: `draw.status === 'finalized'`
- If draw not found: Redirect to 404
- If draw not finalized: Redirect to 404
- If user not owner: Redirect to 404 (403 treated as 404)

#### Confetti Display
- **Conditions**:
  - `sessionStorage.getItem('draw-{drawId}-just-finalized') === 'true'`
  - AND `window.matchMedia('(prefers-reduced-motion: no-preference)').matches`
- Shows once per draw finalization
- Auto-dismisses after 3 seconds
- Dismissible by click

#### Export Buttons
- **Always enabled** when assignments loaded
- Disabled if no assignments (should not occur for finalized draws)

#### Search/Sort
- **Always enabled** when assignments loaded
- Search operates on client-side filtered data
- Empty state shows if no matches after filtering

## 10. Error Handling

### Group Draws View

#### API Errors

**401 Unauthorized**
- Action: Redirect to `/login`
- Message: None (automatic redirect)

**403 Forbidden**
- Display: ErrorState component
- Message: "You don't have permission to access this group"
- Action: Link to groups list

**404 Group Not Found**
- Display: ErrorState component
- Message: "Group not found"
- Action: Link to groups list

**409 Conflict (Execute/Finalize/Delete)**
- Display: Toast notification
- Messages:
  - "Draw already finalized"
  - "Assignments already generated"
  - "Cannot delete finalized draw"
  - "No assignments to finalize"

**422 No Valid Configuration (Execute)**
- Display: ErrorGuidanceAlert component
- Message: "No valid assignment configuration found"
- Guidance: "This usually means there are too many exclusions or not enough members. Try:"
  - "Review and remove some exclusions" (link to exclusions)
  - "Add more members to the group" (link to members)
  - "Disable historical exclusions in group settings" (link to settings)

**Network Errors**
- Display: Toast notification
- Message: "Network error. Please check your connection and try again."
- Action: Retry button on error state

#### Edge Cases

**Empty Draws List**
- Display: EmptyState component
- Message: "No draws yet"
- Description: "Create your first draw to get started with gift assignments"
- Action: Create Draw button

**Concurrent Modifications**
- If draw state changes during user action (rare):
  - Refresh draws list automatically
  - Show toast: "Draw was modified. Please try again."

**Execute Timeout**
- If execute takes > 10 seconds:
  - Keep loading overlay (algorithm may still be working)
  - If response not received after 30 seconds:
    - Show timeout error
    - Refresh draws list to check status

### Draw Results View

#### API Errors

**401 Unauthorized**
- Action: Redirect to `/login`

**403 Forbidden / 404 Not Found**
- Action: Redirect to `/404`
- Both treated identically for security

**Draw Not Finalized**
- Detected client-side if `status !== 'finalized'`
- Action: Redirect to `/404`
- Message: None (user shouldn't see pending draws here)

#### Edge Cases

**No Assignments (Finalized Draw)**
- Display: ErrorState component
- Message: "No assignments found for this draw"
- Description: "This is unexpected for a finalized draw. Please contact support."
- Should not occur in normal operation

**Export Failures**
- Clipboard API not available:
  - Fallback: Show modal with formatted text for manual copy
  - Toast: "Please copy the text manually"
- CSV download blocked by browser:
  - Toast: "Download blocked. Please check your browser settings."

**Confetti Error**
- If confetti library fails to load/render:
  - Silently fail (non-critical feature)
  - Log error to console
  - Do not block page load

#### Loading States

**Initial Load**
- Show LoadingState skeleton for both draw metadata and assignments table
- Metadata and table load independently (parallel queries)

**Search/Sort**
- No loading indicator (instant client-side operations)
- If slow (>100ms), consider debouncing search

## 11. Implementation Steps

### Phase 1: Setup and Infrastructure (2-3 hours)

1. **Create type definitions**
   - Add `DrawViewModel` interface with computed properties
   - Add `AssignmentWithNames` interface
   - Add `DrawsQueryParams` interface
   - Add `StepState` and `DrawLifecycleStep` types

2. **Create custom hooks**
   - Implement `useDrawsQuery` hook
   - Implement `useDrawQuery` hook
   - Implement `useCreateDrawMutation` hook
   - Implement `useExecuteDrawMutation` hook
   - Implement `useFinalizeDrawMutation` hook
   - Implement `useNotifyDrawMutation` hook
   - Implement `useDeleteDrawMutation` hook
   - Implement `useAssignmentsQuery` hook
   - Implement `useDrawsParams` hook (URL sync)

3. **Create utility functions**
   - `formatDrawTimestamp(date: string): string` - Format ISO dates
   - `transformToDrawViewModel(draw: DrawResponse): DrawViewModel` - Add computed properties
   - `determineLifecycleStep(draw: DrawResponse): string` - Calculate current step
   - `exportToCSV(assignments: AssignmentWithNames[], drawId: string): void` - CSV export
   - `copyToClipboard(assignments: AssignmentWithNames[], groupName: string): Promise<void>` - Clipboard
   - `shouldShowConfetti(drawId: string): boolean` - Check sessionStorage + prefers-reduced-motion

### Phase 2: Group Draws View - Core Components (4-5 hours)

4. **Create DrawsPage component** (`/frontend/src/pages/DrawsPage.tsx`)
   - Set up page structure with routing
   - Implement useDrawsParams for URL state
   - Fetch draws with useDrawsQuery
   - Handle loading/error/empty states
   - Implement pagination controls

5. **Create PageHeader component** (`/frontend/src/components/DrawsPage/PageHeader.tsx`)
   - Display title and description
   - Render CreateDrawButton
   - Handle create draw action with useCreateDrawMutation

6. **Create DrawsToolbar component** (`/frontend/src/components/DrawsPage/DrawsToolbar.tsx`)
   - Status filter dropdown (All/Pending/Finalized)
   - Sort select dropdown
   - Connect to URL params via callbacks

7. **Create DrawsGrid component** (`/frontend/src/components/DrawsPage/DrawsGrid.tsx`)
   - Grid layout for draw cards
   - Responsive design (1 col mobile, 2 col tablet, 3 col desktop)

8. **Create LoadingState component** (`/frontend/src/components/DrawsPage/LoadingState.tsx`)
   - Skeleton loaders for draw cards
   - Match DrawCard dimensions

9. **Create ErrorState component** (`/frontend/src/components/DrawsPage/ErrorState.tsx`)
   - Display error message
   - Retry button
   - Link to groups list

10. **Create EmptyState component** (`/frontend/src/components/DrawsPage/EmptyState.tsx`)
    - "No draws yet" message
    - Create Draw button

### Phase 3: Group Draws View - Draw Card & Actions (4-5 hours)

11. **Create DrawCard component** (`/frontend/src/components/DrawsPage/DrawCard.tsx`)
    - Card layout with status badge
    - Display timestamps (created, finalized, notified)
    - Render DrawLifecycleStepper
    - Render DrawActions button group
    - Pass action handlers from parent

12. **Create DrawStatusBadge component** (`/frontend/src/components/DrawsPage/DrawStatusBadge.tsx`)
    - Pending: Yellow badge
    - Finalized: Green badge
    - Icons for each status

13. **Create DrawTimestamps component** (`/frontend/src/components/DrawsPage/DrawTimestamps.tsx`)
    - Format and display created_at
    - Conditionally show finalized_at
    - Conditionally show notification_sent_at

14. **Create DrawLifecycleStepper component** (`/frontend/src/components/DrawsPage/DrawLifecycleStepper.tsx`)
    - Four steps: Create → Execute → Finalize → Notify
    - Visual states: completed (green check), current (blue), pending (gray)
    - Connecting lines between steps
    - Icons for each step

15. **Create DrawActions component** (`/frontend/src/components/DrawsPage/DrawActions.tsx`)
    - Execute button (pending without assignments)
    - Finalize button (pending with assignments)
    - Notify button (finalized)
    - View Results button (finalized)
    - Delete button (pending)
    - Conditional rendering based on draw state

### Phase 4: Group Draws View - Dialogs & Overlays (3-4 hours)

16. **Create ExecuteDrawLoadingOverlay component** (`/frontend/src/components/DrawsPage/ExecuteDrawLoadingOverlay.tsx`)
    - Full-screen overlay with backdrop
    - Loading spinner
    - "Executing draw algorithm..." message
    - Blocks interaction during execution

17. **Create FinalizeConfirmationDialog component** (`/frontend/src/components/DrawsPage/FinalizeConfirmationDialog.tsx`)
    - Modal dialog from shadcn/ui
    - Warning title "Finalize Draw?"
    - Warning message about immutability
    - Cancel and Confirm buttons
    - Loading state on confirm

18. **Create NotifyDrawDialog component** (`/frontend/src/components/DrawsPage/NotifyDrawDialog.tsx`)
    - Modal dialog
    - Display draw info
    - Resend checkbox (if already notified)
    - Warning about resending
    - Cancel and Send buttons
    - Loading state

19. **Create NotificationResultDialog component** (`/frontend/src/components/DrawsPage/NotificationResultDialog.tsx`)
    - Success modal
    - Display sent count
    - Display skipped count (with explanation)
    - Close button

20. **Create ErrorGuidanceAlert component** (`/frontend/src/components/DrawsPage/ErrorGuidanceAlert.tsx`)
    - Alert box (warning style)
    - Error icon and message
    - Guidance text for 422 errors
    - Action links to Exclusions and Members views
    - Dismissible

### Phase 5: Draw Results View - Core Components (3-4 hours)

21. **Create DrawResultsPage component** (`/frontend/src/pages/DrawResultsPage.tsx`)
    - Fetch draw with useDrawQuery
    - Fetch assignments with useAssignmentsQuery (include=names)
    - Validate draw is finalized (redirect if not)
    - Check for confetti flag in sessionStorage
    - Implement client-side search and sort
    - Handle loading/error states

22. **Create DrawMetadata component** (`/frontend/src/components/DrawResultsPage/DrawMetadata.tsx`)
    - Display draw status badge
    - Show created and finalized timestamps
    - Show notification status
    - Display group name (fetch with useGroupDetailsQuery)
    - Show assignment count

23. **Create AssignmentsToolbar component** (`/frontend/src/components/DrawResultsPage/AssignmentsToolbar.tsx`)
    - Search input with debounce (300ms)
    - Sort select dropdown
    - Responsive layout

24. **Create AssignmentsTable component** (`/frontend/src/components/DrawResultsPage/AssignmentsTable.tsx`)
    - Table header (Giver | → | Receiver)
    - Table body with AssignmentRow components
    - Empty state for no matches
    - Responsive: stack vertically on mobile

25. **Create AssignmentRow component** (`/frontend/src/components/DrawResultsPage/AssignmentRow.tsx`)
    - Display giver name
    - Arrow icon (→)
    - Display receiver name
    - Hover effect

### Phase 6: Draw Results View - Export & Confetti (2-3 hours)

26. **Create ExportActions component** (`/frontend/src/components/DrawResultsPage/ExportActions.tsx`)
    - Copy to Clipboard button
    - Export CSV button
    - Implement formatForClipboard utility
    - Implement generateCSV utility
    - Handle export errors gracefully

27. **Create ConfettiOverlay component** (`/frontend/src/components/DrawResultsPage/ConfettiOverlay.tsx`)
    - Install confetti library (e.g., `react-confetti` or `canvas-confetti`)
    - Fullscreen overlay
    - Success message "Draw Finalized!"
    - Auto-dismiss after 3 seconds
    - Click to dismiss
    - Check prefers-reduced-motion
    - Manage sessionStorage flag

28. **Create PageHeader component** (`/frontend/src/components/DrawResultsPage/PageHeader.tsx`)
    - Breadcrumb navigation
    - Page title
    - ExportActions component

### Phase 7: Routing & Navigation (1-2 hours)

29. **Add routes to router configuration**
    - Add `/app/groups/:groupId/draws` route
    - Add `/app/draws/:drawId/results` route
    - Wrap both with ProtectedRoute
    - Add to AppLayout navigation (if needed)

30. **Update navigation components**
    - Add "Draws" link to group navigation tabs
    - Update breadcrumbs in AppLayout to support both views
    - Ensure back navigation works correctly

### Phase 8: Testing & Polish (3-4 hours)

31. **Manual testing**
    - Create draw flow
    - Execute draw (success and 422 error)
    - Finalize draw with confirmation
    - Notify draw (first time and resend)
    - View results
    - Test all filters and sorting
    - Test pagination
    - Test search and export
    - Test delete (pending only)
    - Verify loading states
    - Verify error states
    - Test responsive design (mobile/tablet/desktop)

32. **Edge case testing**
    - Empty draws list
    - Draw with no assignments (should not occur)
    - Concurrent modifications
    - Network errors
    - Long member names (overflow handling)
    - Many assignments (performance)
    - Confetti with reduced motion preference

33. **Accessibility audit**
    - Keyboard navigation for all actions
    - Screen reader support (ARIA labels)
    - Focus management in dialogs
    - Color contrast for status badges
    - Alt text for icons

34. **Performance optimization**
    - Memoize computed values in DrawViewModel transform
    - Debounce search input (300ms)
    - Virtualize long lists if needed (>100 assignments)
    - Optimize confetti rendering

35. **Code cleanup and documentation**
    - Add JSDoc comments to complex functions
    - Remove console.logs
    - Ensure consistent naming conventions
    - Format with Prettier
    - Lint with ESLint
    - Review for unused imports

### Estimated Total Time: 22-30 hours

**Priority order for MVP:**
1. Draws view core functionality (create, list, execute, finalize)
2. Basic action buttons and loading states
3. Results view with basic display
4. Notify functionality
5. Delete functionality
6. Error handling and guidance
7. Export features
8. Confetti and polish

**Can be deferred post-MVP:**
- Advanced filtering/sorting options
- Assignment virtualization (unless >100 members)
- Confetti animation
- CSV export (if copy-to-clipboard sufficient)
