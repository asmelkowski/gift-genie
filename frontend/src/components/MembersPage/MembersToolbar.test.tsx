import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MembersToolbar } from './MembersToolbar';

describe('MembersToolbar', () => {
  const mockOnActiveFilterChange = vi.fn();
  const mockOnSearchChange = vi.fn();
  const mockOnSortChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active status filter buttons', () => {
    render(
      <MembersToolbar
        isActive={null}
        search=""
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inactive' })).toBeInTheDocument();
  });

  it('highlights all button when isActive is null', () => {
    render(
      <MembersToolbar
        isActive={null}
        search=""
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const allButton = screen.getByRole('button', { name: 'All' });
    expect(allButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('highlights active button when isActive is true', () => {
    render(
      <MembersToolbar
        isActive={true}
        search=""
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const activeButton = screen.getByRole('button', { name: 'Active' });
    expect(activeButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('highlights inactive button when isActive is false', () => {
    render(
      <MembersToolbar
        isActive={false}
        search=""
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const inactiveButton = screen.getByRole('button', { name: 'Inactive' });
    expect(inactiveButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onActiveFilterChange when filter button clicked', async () => {
    const user = userEvent.setup();
    render(
      <MembersToolbar
        isActive={null}
        search=""
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const activeButton = screen.getByRole('button', { name: 'Active' });
    await user.click(activeButton);

    expect(mockOnActiveFilterChange).toHaveBeenCalledWith(true);
  });

  it('renders search input with placeholder', () => {
    render(
      <MembersToolbar
        isActive={null}
        search=""
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const input = screen.getByPlaceholderText('Search by name or email...');
    expect(input).toBeInTheDocument();
  });

  it('debounces search input changes', async () => {
    const user = userEvent.setup();
    render(
      <MembersToolbar
        isActive={null}
        search=""
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const input = screen.getByPlaceholderText('Search by name or email...');
    await user.type(input, 'test');

    // Should not call onSearchChange immediately
    expect(mockOnSearchChange).not.toHaveBeenCalled();

    // Should call onSearchChange after debounce
    await waitFor(
      () => {
        expect(mockOnSearchChange).toHaveBeenCalledWith('test');
      },
      { timeout: 1000 }
    );
  }, 10000);

  it('shows clear button when search has value', async () => {
    const user = userEvent.setup();
    render(
      <MembersToolbar
        isActive={null}
        search="test"
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toBeInTheDocument();
  });

  it('hides clear button when search is empty', () => {
    render(
      <MembersToolbar
        isActive={null}
        search=""
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const clearButton = screen.queryByLabelText('Clear search');
    expect(clearButton).not.toBeInTheDocument();
  });

  it('clears search when clear button clicked', async () => {
    const user = userEvent.setup();
    render(
      <MembersToolbar
        isActive={null}
        search="test"
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);

    expect(mockOnSearchChange).toHaveBeenCalledWith('');
  }, 10000);

  it('renders sort dropdown with options', () => {
    render(
      <MembersToolbar
        isActive={null}
        search=""
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByDisplayValue('Name (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('Name (Z-A)')).toBeInTheDocument();
    expect(screen.getByText('Newest First')).toBeInTheDocument();
    expect(screen.getByText('Oldest First')).toBeInTheDocument();
  });

  it('calls onSortChange when sort selection changes', async () => {
    const user = userEvent.setup();
    render(
      <MembersToolbar
        isActive={null}
        search=""
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const select = screen.getByDisplayValue('Name (A-Z)');
    await user.selectOptions(select, '-name');

    expect(mockOnSortChange).toHaveBeenCalledWith('-name');
  }, 10000);

  it('updates search input when search prop changes externally', () => {
    const { rerender } = render(
      <MembersToolbar
        isActive={null}
        search="initial"
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const input = screen.getByDisplayValue('initial');
    expect(input).toBeInTheDocument();

    rerender(
      <MembersToolbar
        isActive={null}
        search="updated"
        sort="name"
        onActiveFilterChange={mockOnActiveFilterChange}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const updatedInput = screen.getByDisplayValue('updated');
    expect(updatedInput).toBeInTheDocument();
  });
});
