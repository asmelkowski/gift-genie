import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PermissionBadge } from './PermissionBadge';
import type { Permission } from '@/hooks/useUserPermissions';

describe('PermissionBadge', () => {
  const mockPermission: Permission = {
    code: 'draws:notify',
    name: 'Send Draw Notifications',
    description: 'Send email notifications to draw participants',
    category: 'draws',
    created_at: '2025-12-17T00:00:00Z',
  };

  it('renders permission code', () => {
    render(<PermissionBadge permission={mockPermission} showTooltip={false} />);

    expect(screen.getByText('draws:notify')).toBeInTheDocument();
  });

  it('applies correct color class for draws category', () => {
    const { container } = render(
      <PermissionBadge permission={mockPermission} showTooltip={false} />
    );

    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-purple-100');
  });

  it('applies correct color classes for groups category', () => {
    const groupsPermission: Permission = {
      ...mockPermission,
      category: 'groups',
    };

    const { container } = render(
      <PermissionBadge permission={groupsPermission} showTooltip={false} />
    );

    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-blue-100');
  });

  it('applies correct color classes for members category', () => {
    const membersPermission: Permission = {
      ...mockPermission,
      category: 'members',
    };

    const { container } = render(
      <PermissionBadge permission={membersPermission} showTooltip={false} />
    );

    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-green-100');
  });

  it('applies correct color classes for exclusions category', () => {
    const exclusionsPermission: Permission = {
      ...mockPermission,
      category: 'exclusions',
    };

    const { container } = render(
      <PermissionBadge permission={exclusionsPermission} showTooltip={false} />
    );

    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-orange-100');
  });

  it('applies correct color classes for admin category', () => {
    const adminPermission: Permission = {
      ...mockPermission,
      category: 'admin',
    };

    const { container } = render(
      <PermissionBadge permission={adminPermission} showTooltip={false} />
    );

    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-red-100');
  });

  it('shows tooltip on hover when enabled', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PermissionBadge permission={mockPermission} showTooltip={true} />
    );

    const badge = container.querySelector('span');
    expect(badge).toBeInTheDocument();

    // Hover over badge
    if (badge) {
      await user.hover(badge);
    }

    // Tooltip should be visible
    expect(
      screen.getByText('Send Draw Notifications')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Send email notifications to draw participants')
    ).toBeInTheDocument();
  });

  it('does not show tooltip when disabled', () => {
    render(<PermissionBadge permission={mockPermission} showTooltip={false} />);

    // Tooltip should not be in DOM
    expect(screen.queryByText('Send Draw Notifications')).not.toBeInTheDocument();
  });

  it('uses default color for unknown category', () => {
    const unknownPermission: Permission = {
      ...mockPermission,
      category: 'unknown',
    };

    const { container } = render(
      <PermissionBadge permission={unknownPermission} showTooltip={false} />
    );

    const badge = container.querySelector('span');
    // Should fall back to groups color (blue)
    expect(badge).toHaveClass('bg-blue-100');
  });

  it('has correct semantic badge styling', () => {
    const { container } = render(
      <PermissionBadge permission={mockPermission} showTooltip={false} />
    );

    const badge = container.querySelector('span');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('px-2.5');
    expect(badge).toHaveClass('py-0.5');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-semibold');
  });
});
