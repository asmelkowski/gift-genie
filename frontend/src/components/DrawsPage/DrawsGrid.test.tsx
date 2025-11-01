import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DrawsGrid, { type DrawsGridProps } from './DrawsGrid';
import type { DrawViewModel } from '@/lib/drawUtils';

describe('DrawsGrid', () => {
  const mockOnExecute = vi.fn();
  const mockOnFinalize = vi.fn();
  const mockOnNotify = vi.fn();
  const mockOnDelete = vi.fn();

  const createMockDraw = (overrides?: Partial<DrawViewModel>): DrawViewModel => ({
    id: 'draw-1',
    name: 'Christmas Draw',
    lifecycleStep: 'created',
    statusLabel: 'Created',
    statusColor: 'yellow',
    formattedCreatedAt: 'Jan 15, 2024',
    formattedFinalizedAt: null,
    formattedNotificationSentAt: null,
    canExecute: true,
    canFinalize: false,
    canNotify: false,
    canViewResults: false,
    canDelete: true,
    ...overrides,
  });

  const renderGrid = (props: Partial<DrawsGridProps> = {}) => {
    return render(
      <BrowserRouter>
        <DrawsGrid
          draws={[]}
          groupId="group-1"
          onExecute={mockOnExecute}
          onFinalize={mockOnFinalize}
          onNotify={mockOnNotify}
          onDelete={mockOnDelete}
          isExecuting={false}
          {...props}
        />
      </BrowserRouter>
    );
  };

  it('renders empty state when no draws provided', () => {
    const { container } = renderGrid();

    const grid = container.querySelector('.grid');
    expect(grid?.children.length).toBe(0);
  });

  it('renders DrawCard for each draw in grid', () => {
    const draws = [
      createMockDraw({ id: 'draw-1' }),
      createMockDraw({ id: 'draw-2' }),
      createMockDraw({ id: 'draw-3' }),
    ];

    renderGrid({ draws });

    expect(screen.getByText('Draw #draw-1')).toBeInTheDocument();
    expect(screen.getByText('Draw #draw-2')).toBeInTheDocument();
    expect(screen.getByText('Draw #draw-3')).toBeInTheDocument();
  });

  it('passes correct handlers to DrawCard components', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const draw = createMockDraw({ id: 'draw-1' });

    renderGrid({ draws: [draw] });

    const executeButton = screen.getByRole('button', { name: /execute/i });
    await user.click(executeButton);

    expect(mockOnExecute).toHaveBeenCalledWith(expect.objectContaining({ id: 'draw-1' }));
  });

  it('applies correct grid layout classes', () => {
    const draws = [
      createMockDraw({ id: 'draw-1' }),
      createMockDraw({ id: 'draw-2' }),
    ];

    const { container } = renderGrid({ draws });

    const gridContainer = container.querySelector('div[class*="grid"]');
    expect(gridContainer?.className).toMatch(/grid-cols-1/);
    expect(gridContainer?.className).toMatch(/md:grid-cols-2/);
    expect(gridContainer?.className).toMatch(/lg:grid-cols-3/);
  });

  it('passes isExecuting prop to DrawCard components', () => {
    const draws = [createMockDraw()];

    renderGrid({ draws, isExecuting: true });

    // When isExecuting is true, buttons should be disabled
    const executeButton = screen.getByRole('button', { name: /execute/i });
    expect(executeButton).toBeDisabled();
  });

  it('handles draw deletion correctly', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const draw = createMockDraw({ id: 'draw-1', canDelete: true });

    renderGrid({ draws: [draw] });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('draw-1');
  });
});
