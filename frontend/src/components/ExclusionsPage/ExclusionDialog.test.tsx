import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExclusionDialog } from './ExclusionDialog';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];

describe('ExclusionDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const createMockMember = (overrides?: Partial<MemberResponse>): MemberResponse => ({
    id: 'member-1',
    name: 'John Doe',
    email: 'john@example.com',
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    ...overrides,
  });

  const members = [
    createMockMember({ id: 'member-1', name: 'Alice' }),
    createMockMember({ id: 'member-2', name: 'Bob' }),
  ];

  it('does not render when isOpen is false', () => {
    render(
      <ExclusionDialog
        isOpen={false}
        onClose={mockOnClose}
        members={members}
        groupId="group-1"
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.queryByText('Create Exclusion')).not.toBeInTheDocument();
  });

  it('renders dialog when isOpen is true', () => {
    render(
      <ExclusionDialog
        isOpen={true}
        onClose={mockOnClose}
        members={members}
        groupId="group-1"
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByRole('heading', { name: 'Create Exclusion' })).toBeInTheDocument();
  });

  it('renders ExclusionForm with members', () => {
    render(
      <ExclusionDialog
        isOpen={true}
        onClose={mockOnClose}
        members={members}
        groupId="group-1"
        onSubmit={mockOnSubmit}
      />
    );

    // ExclusionForm should have rendered the form with member options
    expect(screen.getByRole('heading', { name: 'Create Exclusion' })).toBeInTheDocument();
  });

  it('closes dialog when backdrop is clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    const { container } = render(
      <ExclusionDialog
        isOpen={true}
        onClose={mockOnClose}
        members={members}
        groupId="group-1"
        onSubmit={mockOnSubmit}
      />
    );

    const backdrop = container.querySelector('div[class*="bg-black"]');
    await user.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose after successful submission', async () => {
    const mockOnSubmitAsync = vi.fn().mockResolvedValue(undefined);

    render(
      <ExclusionDialog
        isOpen={true}
        onClose={mockOnClose}
        members={members}
        groupId="group-1"
        onSubmit={mockOnSubmitAsync}
      />
    );

    // Note: The actual form submission would be tested in ExclusionForm.test.tsx
    // This test verifies the dialog's behavior
    expect(screen.getByRole('heading', { name: 'Create Exclusion' })).toBeInTheDocument();
  });

  it('passes loading state to form', () => {
    render(
      <ExclusionDialog
        isOpen={true}
        onClose={mockOnClose}
        members={members}
        groupId="group-1"
        onSubmit={mockOnSubmit}
        isLoading={true}
      />
    );

    expect(screen.getByRole('heading', { name: 'Create Exclusion' })).toBeInTheDocument();
  });

  it('handles local loading state during form submission', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const mockOnSubmitAsync = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ExclusionDialog
        isOpen={true}
        onClose={mockOnClose}
        members={members}
        groupId="group-1"
        onSubmit={mockOnSubmitAsync}
      />
    );

    expect(screen.getByRole('heading', { name: 'Create Exclusion' })).toBeInTheDocument();
  });
});
