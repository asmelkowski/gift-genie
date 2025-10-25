import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DrawsToolbar from './DrawsToolbar';

describe('DrawsToolbar', () => {
  const mockOnStatusChange = vi.fn();
  const mockOnSortChange = vi.fn();

  it('renders status filter dropdown', () => {
    render(
      <DrawsToolbar
        status="all"
        onStatusChange={mockOnStatusChange}
        sort="-created_at"
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByDisplayValue('All Draws')).toBeInTheDocument();
  });

  it('displays all status options', () => {
    render(
      <DrawsToolbar
        status="all"
        onStatusChange={mockOnStatusChange}
        sort="-created_at"
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByText('All Draws')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Finalized')).toBeInTheDocument();
  });

  it('calls onStatusChange when status selection changes', async () => {
    const user = userEvent.setup();
    render(
      <DrawsToolbar
        status="all"
        onStatusChange={mockOnStatusChange}
        sort="-created_at"
        onSortChange={mockOnSortChange}
      />
    );

    const statusSelect = screen.getByDisplayValue('All Draws');
    await user.selectOptions(statusSelect, 'pending');

    expect(mockOnStatusChange).toHaveBeenCalledWith('pending');
  });

  it('selects pending status', async () => {
    const user = userEvent.setup();
    render(
      <DrawsToolbar
        status="pending"
        onStatusChange={mockOnStatusChange}
        sort="-created_at"
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByDisplayValue('Pending')).toBeInTheDocument();
  });

  it('selects finalized status', async () => {
    const user = userEvent.setup();
    render(
      <DrawsToolbar
        status="finalized"
        onStatusChange={mockOnStatusChange}
        sort="-created_at"
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByDisplayValue('Finalized')).toBeInTheDocument();
  });

  it('renders sort dropdown', () => {
    render(
      <DrawsToolbar
        status="all"
        onStatusChange={mockOnStatusChange}
        sort="-created_at"
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByDisplayValue('Created (Newest)')).toBeInTheDocument();
  });

  it('displays all sort options', () => {
    render(
      <DrawsToolbar
        status="all"
        onStatusChange={mockOnStatusChange}
        sort="-created_at"
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByText('Created (Newest)')).toBeInTheDocument();
    expect(screen.getByText('Created (Oldest)')).toBeInTheDocument();
    expect(screen.getByText('Finalized (Newest)')).toBeInTheDocument();
    expect(screen.getByText('Finalized (Oldest)')).toBeInTheDocument();
  });

  it('calls onSortChange when sort selection changes', async () => {
    const user = userEvent.setup();
    render(
      <DrawsToolbar
        status="all"
        onStatusChange={mockOnStatusChange}
        sort="-created_at"
        onSortChange={mockOnSortChange}
      />
    );

    const sortSelect = screen.getByDisplayValue('Created (Newest)');
    await user.selectOptions(sortSelect, 'created_at');

    expect(mockOnSortChange).toHaveBeenCalledWith('created_at');
  });

  it('sorts by finalized date when option selected', async () => {
    const user = userEvent.setup();
    render(
      <DrawsToolbar
        status="all"
        onStatusChange={mockOnStatusChange}
        sort="-finalized_at"
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByDisplayValue('Finalized (Newest)')).toBeInTheDocument();
  });

  it('has responsive layout classes', () => {
    const { container } = render(
      <DrawsToolbar
        status="all"
        onStatusChange={mockOnStatusChange}
        sort="-created_at"
        onSortChange={mockOnSortChange}
      />
    );

    const toolbar = container.querySelector('div[class*="flex flex-col"]');
    expect(toolbar?.className).toMatch(/sm:flex-row/);
    expect(toolbar?.className).toMatch(/gap-4/);
    expect(toolbar?.className).toMatch(/mb-6/);
  });

  it('renders both dropdowns with sr-only labels', () => {
    render(
      <DrawsToolbar
        status="all"
        onStatusChange={mockOnStatusChange}
        sort="-created_at"
        onSortChange={mockOnSortChange}
      />
    );

    // Labels are hidden visually but present for accessibility
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
  });
});
