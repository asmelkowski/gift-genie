import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GroupsGrid } from './GroupsGrid';
import type { components } from '@/types/schema';

type GroupSummary = components['schemas']['GroupSummary'];

describe('GroupsGrid', () => {
  const mockOnGroupClick = vi.fn();

  const createMockGroup = (overrides?: Partial<GroupSummary>): GroupSummary => ({
    id: 'group-1',
    name: 'Test Group',
    created_at: '2024-01-15T10:00:00Z',
    historical_exclusions_enabled: true,
    historical_exclusions_lookback: 1,
    ...overrides,
  });

  it('renders empty state when no groups provided', () => {
    const { container } = render(<GroupsGrid groups={[]} onGroupClick={mockOnGroupClick} />);

    const grid = container.querySelector('.grid');
    expect(grid?.children.length).toBe(0);
  });

  it('renders multiple GroupCards when groups are provided', () => {
    const groups = [
      createMockGroup({ id: 'group-1', name: 'Group 1' }),
      createMockGroup({ id: 'group-2', name: 'Group 2' }),
      createMockGroup({ id: 'group-3', name: 'Group 3' }),
    ];

    render(<GroupsGrid groups={groups} onGroupClick={mockOnGroupClick} />);

    expect(screen.getByText('Group 1')).toBeInTheDocument();
    expect(screen.getByText('Group 2')).toBeInTheDocument();
    expect(screen.getByText('Group 3')).toBeInTheDocument();
  });

  it('passes onClick handler to each GroupCard', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const groups = [
      createMockGroup({ id: 'group-1', name: 'Group 1' }),
      createMockGroup({ id: 'group-2', name: 'Group 2' }),
    ];

    render(<GroupsGrid groups={groups} onGroupClick={mockOnGroupClick} />);

    const group1Card = screen.getByText('Group 1').closest('div[class*="cursor-pointer"]');
    await user.click(group1Card!);

    expect(mockOnGroupClick).toHaveBeenCalledWith('group-1');
  });

  it('renders correct CSS grid classes for responsive layout', () => {
    const groups = [createMockGroup()];

    const { container } = render(<GroupsGrid groups={groups} onGroupClick={mockOnGroupClick} />);

    const gridContainer = container.querySelector('div[class*="grid"]');
    expect(gridContainer?.className).toMatch(/grid-cols-1/);
    expect(gridContainer?.className).toMatch(/md:grid-cols-2/);
    expect(gridContainer?.className).toMatch(/lg:grid-cols-3/);
  });

  it('applies correct gap between grid items', () => {
    const groups = [createMockGroup({ id: 'group-1' }), createMockGroup({ id: 'group-2' })];

    const { container } = render(<GroupsGrid groups={groups} onGroupClick={mockOnGroupClick} />);

    const gridContainer = container.querySelector('div[class*="grid"]');
    expect(gridContainer?.className).toMatch(/gap-4/);
  });
});
