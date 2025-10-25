import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupsToolbar } from './GroupsToolbar';

describe('GroupsToolbar', () => {
  const mockOnSearchChange = vi.fn();
  const mockOnSortChange = vi.fn();

  it('renders search input with placeholder', () => {
    render(
      <GroupsToolbar
        search=""
        sort="-created_at"
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const input = screen.getByPlaceholderText('Search groups...');
    expect(input).toBeInTheDocument();
  });

  it('renders sort dropdown with default option', () => {
    render(
      <GroupsToolbar
        search=""
        sort="-created_at"
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const select = screen.getByDisplayValue('Newest first');
    expect(select).toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', async () => {
    const user = userEvent.setup();
    render(
      <GroupsToolbar
        search=""
        sort="-created_at"
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const input = screen.getByPlaceholderText('Search groups...');
    await user.type(input, 'Test');

    expect(mockOnSearchChange).toHaveBeenCalledWith('Test');
  });

  it('trims search input before calling onSearchChange', async () => {
    const user = userEvent.setup();
    render(
      <GroupsToolbar
        search=""
        sort="-created_at"
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const input = screen.getByPlaceholderText('Search groups...');
    await user.type(input, '  Test  ');

    expect(mockOnSearchChange).toHaveBeenCalledWith('Test');
  });

  it('does not call onSearchChange if search exceeds 100 characters', async () => {
    const user = userEvent.setup();
    mockOnSearchChange.mockClear();

    render(
      <GroupsToolbar
        search=""
        sort="-created_at"
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const input = screen.getByPlaceholderText('Search groups...');
    const longString = 'a'.repeat(101);
    await user.type(input, longString);

    expect(mockOnSearchChange).not.toHaveBeenCalledWith(longString);
  });

  it('calls onSortChange when sort selection changes', async () => {
    const user = userEvent.setup();
    render(
      <GroupsToolbar
        search=""
        sort="-created_at"
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const select = screen.getByDisplayValue('Newest first');
    await user.selectOptions(select, 'name');

    expect(mockOnSortChange).toHaveBeenCalledWith('name');
  });

  it('populates search field with initial search value', () => {
    render(
      <GroupsToolbar
        search="Test Group"
        sort="-created_at"
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const input = screen.getByDisplayValue('Test Group');
    expect(input).toBeInTheDocument();
  });

  it('displays all sort options', () => {
    render(
      <GroupsToolbar
        search=""
        sort="-created_at"
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByText('Newest first')).toBeInTheDocument();
    expect(screen.getByText('Oldest first')).toBeInTheDocument();
    expect(screen.getByText('Name (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('Name (Z-A)')).toBeInTheDocument();
  });

  it('defaults to Newest first sort when invalid sort value provided', () => {
    render(
      <GroupsToolbar
        search=""
        sort="invalid-sort"
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const select = screen.getByDisplayValue('Newest first');
    expect(select).toBeInTheDocument();
  });

  it('has responsive layout classes', () => {
    const { container } = render(
      <GroupsToolbar
        search=""
        sort="-created_at"
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
      />
    );

    const toolbar = container.querySelector('div[class*="flex flex-col"]');
    expect(toolbar?.className).toMatch(/sm:flex-row/);
    expect(toolbar?.className).toMatch(/gap-4/);
  });
});
