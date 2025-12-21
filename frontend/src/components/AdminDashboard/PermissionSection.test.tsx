import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PermissionSection } from './PermissionSection';

describe('PermissionSection', () => {
  it('renders title and count correctly', () => {
    render(
      <PermissionSection title="My Christmas Group" count={14}>
        <div>Test content</div>
      </PermissionSection>
    );

    expect(screen.getByText('My Christmas Group')).toBeInTheDocument();
    expect(screen.getByText('14 permissions')).toBeInTheDocument();
  });

  it('displays icon when provided', () => {
    render(
      <PermissionSection title="My Group" count={5} icon="🎄">
        <div>Test content</div>
      </PermissionSection>
    );

    expect(screen.getByText('🎄')).toBeInTheDocument();
  });

  it('does not display icon when not provided', () => {
    render(
      <PermissionSection title="My Group" count={5}>
        <div>Test content</div>
      </PermissionSection>
    );

    expect(screen.queryByText('🎄')).not.toBeInTheDocument();
  });

  it('renders children correctly', () => {
    render(
      <PermissionSection title="My Group" count={3}>
        <div data-testid="permission-row-1">Permission 1</div>
        <div data-testid="permission-row-2">Permission 2</div>
        <div data-testid="permission-row-3">Permission 3</div>
      </PermissionSection>
    );

    expect(screen.getByTestId('permission-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('permission-row-2')).toBeInTheDocument();
    expect(screen.getByTestId('permission-row-3')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(
      <PermissionSection title="Test Group" count={2}>
        <div>Content</div>
      </PermissionSection>
    );

    const sectionContainer = container.firstChild as HTMLElement;
    expect(sectionContainer).toHaveClass('rounded-lg');
    expect(sectionContainer).toHaveClass('border');
    expect(sectionContainer).toHaveClass('border-gray-200');
    expect(sectionContainer).toHaveClass('dark:border-gray-700');
    expect(sectionContainer).toHaveClass('bg-white');
    expect(sectionContainer).toHaveClass('dark:bg-gray-800');
  });

  it('handles singular "permission" correctly', () => {
    render(
      <PermissionSection title="Group" count={1}>
        <div>Test</div>
      </PermissionSection>
    );

    expect(screen.getByText('1 permission')).toBeInTheDocument();
    expect(screen.queryByText('1 permissions')).not.toBeInTheDocument();
  });

  it('handles plural "permissions" correctly', () => {
    render(
      <PermissionSection title="Group" count={2}>
        <div>Test</div>
      </PermissionSection>
    );

    expect(screen.getByText('2 permissions')).toBeInTheDocument();
    expect(screen.queryByText('2 permission')).not.toBeInTheDocument();
  });

  it('handles zero count with plural', () => {
    render(
      <PermissionSection title="Group" count={0}>
        <div>No permissions</div>
      </PermissionSection>
    );

    expect(screen.getByText('0 permissions')).toBeInTheDocument();
  });

  it('applies dark mode classes correctly', () => {
    const { container } = render(
      <PermissionSection title="Test Group" count={5}>
        <div>Content</div>
      </PermissionSection>
    );

    const sectionContainer = container.firstChild as HTMLElement;
    expect(sectionContainer).toHaveClass('dark:bg-gray-800');
    expect(sectionContainer).toHaveClass('dark:border-gray-700');

    const header = sectionContainer.querySelector('[class*="border-b"]');
    expect(header).toHaveClass('dark:border-gray-700');
  });

  it('renders with header border separator', () => {
    const { container } = render(
      <PermissionSection title="Test Group" count={3}>
        <div>Content</div>
      </PermissionSection>
    );

    const headerDiv = container.querySelector('[class*="border-b"]');
    expect(headerDiv).toBeInTheDocument();
    expect(headerDiv).toHaveClass('border-b');
    expect(headerDiv).toHaveClass('border-gray-200');
  });

  it('truncates long titles', () => {
    const { container } = render(
      <PermissionSection
        title="This is a very long title that should be truncated"
        count={5}
      >
        <div>Content</div>
      </PermissionSection>
    );

    const titleElement = container.querySelector('h3');
    expect(titleElement).toHaveClass('truncate');
  });

  it('applies count badge styling', () => {
    render(
      <PermissionSection title="Group" count={10}>
        <div>Content</div>
      </PermissionSection>
    );

    const countBadge = screen.getByText('10 permissions');
    expect(countBadge).toHaveClass('bg-gray-100');
    expect(countBadge).toHaveClass('dark:bg-gray-700');
    expect(countBadge).toHaveClass('rounded-full');
    expect(countBadge).toHaveClass('px-2');
    expect(countBadge).toHaveClass('py-1');
  });

  it('renders multiple permission rows with spacing', () => {
    const { container } = render(
      <PermissionSection title="Group" count={3}>
        <div data-testid="row-1">Row 1</div>
        <div data-testid="row-2">Row 2</div>
        <div data-testid="row-3">Row 3</div>
      </PermissionSection>
    );

    const contentArea = container.querySelector('[class*="space-y-1"]');
    expect(contentArea).toBeInTheDocument();
    expect(contentArea).toHaveClass('space-y-1');
  });

  it('combines icon and title correctly', () => {
    const { container } = render(
      <PermissionSection title="My Group" count={5} icon="📋">
        <div>Content</div>
      </PermissionSection>
    );

    const iconElement = screen.getByText('📋');
    const titleElement = screen.getByText('My Group');

    expect(iconElement).toBeInTheDocument();
    expect(titleElement).toBeInTheDocument();

    // Check they're in the same header flex container
    const header = container.querySelector('[class*="flex"]');
    expect(header).toContainElement(iconElement);
    expect(header).toContainElement(titleElement);
  });
});
