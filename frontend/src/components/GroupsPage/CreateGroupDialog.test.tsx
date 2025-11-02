import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateGroupDialog } from './CreateGroupDialog';
import * as useCreateGroupMutationModule from '@/hooks/useCreateGroupMutation';

vi.mock('@/hooks/useCreateGroupMutation');

describe('CreateGroupDialog', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderDialog = (isOpen: boolean = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CreateGroupDialog isOpen={isOpen} onClose={mockOnClose} />
      </QueryClientProvider>
    );
  };

  it('renders form fields when open', () => {
    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
    } as any);

    renderDialog(true);

    expect(screen.getByLabelText('Group Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable historical exclusions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('shows lookback field when historical exclusions enabled', async () => {
    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
    } as any);

    renderDialog(true);

    const lookbackInput = screen.queryByLabelText('Lookback (draws)');
    expect(lookbackInput).toBeInTheDocument();
  });

  it('hides lookback field when historical exclusions disabled', async () => {
    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
    } as any);

    renderDialog(true);

    const checkbox = screen.getByLabelText('Enable historical exclusions');
    await userEvent.click(checkbox);

    const lookbackInput = screen.queryByLabelText('Lookback (draws)');
    expect(lookbackInput).not.toBeInTheDocument();
  });

  it('validates required name field', async () => {
    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
    } as any);

    renderDialog(true);

    const nameInput = screen.getByLabelText('Group Name *');
    await userEvent.click(nameInput);
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Group name is required')).toBeInTheDocument();
    });
  });

  it('validates name length', async () => {
    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
    } as any);

    renderDialog(true);

    const nameInput = screen.getByLabelText('Group Name *') as HTMLInputElement;
    expect(nameInput.maxLength).toBe(100);

    await userEvent.type(nameInput, 'a'.repeat(100));
    expect(nameInput.value).toHaveLength(100);
  });

  it('validates lookback field when enabled', async () => {
    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
    } as any);

    renderDialog(true);

    const nameInput = screen.getByLabelText('Group Name *');
    await userEvent.type(nameInput, 'Test Group');

    const lookbackInput = screen.getByLabelText('Lookback (draws)') as HTMLInputElement;
    fireEvent.change(lookbackInput, { target: { value: '0' } });
    fireEvent.blur(lookbackInput);

    await waitFor(() => {
      expect(screen.getByText('Lookback must be a positive integer')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'group-1',
      name: 'My Group',
      historical_exclusions_enabled: true,
      historical_exclusions_lookback: 2,
    });

    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
    } as any);

    renderDialog(true);

    const nameInput = screen.getByLabelText('Group Name *');
    await userEvent.type(nameInput, 'My Group');

    const submitBtn = screen.getByRole('button', { name: /create/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    const callArgs = mockMutateAsync.mock.calls[0]?.[0];
    expect(callArgs?.name).toBe('My Group');
    expect(callArgs?.historical_exclusions_enabled).toBe(true);
    expect(typeof callArgs?.historical_exclusions_lookback).toBe('number');
    expect(callArgs?.historical_exclusions_lookback).toBeGreaterThan(0);
  });

  it('calls onClose after successful submission', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'group-1',
      name: 'My Group',
    });

    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
    } as any);

    renderDialog(true);

    const nameInput = screen.getByLabelText('Group Name *');
    await userEvent.type(nameInput, 'My Group');

    const submitBtn = screen.getByRole('button', { name: /create/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('clears form after successful submission', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'group-1',
      name: 'My Group',
    });

    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
    } as any);

    const { rerender } = renderDialog(true);

    const nameInput = screen.getByLabelText('Group Name *') as HTMLInputElement;
    await userEvent.type(nameInput, 'My Group');

    const submitBtn = screen.getByRole('button', { name: /create/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <CreateGroupDialog isOpen={true} onClose={mockOnClose} />
      </QueryClientProvider>
    );

    const nameInputAfter = screen.getByLabelText('Group Name *') as HTMLInputElement;
    expect(nameInputAfter.value).toBe('');
  });

  it('disables buttons while loading', async () => {
    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'pending',
    } as any);

    renderDialog(true);

    const submitBtn = screen.getByRole('button', { name: /creating/i });
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });

    expect(submitBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
  });

  it('closes dialog when cancel clicked', async () => {
    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
    } as any);

    renderDialog(true);

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('trims whitespace from name', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'group-1' });

    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
    } as any);

    renderDialog(true);

    const nameInput = screen.getByLabelText('Group Name *');
    await userEvent.type(nameInput, '  My Group  ');

    const submitBtn = screen.getByRole('button', { name: /create/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    const callArgs = mockMutateAsync.mock.calls[0]?.[0];
    expect(callArgs).toEqual(expect.objectContaining({ name: 'My Group' }));
  });

  it('sets lookback to null when exclusions disabled', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'group-1' });

    vi.mocked(useCreateGroupMutationModule.useCreateGroupMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
    } as any);

    renderDialog(true);

    const nameInput = screen.getByLabelText('Group Name *');
    await userEvent.type(nameInput, 'My Group');

    const checkbox = screen.getByLabelText('Enable historical exclusions');
    await userEvent.click(checkbox);

    const submitBtn = screen.getByRole('button', { name: /create/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    const callArgs = mockMutateAsync.mock.calls[0]?.[0];
    expect(callArgs).toEqual(
      expect.objectContaining({
        historical_exclusions_enabled: false,
        historical_exclusions_lookback: null,
      })
    );
  });
});
