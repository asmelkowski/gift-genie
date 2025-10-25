import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemberCard } from './MemberCard';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];

describe('MemberCard', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  const createMockMember = (overrides?: Partial<MemberResponse>): MemberResponse => ({
    id: 'member-1',
    name: 'John Doe',
    email: 'john@example.com',
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    ...overrides,
  });

  it('renders member name', () => {
    const member = createMockMember({ name: 'Alice Smith' });

    render(<MemberCard member={member} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('displays active status when is_active is true', () => {
    const member = createMockMember({ is_active: true });

    render(<MemberCard member={member} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays inactive status when is_active is false', () => {
    const member = createMockMember({ is_active: false });

    render(<MemberCard member={member} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('displays email address when provided', () => {
    const member = createMockMember({ email: 'test@example.com' });

    render(<MemberCard member={member} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('displays placeholder text when email is not provided', () => {
    const member = createMockMember({ email: '' });

    render(<MemberCard member={member} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('No email provided')).toBeInTheDocument();
  });

  it('displays creation date in correct format', () => {
    const member = createMockMember({ created_at: '2024-01-15T00:00:00Z' });

    render(<MemberCard member={member} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText(/Created/)).toBeInTheDocument();
  });

  it('calls onEdit callback when edit button clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const member = createMockMember({ id: 'member-123', name: 'Test User' });

    render(<MemberCard member={member} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(member);
  });

  it('shows delete confirmation dialog when delete button clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const member = createMockMember({ name: 'John Doe' });

    render(<MemberCard member={member} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(screen.getByText(/Are you sure you want to delete John Doe/)).toBeInTheDocument();
  });

  it('calls onDelete when confirming deletion', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const member = createMockMember({ id: 'member-123' });

    render(<MemberCard member={member} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete member/i });
    await user.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
    await user.click(confirmButton);

    expect(mockOnDelete).toHaveBeenCalledWith('member-123');
  });

  it('hides confirmation dialog when cancel button clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const member = createMockMember();

    render(<MemberCard member={member} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    const cancelButton = screen.getByRole('button', { name: /cancel delete/i });
    await user.click(cancelButton);

    expect(mockOnDelete).not.toHaveBeenCalled();
    expect(screen.queryByText(/Are you sure/)).not.toBeInTheDocument();
  });
});
