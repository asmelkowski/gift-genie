import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ExclusionsToolbar } from './ExclusionsToolbar';

describe('ExclusionsToolbar', () => {
  it('renders filter buttons', () => {
    render(
      <ExclusionsToolbar
        onCreateClick={() => {}}
        filterType="all"
        onFilterChange={() => {}}
        sortBy="exclusion_type,name"
        onSortChange={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manual/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /historical/i })).toBeInTheDocument();
  });

  it('highlights active filter', () => {
    const { rerender } = render(
      <ExclusionsToolbar
        onCreateClick={() => {}}
        filterType="all"
        onFilterChange={() => {}}
        sortBy="exclusion_type,name"
        onSortChange={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /all/i })).toHaveClass('bg-blue-100');

    rerender(
      <ExclusionsToolbar
        onCreateClick={() => {}}
        filterType="manual"
        onFilterChange={() => {}}
        sortBy="exclusion_type,name"
        onSortChange={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /manual/i })).toHaveClass('bg-blue-100');
  });

  it('calls onFilterChange when filter button is clicked', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(
      <ExclusionsToolbar
        onCreateClick={() => {}}
        filterType="all"
        onFilterChange={onFilterChange}
        sortBy="exclusion_type,name"
        onSortChange={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /manual/i }));
    expect(onFilterChange).toHaveBeenCalledWith('manual');
  });

  it('renders Add Exclusion button', () => {
    render(
      <ExclusionsToolbar
        onCreateClick={() => {}}
        filterType="all"
        onFilterChange={() => {}}
        sortBy="exclusion_type,name"
        onSortChange={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /add exclusion/i })).toBeInTheDocument();
  });

  it('calls onCreateClick when Add Exclusion button is clicked', async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    render(
      <ExclusionsToolbar
        onCreateClick={onCreateClick}
        filterType="all"
        onFilterChange={() => {}}
        sortBy="exclusion_type,name"
        onSortChange={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /add exclusion/i }));
    expect(onCreateClick).toHaveBeenCalled();
  });

  it('disables Add Exclusion button when viewing historical exclusions', () => {
    render(
      <ExclusionsToolbar
        onCreateClick={() => {}}
        filterType="historical"
        onFilterChange={() => {}}
        sortBy="exclusion_type,name"
        onSortChange={() => {}}
      />
    );

    const addButton = screen.getByRole('button', { name: /add exclusion/i });
    expect(addButton).toBeDisabled();
  });

  it('enables Add Exclusion button when not viewing historical exclusions', () => {
    render(
      <ExclusionsToolbar
        onCreateClick={() => {}}
        filterType="all"
        onFilterChange={() => {}}
        sortBy="exclusion_type,name"
        onSortChange={() => {}}
      />
    );

    const addButton = screen.getByRole('button', { name: /add exclusion/i });
    expect(addButton).not.toBeDisabled();
  });

  it('renders sort dropdown', () => {
    render(
      <ExclusionsToolbar
        onCreateClick={() => {}}
        filterType="all"
        onFilterChange={() => {}}
        sortBy="exclusion_type,name"
        onSortChange={() => {}}
      />
    );

    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
  });

  it('calls onSortChange when sort option is changed', async () => {
    const onSortChange = vi.fn();

    render(
      <ExclusionsToolbar
        onCreateClick={() => {}}
        filterType="all"
        onFilterChange={() => {}}
        sortBy="exclusion_type,name"
        onSortChange={onSortChange}
      />
    );

    const sortSelect = screen.getByLabelText(/sort by/i);
    await userEvent.selectOptions(sortSelect, '-created_at');

    expect(onSortChange).toHaveBeenCalledWith('-created_at');
  });

  it('renders all sort options', () => {
    render(
      <ExclusionsToolbar
        onCreateClick={() => {}}
        filterType="all"
        onFilterChange={() => {}}
        sortBy="exclusion_type,name"
        onSortChange={() => {}}
      />
    );

    const sortSelect = screen.getByLabelText(/sort by/i) as HTMLSelectElement;
    expect(sortSelect.options).toHaveLength(5);
    expect(sortSelect.options[0].text).toBe('Type & Name');
    expect(sortSelect.options[1].text).toBe('Newest First');
    expect(sortSelect.options[2].text).toBe('Oldest First');
    expect(sortSelect.options[3].text).toBe('Giver Name (A-Z)');
    expect(sortSelect.options[4].text).toBe('Giver Name (Z-A)');
  });
});
