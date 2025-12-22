import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GrantGroupAccessSection } from './GrantGroupAccessSection';
import * as useAdminModule from '@/hooks/useAdmin';
import * as useGrantPermissionModule from '@/hooks/useGrantPermission';
import type { Permission } from '@/hooks/useUserPermissions';

vi.mock('@/hooks/useAdmin');
vi.mock('@/hooks/useGrantPermission');

describe('GrantGroupAccessSection', () => {
  let queryClient: QueryClient;
  const mockOnGrantComplete = vi.fn();

  const mockGroups = {
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
      {
        id: 'group-3',
        name: 'Sales Team',
        admin_user_id: 'admin-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        historical_exclusions_enabled: false,
      },
    ],
    meta: { total: 3, page: 1, page_size: 100, total_pages: 1 },
  };

  const mockUserPermissions: Permission[] = [
    {
      code: 'admin:view_dashboard',
      name: 'View Dashboard',
      description: 'View admin dashboard',
      category: 'admin',
      created_at: '2025-01-01T00:00:00Z',
    },
    // User already has groups:read for group-1
    {
      code: 'groups:read:group-1',
      name: 'Read Group',
      description: 'Read group details',
      category: 'groups',
      created_at: '2025-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    vi.mocked(useAdminModule.useAdminGroups).mockReturnValue({
      data: mockGroups,
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
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

    mockOnGrantComplete.mockClear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <GrantGroupAccessSection
          userId="user-1"
          userPermissions={mockUserPermissions}
          onGrantComplete={mockOnGrantComplete}
        />
      </QueryClientProvider>
    );
  };

  it('should render group dropdown', () => {
    renderComponent();
    const dropdown = screen.getByTestId('select-group-dropdown');
    expect(dropdown).toBeInTheDocument();
  });

  it('should show all available groups in dropdown', () => {
    renderComponent();
    const dropdown = screen.getByTestId('select-group-dropdown') as HTMLSelectElement;
    const options = dropdown.querySelectorAll('option');
    // +1 for the "Choose a group..." placeholder
    expect(options.length).toBe(mockGroups.data.length + 1);
  });

  it('should not show operations checkboxes when no group selected', () => {
    renderComponent();
    expect(screen.queryByTestId('operation-checkbox-groups:read')).not.toBeInTheDocument();
  });

  it('should show operations checkboxes when group selected', async () => {
    const user = userEvent.setup();
    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-2');

    await waitFor(() => {
      expect(screen.getByTestId('operation-checkbox-groups:read')).toBeInTheDocument();
    });
  });

  it('should disable already-granted permissions', async () => {
    const user = userEvent.setup();
    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-1');

    await waitFor(() => {
      const checkbox = screen.getByTestId('operation-checkbox-groups:read') as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });
  });

  it('should not disable permissions not yet granted', async () => {
    const user = userEvent.setup();
    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-2');

    await waitFor(() => {
      const checkbox = screen.getByTestId('operation-checkbox-groups:read') as HTMLInputElement;
      expect(checkbox.disabled).toBe(false);
    });
  });

  it('should toggle checkbox selection', async () => {
    const user = userEvent.setup();
    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-2');

    const checkbox = await screen.findByTestId('operation-checkbox-groups:read');
    expect((checkbox as HTMLInputElement).checked).toBe(false);

    await user.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    await user.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });

  it('should disable grant button when no group selected', () => {
    renderComponent();
    expect(screen.queryByTestId('grant-group-access-button')).not.toBeInTheDocument();
  });

  it('should disable grant button when no permissions selected', async () => {
    const user = userEvent.setup();
    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-2');

    await waitFor(() => {
      const button = screen.getByTestId('grant-group-access-button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });
  });

  it('should enable grant button when permissions selected', async () => {
    const user = userEvent.setup();
    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-2');

    const checkbox = await screen.findByTestId('operation-checkbox-groups:read');
    await user.click(checkbox);

    await waitFor(() => {
      const button = screen.getByTestId('grant-group-access-button') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  it('should call grant mutation with correct permission codes', async () => {
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

    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-2');

    const readCheckbox = await screen.findByTestId('operation-checkbox-groups:read');
    const createCheckbox = await screen.findByTestId('operation-checkbox-groups:update');

    await user.click(readCheckbox);
    await user.click(createCheckbox);

    const button = screen.getByTestId('grant-group-access-button');
    await user.click(button);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ permission_code: 'groups:read:group-2' });
      expect(mockMutateAsync).toHaveBeenCalledWith({ permission_code: 'groups:update:group-2' });
    });
  });

  it('should grant multiple permissions in parallel', async () => {
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

    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-2');

    const readCheckbox = await screen.findByTestId('operation-checkbox-groups:read');
    const createCheckbox = await screen.findByTestId('operation-checkbox-members:create');

    await user.click(readCheckbox);
    await user.click(createCheckbox);

    const button = screen.getByTestId('grant-group-access-button');
    await user.click(button);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    });
  });

  it('should reset form after successful grant', async () => {
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

    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-2');

    const readCheckbox = await screen.findByTestId('operation-checkbox-groups:read');
    await user.click(readCheckbox);

    const button = screen.getByTestId('grant-group-access-button');
    await user.click(button);

    await waitFor(() => {
      const select = screen.getByTestId('select-group-dropdown') as HTMLSelectElement;
      expect(select.value).toBe('');
    });
  });

  it('should call onGrantComplete after successful grant', async () => {
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

    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-2');

    const readCheckbox = await screen.findByTestId('operation-checkbox-groups:read');
    await user.click(readCheckbox);

    const button = screen.getByTestId('grant-group-access-button');
    await user.click(button);

    await waitFor(() => {
      expect(mockOnGrantComplete).toHaveBeenCalled();
    });
  });

  it('should show loading state when groups are loading', () => {
    vi.mocked(useAdminModule.useAdminGroups).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isSuccess: false,
      isFetched: false,
      status: 'pending',
    } as never);

    const { container } = renderComponent();
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show message when no groups available', () => {
    vi.mocked(useAdminModule.useAdminGroups).mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, page_size: 100, total_pages: 0 } },
      isLoading: false,
      error: null,
      isSuccess: true,
      isFetched: true,
      status: 'success',
    } as never);

    renderComponent();
    expect(screen.getByText('No groups available')).toBeInTheDocument();
  });

  it('should clear selections when group changes', async () => {
    const user = userEvent.setup();
    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-2');

    const readCheckbox = await screen.findByTestId('operation-checkbox-groups:read');
    await user.click(readCheckbox);
    expect((readCheckbox as HTMLInputElement).checked).toBe(true);

    // Change to a different group
    await user.selectOptions(dropdown, 'group-3');

    // The checkbox should not exist anymore because we cleared selections
    await waitFor(() => {
      const newCheckbox = screen.queryByTestId('operation-checkbox-groups:read');
      expect(newCheckbox).toBeInTheDocument();
      expect((newCheckbox as HTMLInputElement).checked).toBe(false);
    });
  });

  it('should show privilege icon for draws:notify', async () => {
    const user = userEvent.setup();
    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-2');

    // Wait for the privileged operation to render
    await waitFor(() => {
      const privilege = screen.getByText('Send notifications', { selector: 'span' });
      expect(privilege).toBeInTheDocument();
    });
  });

  it('should update grant button text with selected count', async () => {
    const user = userEvent.setup();
    renderComponent();

    const dropdown = screen.getByTestId('select-group-dropdown');
    await user.selectOptions(dropdown, 'group-2');

    const readCheckbox = await screen.findByTestId('operation-checkbox-groups:read');
    const updateCheckbox = await screen.findByTestId('operation-checkbox-groups:update');

    await user.click(readCheckbox);
    await user.click(updateCheckbox);

    await waitFor(() => {
      const button = screen.getByTestId('grant-group-access-button');
      expect(button.textContent).toContain('2 Selected');
    });
  });
});
