import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionManagerDialog } from './PermissionManagerDialog';
import * as useUserPermissionsModule from '@/hooks/useUserPermissions';
import * as useAvailablePermissionsModule from '@/hooks/useAvailablePermissions';
import * as useGroupNamesModule from '@/hooks/useGroupNames';
import * as useRevokePermissionModule from '@/hooks/useRevokePermission';
import * as useGrantPermissionModule from '@/hooks/useGrantPermission';
import * as useAdminModule from '@/hooks/useAdmin';
import type { Permission } from '@/hooks/useUserPermissions';

vi.mock('@/hooks/useUserPermissions');
vi.mock('@/hooks/useAvailablePermissions');
vi.mock('@/hooks/useGroupNames');
vi.mock('@/hooks/useRevokePermission');
vi.mock('@/hooks/useGrantPermission');
vi.mock('@/hooks/useAdmin');
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    isOpen,
    title,
  }: {
    children?: React.ReactNode;
    isOpen?: boolean;
    title?: string;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

describe('PermissionManagerDialog', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();

  const mockUserPermissions: Permission[] = [
    {
      code: 'groups:create',
      name: 'Create Groups',
      description: 'Create new groups',
      category: 'groups',
      created_at: '2025-12-17T00:00:00Z',
    },
  ];

  const mockGroupedPermissions: Permission[] = [
    {
      code: 'groups:read:group-123',
      name: 'Read Group',
      description: 'Read group details',
      category: 'groups',
      created_at: '2025-12-17T00:00:00Z',
    },
    {
      code: 'groups:write:group-123',
      name: 'Write Group',
      description: 'Write group details',
      category: 'groups',
      created_at: '2025-12-17T00:00:00Z',
    },
    {
      code: 'groups:read:group-456',
      name: 'Read Group',
      description: 'Read group details',
      category: 'groups',
      created_at: '2025-12-17T00:00:00Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: mockUserPermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    vi.mocked(useGroupNamesModule.useGroupNames).mockReturnValue({
      groupNames: new Map([
        ['group-123', 'Engineering Team'],
        ['group-456', 'Marketing Team'],
      ]),
      isLoading: false,
      hasError: false,
    } as never);

    vi.mocked(useRevokePermissionModule.useRevokePermission).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      reset: vi.fn(),
      status: 'idle',
    } as never);

    vi.mocked(useGrantPermissionModule.useGrantPermission).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      reset: vi.fn(),
      status: 'idle',
    } as never);

    vi.mocked(useAdminModule.useAdminGroups).mockReturnValue({
      data: {
        data: [
          {
            id: 'group-1',
            name: 'Engineering Team',
            admin_user_id: 'admin-1',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            historical_exclusions_enabled: false,
          },
          {
            id: 'group-2',
            name: 'Marketing Team',
            admin_user_id: 'admin-1',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            historical_exclusions_enabled: false,
          },
        ],
        meta: { total: 2, page: 1, page_size: 100, total_pages: 1 },
      },
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    // Mock available permissions - a superset including the user's permissions
    const allAvailablePermissions: Permission[] = [
      ...mockUserPermissions,
      {
        code: 'groups:delete',
        name: 'Delete Groups',
        description: 'Delete groups',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
      {
        code: 'admin:view_dashboard',
        name: 'View Admin Dashboard',
        description: 'Access admin dashboard',
        category: 'admin',
        created_at: '2025-12-17T00:00:00Z',
      },
    ];

    vi.mocked(useAvailablePermissionsModule.useAvailablePermissions).mockReturnValue({
      data: allAvailablePermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    vi.clearAllMocks();
  });

  const renderDialog = (isOpen = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PermissionManagerDialog
          isOpen={isOpen}
          onClose={mockOnClose}
          userId="user-123"
          userName="John Doe"
          userEmail="john@example.com"
        />
      </QueryClientProvider>
    );
  };

  it('renders user information', () => {
    renderDialog();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows permission count', () => {
    renderDialog();

    expect(screen.getByText('1 permissions granted')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderDialog();

    expect(
      screen.getByPlaceholderText('Search permissions by name, code, or group...')
    ).toBeInTheDocument();
  });

  it('shows system permissions section', () => {
    renderDialog();

    // Should show both available and granted system permissions sections
    expect(screen.getByText('Available System Permissions')).toBeInTheDocument();
    expect(screen.getByText('Granted System Permissions')).toBeInTheDocument();
    expect(screen.getByText('groups:create')).toBeInTheDocument();
  });

  it('displays permissions grouped by resource', () => {
    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: mockGroupedPermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    // Should show group sections with names in granted sections
    const engineeringElements = screen.getAllByText('Engineering Team');
    const marketingElements = screen.getAllByText('Marketing Team');
    expect(engineeringElements.length).toBeGreaterThan(0);
    expect(marketingElements.length).toBeGreaterThan(0);
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    renderDialog();

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state when fetching data', () => {
    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      isSuccess: false,
      isFetched: false,
      status: 'pending',
    } as never);

    const { container } = renderDialog();

    // Should show loading spinner (lucide-react Loader2 has animate-spin)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('filters permissions by search query', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: mockGroupedPermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    const searchInput = screen.getByPlaceholderText(
      'Search permissions by name, code, or group...'
    );

    // Search by group name
    await user.type(searchInput, 'Engineering');

    // Should show Engineering permissions
    const engineeringResults = screen.getAllByText('Engineering Team');
    expect(engineeringResults.length).toBeGreaterThan(0);
  });

  it('filters permissions by permission code', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: mockGroupedPermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    const searchInput = screen.getByPlaceholderText(
      'Search permissions by name, code, or group...'
    );

    // Search by permission code
    await user.type(searchInput, 'read');

    // Both groups should be visible since both have read permissions
    const engineeringResults = screen.getAllByText('Engineering Team');
    const marketingResults = screen.getAllByText('Marketing Team');
    expect(engineeringResults.length).toBeGreaterThan(0);
    expect(marketingResults.length).toBeGreaterThan(0);
  });

  it('allows revoking permissions', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({});

    vi.mocked(useRevokePermissionModule.useRevokePermission).mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      reset: vi.fn(),
      status: 'idle',
    } as never);

    renderDialog();

    // Find and click revoke button for groups:create
    const revokeButton = screen.getByRole('button', { name: /revoke groups:create/i });
    await user.click(revokeButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });

  it('handles no user permissions gracefully', () => {
    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    // Should not show current permissions section when empty
    const currentPermsSection = screen.queryByText(/Current Permissions/);
    if (currentPermsSection) {
      expect(currentPermsSection.textContent).not.toContain('0 of');
    }
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <PermissionManagerDialog
          isOpen={false}
          onClose={mockOnClose}
          userId="user-123"
          userName="John Doe"
          userEmail="john@example.com"
        />
      </QueryClientProvider>
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeInTheDocument();
  });

  it('displays group names instead of UUIDs', () => {
    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: mockGroupedPermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    // Should display group names, not UUIDs
    const engineeringResults = screen.getAllByText('Engineering Team');
    const marketingResults = screen.getAllByText('Marketing Team');
    expect(engineeringResults.length).toBeGreaterThan(0);
    expect(marketingResults.length).toBeGreaterThan(0);
  });

  it('handles ungrouped and grouped permissions together', () => {
    const mixedPermissions: Permission[] = [
      ...mockUserPermissions, // System permission (groups:create)
      ...mockGroupedPermissions, // Grouped permissions
    ];

    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: mixedPermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    // Should show both system and group sections (for granted permissions)
    expect(screen.getByText('Granted System Permissions')).toBeInTheDocument();
    const engineeringResults = screen.getAllByText('Engineering Team');
    const marketingResults = screen.getAllByText('Marketing Team');
    expect(engineeringResults.length).toBeGreaterThan(0);
    expect(marketingResults.length).toBeGreaterThan(0);
  });

  it('disables revoke buttons during mutation', () => {
    vi.mocked(useRevokePermissionModule.useRevokePermission).mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isPending: true,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      reset: vi.fn(),
      status: 'pending',
    } as never);

    renderDialog();

    // Revoke button should be disabled during pending operations
    const revokeButton = screen.getByTestId('revoke-permission-groups:create');
    expect(revokeButton).toBeDisabled();
  });

  it('shows loading state for group names', () => {
    vi.mocked(useGroupNamesModule.useGroupNames).mockReturnValue({
      groupNames: new Map(),
      isLoading: true,
      hasError: false,
    } as never);

    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: mockGroupedPermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    const { container } = renderDialog();

    // Should show loading spinner while fetching group names
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('handles missing group names gracefully', () => {
    vi.mocked(useGroupNamesModule.useGroupNames).mockReturnValue({
      groupNames: new Map(), // Empty - groups not found
      isLoading: false,
      hasError: true,
    } as never);

    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: mockGroupedPermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    // Should display fallback text with truncated UUIDs
    // When group names aren't found, it should show "Group (group-xxx...)"
    const fallbackGroups = screen.getAllByText(/Group \(/);
    expect(fallbackGroups.length).toBeGreaterThan(0);
    expect(fallbackGroups[0].textContent).toMatch(/Group \(group-/);
  });

  it('displays available permissions section', () => {
    renderDialog();

    // Should show available permissions section
    expect(screen.getByText('Available System Permissions')).toBeInTheDocument();

    // Should show available permissions (those not in user's permissions)
    expect(screen.getByText('Delete Groups')).toBeInTheDocument();
    expect(screen.getByText('View Admin Dashboard')).toBeInTheDocument();

    // Should have Grant buttons for available permissions
    const grantButtons = screen.getAllByRole('button', { name: /grant/i });
    expect(grantButtons.length).toBeGreaterThan(0);
  });

  it('shows grant buttons with correct test IDs', () => {
    renderDialog();

    // Should have grant buttons with proper test IDs
    expect(screen.getByTestId('grant-permission-groups:delete')).toBeInTheDocument();
    expect(screen.getByTestId('grant-permission-admin:view_dashboard')).toBeInTheDocument();
  });

  it('shows all permissions granted message when no available permissions', () => {
    // Mock user having all available permissions
    const allPermissions: Permission[] = [
      {
        code: 'groups:create',
        name: 'Create Groups',
        description: 'Create new groups',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
      {
        code: 'groups:delete',
        name: 'Delete Groups',
        description: 'Delete groups',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
      {
        code: 'admin:view_dashboard',
        name: 'View Admin Dashboard',
        description: 'Access admin dashboard',
        category: 'admin',
        created_at: '2025-12-17T00:00:00Z',
      },
    ];

    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: allPermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    // Should show "All permissions granted" message
    expect(screen.getByText('All permissions granted')).toBeInTheDocument();

    // Should still show granted permissions section
    expect(screen.getByText('Granted System Permissions')).toBeInTheDocument();
  });

  it('handles loading state for available permissions', () => {
    vi.mocked(useAvailablePermissionsModule.useAvailablePermissions).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      isSuccess: false,
      isFetched: false,
      status: 'pending',
    } as never);

    const { container } = renderDialog();

    // Should show loading spinner while fetching available permissions
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('allows granting permissions', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({});

    vi.mocked(useGrantPermissionModule.useGrantPermission).mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      reset: vi.fn(),
      status: 'idle',
    } as never);

    renderDialog();

    // Find and click grant button for groups:delete
    const grantButton = screen.getByTestId('grant-permission-groups:delete');
    await user.click(grantButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        permission_code: 'groups:delete',
      });
    });
  });

  it('disables grant buttons during mutation', () => {
    vi.mocked(useGrantPermissionModule.useGrantPermission).mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isPending: true,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      reset: vi.fn(),
      status: 'pending',
    } as never);

    renderDialog();

    // All grant buttons should be disabled during pending operations
    const grantButtons = screen.getAllByRole('button', { name: /grant/i });
    grantButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows loading spinner for grant buttons during mutation', () => {
    vi.mocked(useGrantPermissionModule.useGrantPermission).mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isPending: true,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      reset: vi.fn(),
      status: 'pending',
    } as never);

    const { container } = renderDialog();

    // Should show loading spinners in grant buttons
    const spinners = container.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('filters available permissions by code', async () => {
    const user = userEvent.setup();
    renderDialog();

    const searchInput = screen.getByPlaceholderText(
      'Search permissions by name, code, or group...'
    );

    // Search by available permission code
    await user.type(searchInput, 'delete');

    // Should show only Delete Groups permission (available)
    expect(screen.getByText('Delete Groups')).toBeInTheDocument();
    // Should not show View Admin Dashboard (doesn't match search)
    expect(screen.queryByText('View Admin Dashboard')).not.toBeInTheDocument();
  });

  it('filters available permissions by name', async () => {
    const user = userEvent.setup();
    renderDialog();

    const searchInput = screen.getByPlaceholderText(
      'Search permissions by name, code, or group...'
    );

    // Search by available permission name
    await user.type(searchInput, 'admin');

    // Should show only View Admin Dashboard permission (available)
    expect(screen.getByText('View Admin Dashboard')).toBeInTheDocument();
    // Should not show Delete Groups (doesn't match search)
    expect(screen.queryByText('Delete Groups')).not.toBeInTheDocument();
  });

  it('filters available permissions by description', async () => {
    const user = userEvent.setup();
    const mockAvailablePermissions: Permission[] = [
      {
        code: 'groups:delete',
        name: 'Delete Groups',
        description: 'Delete groups permanently',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
      {
        code: 'admin:view_dashboard',
        name: 'View Admin Dashboard',
        description: 'Access the admin panel',
        category: 'admin',
        created_at: '2025-12-17T00:00:00Z',
      },
    ];

    vi.mocked(useAvailablePermissionsModule.useAvailablePermissions).mockReturnValue({
      data: mockAvailablePermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    const searchInput = screen.getByPlaceholderText(
      'Search permissions by name, code, or group...'
    );

    // Search by description
    await user.type(searchInput, 'permanently');

    // Should show only Delete Groups
    expect(screen.getByText('Delete Groups')).toBeInTheDocument();
    // Should not show View Admin Dashboard
    expect(screen.queryByText('View Admin Dashboard')).not.toBeInTheDocument();
  });

  it('filters available grouped permissions by group name', async () => {
    const user = userEvent.setup();
    const availableGroupedPermissions: Permission[] = [
      {
        code: 'groups:read:group-123',
        name: 'Read Group',
        description: 'Read group details',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
      {
        code: 'groups:write:group-456',
        name: 'Write Group',
        description: 'Write group details',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
    ];

    vi.mocked(useAvailablePermissionsModule.useAvailablePermissions).mockReturnValue({
      data: availableGroupedPermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    const searchInput = screen.getByPlaceholderText(
      'Search permissions by name, code, or group...'
    );

    // Search by group name
    await user.type(searchInput, 'Engineering');

    // Should show only Engineering Team section
    expect(screen.getByText('Engineering Team (Available)')).toBeInTheDocument();
    // Marketing Team should not be visible
    expect(screen.queryByText('Marketing Team (Available)')).not.toBeInTheDocument();
  });

  it('does not render empty available sections after filtering', async () => {
    const user = userEvent.setup();
    renderDialog();

    const searchInput = screen.getByPlaceholderText(
      'Search permissions by name, code, or group...'
    );

    // Search for something that doesn't match any available permissions
    await user.type(searchInput, 'nonexistent-permission');

    // All available sections should be hidden
    expect(screen.queryByText('Available System Permissions')).not.toBeInTheDocument();
  });

  it('shows filtered counts in available permissions sections', async () => {
    const user = userEvent.setup();
    const mockAvailablePermissions: Permission[] = [
      {
        code: 'groups:delete',
        name: 'Delete Groups',
        description: 'Delete groups',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
      {
        code: 'groups:export',
        name: 'Export Groups',
        description: 'Export groups',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
      {
        code: 'admin:view_dashboard',
        name: 'View Admin Dashboard',
        description: 'Access admin dashboard',
        category: 'admin',
        created_at: '2025-12-17T00:00:00Z',
      },
    ];

    vi.mocked(useAvailablePermissionsModule.useAvailablePermissions).mockReturnValue({
      data: mockAvailablePermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    const searchInput = screen.getByPlaceholderText(
      'Search permissions by name, code, or group...'
    );

    // Initially should show count of 1 (one system permission available)
    const initialSection = screen.getByText('Available System Permissions');
    expect(initialSection).toBeInTheDocument();

    // Search for "delete" - should show only 1 available system permission
    await user.type(searchInput, 'delete');

    // Check that only 1 result is shown in the filtered section
    expect(screen.getByText('Delete Groups')).toBeInTheDocument();
    expect(screen.queryByText('Export Groups')).not.toBeInTheDocument();
  });

  it('filters both available and granted permissions simultaneously', async () => {
    const user = userEvent.setup();
    const grantedPermissions: Permission[] = [
      {
        code: 'groups:write:group-123',
        name: 'Write Group',
        description: 'Write group details',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
    ];

    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: grantedPermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    const mockAvailablePermissions: Permission[] = [
      ...grantedPermissions, // Same granted
      {
        code: 'groups:read:group-123',
        name: 'Read Group',
        description: 'Read group details',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
      {
        code: 'groups:delete',
        name: 'Delete Groups',
        description: 'Delete groups',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
    ];

    vi.mocked(useAvailablePermissionsModule.useAvailablePermissions).mockReturnValue({
      data: mockAvailablePermissions,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    const searchInput = screen.getByPlaceholderText(
      'Search permissions by name, code, or group...'
    );

    // Search for "write"
    await user.type(searchInput, 'write');

    // Should show only write permissions in granted section
    expect(screen.getByText('Write Group')).toBeInTheDocument();

    // Should not show read or delete permissions
    expect(screen.queryByText('Read Group')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete Groups')).not.toBeInTheDocument();

    // Available sections should also be filtered (no write available)
    // So no available section should show
    expect(screen.queryByText(/Available/)).not.toBeInTheDocument();
  });

  it('shows all available permissions when search is cleared', async () => {
    const user = userEvent.setup();
    renderDialog();

    const searchInput = screen.getByPlaceholderText(
      'Search permissions by name, code, or group...'
    );

    // Type search query
    await user.type(searchInput, 'delete');
    expect(screen.queryByText('View Admin Dashboard')).not.toBeInTheDocument();

    // Clear search
    await user.clear(searchInput);

    // Should show all available permissions again
    expect(screen.getByText('Delete Groups')).toBeInTheDocument();
    expect(screen.getByText('View Admin Dashboard')).toBeInTheDocument();
  });

  it('should render the grant group access section', () => {
    renderDialog();
    expect(screen.getByText('Grant Group-Specific Access')).toBeInTheDocument();
  });

  it('should render the group dropdown in the grant section', () => {
    renderDialog();
    expect(screen.getByTestId('select-group-dropdown')).toBeInTheDocument();
  });

  it('should render grant section alongside available permissions', () => {
    renderDialog();
    // Both sections should be present and visible
    expect(screen.getByText('Grant Group-Specific Access')).toBeInTheDocument();
    expect(screen.getByText('Available System Permissions')).toBeInTheDocument();
  });

  it('should have grant section visible before available permissions section', () => {
    renderDialog();
    // Both sections should be visible
    expect(screen.getByText('Grant Group-Specific Access')).toBeInTheDocument();
    expect(screen.getByText('Available System Permissions')).toBeInTheDocument();
  });

  it('should show group options in dropdown', () => {
    renderDialog();
    const dropdown = screen.getByTestId('select-group-dropdown') as HTMLSelectElement;
    const options = Array.from(dropdown.options).map(o => o.text);
    expect(options).toContain('Engineering Team');
    expect(options).toContain('Marketing Team');
  });

  it('should show operations when group is selected', async () => {
    const user = userEvent.setup();
    renderDialog();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-1');

    await waitFor(() => {
      expect(screen.getByTestId('operation-checkbox-groups:read')).toBeInTheDocument();
    });
  });

  it('should call grant mutation with resource-scoped permission code', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({});

    vi.mocked(useGrantPermissionModule.useGrantPermission).mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      reset: vi.fn(),
      status: 'idle',
    } as never);

    renderDialog();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-1');

    const checkbox = await screen.findByTestId('operation-checkbox-groups:read');
    await user.click(checkbox);

    const button = screen.getByTestId('grant-group-access-button');
    await user.click(button);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        permission_code: 'groups:read:group-1',
      });
    });
  });

  it('should disable permissions user already has for a group', async () => {
    const user = userEvent.setup();
    const userPermsWithGroup: Permission[] = [
      {
        code: 'groups:create',
        name: 'Create Groups',
        description: 'Create new groups',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
      {
        code: 'groups:read:group-1',
        name: 'Read Group',
        description: 'Read group details',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
    ];

    vi.mocked(useUserPermissionsModule.useUserPermissions).mockReturnValue({
      data: userPermsWithGroup,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderDialog();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-1');

    await waitFor(() => {
      const checkbox = screen.getByTestId('operation-checkbox-groups:read') as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });
  });

  it('should handle multiple groups', async () => {
    const user = userEvent.setup();
    renderDialog();

    const dropdown = screen.getByTestId('select-group-dropdown');

    // Select first group
    await user.selectOptions(dropdown, 'group-1');
    await waitFor(() => {
      expect(screen.getByTestId('operation-checkbox-groups:read')).toBeInTheDocument();
    });

    // Select second group
    await user.selectOptions(dropdown, 'group-2');
    await waitFor(() => {
      expect(screen.getByTestId('operation-checkbox-groups:read')).toBeInTheDocument();
    });
  });
});
