import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ExclusionCard } from './ExclusionCard';
import type { components } from '@/types/schema';

type ExclusionResponse = components['schemas']['ExclusionResponse'];
type MemberResponse = components['schemas']['MemberResponse'];

const mockExclusion: ExclusionResponse = {
  id: 'excl-123',
  group_id: 'group-123',
  giver_member_id: 'member-giver',
  receiver_member_id: 'member-receiver',
  exclusion_type: 'manual',
  is_mutual: false,
  created_at: '2025-01-15T10:00:00Z',
  created_by_user_id: 'user-123',
};

const mockGiverMember: MemberResponse = {
  id: 'member-giver',
  group_id: 'group-123',
  name: 'John Doe',
  email: 'john@example.com',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
};

const mockReceiverMember: MemberResponse = {
  id: 'member-receiver',
  group_id: 'group-123',
  name: 'Jane Smith',
  email: 'jane@example.com',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
};

describe('ExclusionCard', () => {
  it('renders truncated UUIDs by default', () => {
    render(
      <ExclusionCard
        exclusion={mockExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        onDelete={() => {}}
      />
    );

    // Text is split across multiple elements, so use flexible matchers
    expect(screen.getByText(/member-g/)).toBeInTheDocument();
    expect(screen.getByText(/member-r/)).toBeInTheDocument();
  });

  it('renders type badge', () => {
    render(
      <ExclusionCard
        exclusion={mockExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('renders mutual badge when is_mutual is true', () => {
    const mutualExclusion = { ...mockExclusion, is_mutual: true };
    render(
      <ExclusionCard
        exclusion={mutualExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText('Mutual')).toBeInTheDocument();
  });

  it('expands to show member details on click', async () => {
    const user = userEvent.setup();
    render(
      <ExclusionCard
        exclusion={mockExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        giverMember={mockGiverMember}
        receiverMember={mockReceiverMember}
        onDelete={() => {}}
      />
    );

    // Use getAllByRole to target the expand button (first button that's not the delete button)
    const buttons = screen.getAllByRole('button');
    const expandButton =
      buttons.find(btn => btn.textContent?.includes('→') || btn.textContent?.includes('↔')) ||
      buttons[0];
    await user.click(expandButton);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('shows inactive badge for inactive members', async () => {
    const user = userEvent.setup();
    const inactiveMember = { ...mockGiverMember, is_active: false };
    render(
      <ExclusionCard
        exclusion={mockExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        giverMember={inactiveMember}
        receiverMember={mockReceiverMember}
        onDelete={() => {}}
      />
    );

    // Use getAllByRole to target the expand button
    const buttons = screen.getAllByRole('button');
    const expandButton =
      buttons.find(btn => btn.textContent?.includes('→') || btn.textContent?.includes('↔')) ||
      buttons[0];
    await user.click(expandButton);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows delete button for manual exclusions', () => {
    render(
      <ExclusionCard
        exclusion={mockExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        onDelete={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('does not show delete button for historical exclusions', () => {
    const historicalExclusion = { ...mockExclusion, exclusion_type: 'historical' as const };
    render(
      <ExclusionCard
        exclusion={historicalExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        onDelete={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.getByText(/system-generated/i)).toBeInTheDocument();
  });

  it('shows system-generated label for historical exclusions', () => {
    const historicalExclusion = { ...mockExclusion, exclusion_type: 'historical' as const };
    render(
      <ExclusionCard
        exclusion={historicalExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText(/system-generated/i)).toBeInTheDocument();
  });

  it('does not expand historical exclusions', () => {
    const historicalExclusion = { ...mockExclusion, exclusion_type: 'historical' as const };
    render(
      <ExclusionCard
        exclusion={historicalExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        giverMember={mockGiverMember}
        receiverMember={mockReceiverMember}
        onDelete={() => {}}
      />
    );

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <ExclusionCard
        exclusion={mockExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        onDelete={onDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith('excl-123');
  });

  it('shows creation date', () => {
    render(
      <ExclusionCard
        exclusion={mockExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText(/created/i)).toBeInTheDocument();
  });

  it('shows arrow for one-way exclusion', () => {
    render(
      <ExclusionCard
        exclusion={mockExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('shows bidirectional arrow for mutual exclusion', () => {
    const mutualExclusion = { ...mockExclusion, is_mutual: true };
    render(
      <ExclusionCard
        exclusion={mutualExclusion}
        giverName={mockGiverMember.name}
        receiverName={mockReceiverMember.name}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText('↔')).toBeInTheDocument();
  });
});
