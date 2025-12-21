import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PermissionRow } from './PermissionRow';
import { type Permission } from '@/hooks/useUserPermissions';

const mockPermission: Permission = {
  code: 'groups:read:550e8400-e29b-41d4-a716-446655440000',
  name: 'Read Groups',
  description: 'View group information',
  category: 'groups',
  created_at: '2024-01-01T00:00:00Z',
};

const mockUnscopedPermission: Permission = {
  code: 'admin:view_dashboard',
  name: 'View Admin Dashboard',
  description: 'Access admin dashboard',
  category: 'admin',
  created_at: '2024-01-01T00:00:00Z',
};

describe('PermissionRow', () => {
  it('renders permission badge correctly', () => {
    const onRevoke = vi.fn();
    render(
      <PermissionRow
        permission={mockPermission}
        onRevoke={onRevoke}
      />
    );

    const badge = screen.getByText('groups:read');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('rounded-full', 'px-2.5', 'py-0.5', 'text-xs');
  });

  it('displays group name when provided', () => {
    const onRevoke = vi.fn();
    const groupName = 'My Christmas Group';

    render(
      <PermissionRow
        permission={mockPermission}
        groupName={groupName}
        onRevoke={onRevoke}
      />
    );

    const groupNameElement = screen.getByText(`(${groupName})`);
    expect(groupNameElement).toBeInTheDocument();
    expect(groupNameElement).toHaveClass('text-xs', 'text-gray-600');
  });

  it('does not show group name when not provided', () => {
    const onRevoke = vi.fn();

    render(
      <PermissionRow
        permission={mockPermission}
        onRevoke={onRevoke}
      />
    );

    // Verify badge is still there
    expect(screen.getByText('groups:read')).toBeInTheDocument();
    // Verify no parentheses are shown
    expect(screen.queryByText(/^\(.*\)$/)).not.toBeInTheDocument();
  });

  it('renders permission name/description', () => {
    const onRevoke = vi.fn();

    render(
      <PermissionRow
        permission={mockPermission}
        onRevoke={onRevoke}
      />
    );

    expect(screen.getByText('Read Groups')).toBeInTheDocument();
    expect(screen.getByText('Read Groups')).toHaveClass('text-xs');
  });

  it('renders revoke button with trash icon', () => {
    const onRevoke = vi.fn();

    render(
      <PermissionRow
        permission={mockPermission}
        onRevoke={onRevoke}
      />
    );

    const revokeButton = screen.getByRole('button', {
      name: /revoke groups:read/i,
    });
    expect(revokeButton).toBeInTheDocument();

    // Check for trash icon
    const trashIcon = revokeButton.querySelector('svg');
    expect(trashIcon).toBeInTheDocument();
  });

  it('calls onRevoke when button clicked', async () => {
    const user = userEvent.setup();
    const onRevoke = vi.fn();

    render(
      <PermissionRow
        permission={mockPermission}
        onRevoke={onRevoke}
      />
    );

    const revokeButton = screen.getByRole('button', {
      name: /revoke groups:read/i,
    });
    await user.click(revokeButton);

    expect(onRevoke).toHaveBeenCalledTimes(1);
  });

  it('disables button when isRevoking is true', () => {
    const onRevoke = vi.fn();

    render(
      <PermissionRow
        permission={mockPermission}
        onRevoke={onRevoke}
        isRevoking={true}
      />
    );

    const revokeButton = screen.getByRole('button', {
      name: /revoke groups:read/i,
    });
    expect(revokeButton).toBeDisabled();
  });

  it('has proper aria-label for accessibility', () => {
    const onRevoke = vi.fn();

    render(
      <PermissionRow
        permission={mockPermission}
        onRevoke={onRevoke}
      />
    );

    const revokeButton = screen.getByRole('button', {
      name: `Revoke ${mockPermission.code}`,
    });
    expect(revokeButton).toHaveAttribute(
      'aria-label',
      `Revoke ${mockPermission.code}`
    );
  });

  it('handles unscoped permissions correctly', () => {
    const onRevoke = vi.fn();

    render(
      <PermissionRow
        permission={mockUnscopedPermission}
        onRevoke={onRevoke}
      />
    );

    // Should display resource:action without UUID
    expect(screen.getByText('admin:view_dashboard')).toBeInTheDocument();
    expect(screen.getByText('View Admin Dashboard')).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    const onRevoke = vi.fn();

    const { container } = render(
      <PermissionRow
        permission={mockPermission}
        onRevoke={onRevoke}
      />
    );

    const row = container.querySelector('div');
    expect(row).toHaveClass(
      'flex',
      'items-center',
      'justify-between',
      'gap-3',
      'rounded-md',
      'bg-white',
      'p-3',
      'dark:bg-gray-800',
      'transition-colors'
    );
  });

  it('displays group name alongside badge with proper spacing', () => {
    const onRevoke = vi.fn();
    const groupName = 'Engineering Team';

    const { container } = render(
      <PermissionRow
        permission={mockPermission}
        groupName={groupName}
        onRevoke={onRevoke}
      />
    );

    // Check the wrapper has proper flex layout
    const badgeWrapper = container.querySelector('div.flex-wrap');
    expect(badgeWrapper).toBeInTheDocument();

    // Verify both badge and group name are present
    expect(screen.getByText('groups:read')).toBeInTheDocument();
    expect(screen.getByText(`(${groupName})`)).toBeInTheDocument();
  });
});
