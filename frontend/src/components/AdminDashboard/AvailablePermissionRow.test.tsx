import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvailablePermissionRow } from './AvailablePermissionRow';
import type { Permission } from '@/hooks/useUserPermissions';

describe('AvailablePermissionRow', () => {
  const mockPermission: Permission = {
    code: 'groups:delete',
    name: 'Delete Groups',
    description: 'Delete groups and all associated data',
    category: 'groups',
    created_at: '2025-12-17T00:00:00Z',
  };

  const mockOnGrant = vi.fn().mockResolvedValue(undefined);

  it('renders permission name and description', () => {
    render(
      <AvailablePermissionRow
        permission={mockPermission}
        testId="test-permission"
        onGrant={mockOnGrant}
      />
    );

    expect(screen.getByText('Delete Groups')).toBeInTheDocument();
    expect(screen.getByText('Delete groups and all associated data')).toBeInTheDocument();
  });

  it('displays permission code badge', () => {
    render(
      <AvailablePermissionRow
        permission={mockPermission}
        testId="test-permission"
        onGrant={mockOnGrant}
      />
    );

    expect(screen.getByText('groups:delete')).toBeInTheDocument();
  });

  it('shows group name when provided', () => {
    render(
      <AvailablePermissionRow
        permission={mockPermission}
        groupName="Engineering Team"
        testId="test-permission"
        onGrant={mockOnGrant}
      />
    );

    expect(screen.getByText('(Engineering Team)')).toBeInTheDocument();
  });

  it('renders Grant button with correct test ID', () => {
    render(
      <AvailablePermissionRow
        permission={mockPermission}
        testId="available-permission-groups:delete"
        onGrant={mockOnGrant}
      />
    );

    expect(screen.getByTestId('grant-permission-groups:delete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grant/i })).toBeInTheDocument();
  });

  it('calls onGrant with permission code when Grant button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AvailablePermissionRow
        permission={mockPermission}
        testId="test-permission"
        onGrant={mockOnGrant}
      />
    );

    const grantButton = screen.getByRole('button', { name: /grant/i });
    await user.click(grantButton);

    expect(mockOnGrant).toHaveBeenCalledWith('groups:delete');
  });

  it('disables Grant button when isGranting is true', () => {
    render(
      <AvailablePermissionRow
        permission={mockPermission}
        testId="test-permission"
        onGrant={mockOnGrant}
        isGranting={true}
      />
    );

    const grantButton = screen.getByRole('button', { name: /grant/i });
    expect(grantButton).toBeDisabled();
  });

  it('applies test ID to container', () => {
    const { container } = render(
      <AvailablePermissionRow
        permission={mockPermission}
        testId="available-permission-groups:delete"
        onGrant={mockOnGrant}
      />
    );

    expect(
      container.querySelector('[data-testid="available-permission-groups:delete"]')
    ).toBeInTheDocument();
  });

  it('renders with emerald badge color for available permissions', () => {
    const { container } = render(
      <AvailablePermissionRow
        permission={mockPermission}
        testId="test-permission"
        onGrant={mockOnGrant}
      />
    );

    const badge = container.querySelector('.bg-emerald-100');
    expect(badge).toBeInTheDocument();
  });

  it('shows loading spinner when isGranting is true', () => {
    const { container } = render(
      <AvailablePermissionRow
        permission={mockPermission}
        testId="test-permission"
        onGrant={mockOnGrant}
        isGranting={true}
      />
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('does not show loading spinner when isGranting is false', () => {
    const { container } = render(
      <AvailablePermissionRow
        permission={mockPermission}
        testId="test-permission"
        onGrant={mockOnGrant}
        isGranting={false}
      />
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });
});
