import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MembersGrid } from './MembersGrid';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];

describe('MembersGrid', () => {
  const mockOnMemberEdit = vi.fn();
  const mockOnMemberDelete = vi.fn();

  const createMockMember = (overrides?: Partial<MemberResponse>): MemberResponse => ({
    id: 'member-1',
    group_id: 'group-1',
    name: 'John Doe',
    email: 'john@example.com',
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    ...overrides,
  });

  it('renders empty state when no members provided', () => {
    const { container } = render(
      <MembersGrid
        members={[]}
        onMemberEdit={mockOnMemberEdit}
        onMemberDelete={mockOnMemberDelete}
      />
    );

    const grid = container.querySelector('.grid');
    expect(grid?.children.length).toBe(0);
  });

  it('renders MemberCard for each member', () => {
    const members = [
      createMockMember({ id: 'member-1', name: 'Alice' }),
      createMockMember({ id: 'member-2', name: 'Bob' }),
      createMockMember({ id: 'member-3', name: 'Charlie' }),
    ];

    render(
      <MembersGrid
        members={members}
        onMemberEdit={mockOnMemberEdit}
        onMemberDelete={mockOnMemberDelete}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('passes onMemberEdit callback to each MemberCard', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const member = createMockMember({ id: 'member-1', name: 'Test User' });

    render(
      <MembersGrid
        members={[member]}
        onMemberEdit={mockOnMemberEdit}
        onMemberDelete={mockOnMemberDelete}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    expect(mockOnMemberEdit).toHaveBeenCalledWith(member);
  });

  it('passes onMemberDelete callback to each MemberCard', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const member = createMockMember({ id: 'member-1', name: 'Test User' });

    render(
      <MembersGrid
        members={[member]}
        onMemberEdit={mockOnMemberEdit}
        onMemberDelete={mockOnMemberDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Shows confirmation dialog - need to confirm
    const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
    await user.click(confirmButton);

    expect(mockOnMemberDelete).toHaveBeenCalledWith('member-1');
  });

  it('renders correct CSS grid classes for responsive layout', () => {
    const members = [createMockMember()];

    const { container } = render(
      <MembersGrid
        members={members}
        onMemberEdit={mockOnMemberEdit}
        onMemberDelete={mockOnMemberDelete}
      />
    );

    const gridContainer = container.querySelector('div[class*="grid"]');
    expect(gridContainer?.className).toMatch(/grid-cols-1/);
    expect(gridContainer?.className).toMatch(/md:grid-cols-2/);
    expect(gridContainer?.className).toMatch(/lg:grid-cols-3/);
  });
});
