import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DrawCard from './DrawCard';
import type { DrawViewModel } from '@/lib/drawUtils';

describe('DrawCard', () => {
  const mockOnExecute = vi.fn();
  const mockOnFinalize = vi.fn();
  const mockOnNotify = vi.fn();
  const mockOnDelete = vi.fn();

  const createMockDraw = (overrides?: Partial<DrawViewModel>): DrawViewModel => ({
    id: 'draw-1',
    group_id: 'group-1',
    status: 'pending',
    created_at: '2024-01-15T10:00:00Z',
    finalized_at: null,
    notification_sent_at: null,
    assignments_count: 0,
    lifecycleStep: 'created',
    statusLabel: 'Pending',
    statusColor: 'yellow',
    formattedCreatedAt: 'Jan 15, 2024',
    formattedFinalizedAt: null,
    formattedNotificationSentAt: null,
    hasAssignments: false,
    isNotified: false,
    canExecute: true,
    canFinalize: false,
    canNotify: false,
    canViewResults: false,
    canDelete: true,
    ...overrides,
  });

  const renderCard = (draw: DrawViewModel = createMockDraw()) => {
    return render(
      <BrowserRouter>
        <DrawCard
          draw={draw}
          groupId="group-1"
          onExecute={mockOnExecute}
          onFinalize={mockOnFinalize}
          onNotify={mockOnNotify}
          onDelete={mockOnDelete}
          isLoading={false}
        />
      </BrowserRouter>
    );
  };

  it('renders draw ID in shortened format', () => {
    const draw = createMockDraw({ id: 'draw-abcdef1234567890' });

    renderCard(draw);

    // ID is sliced to first 8 characters: "draw-ab", text may be split
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.textContent).toMatch(/draw-ab/);
  });

  it('displays creation date', () => {
    const draw = createMockDraw({ formattedCreatedAt: 'Jan 15, 2024 10:30 AM' });

    renderCard(draw);

    expect(screen.getByText('Jan 15, 2024 10:30 AM')).toBeInTheDocument();
  });

  it('displays status label with correct color', () => {
    const draw = createMockDraw({ statusLabel: 'Pending', statusColor: 'yellow' });

    renderCard(draw);

    const statusBadge = screen.getByText('Pending');
    expect(statusBadge.className).toMatch(/bg-yellow-100/);
  });

  it('displays finalized date when draw is finalized', () => {
    const draw = createMockDraw({
      formattedFinalizedAt: 'Jan 16, 2024 02:00 PM',
      lifecycleStep: 'finalized',
    });

    renderCard(draw);

    expect(screen.getByText('Finalized: Jan 16, 2024 02:00 PM')).toBeInTheDocument();
  });

  it('displays notification date when draw is notified', () => {
    const draw = createMockDraw({
      formattedNotificationSentAt: 'Jan 16, 2024 03:00 PM',
      lifecycleStep: 'notified',
    });

    renderCard(draw);

    expect(screen.getByText('Notified: Jan 16, 2024 03:00 PM')).toBeInTheDocument();
  });

  it('shows execute button when canExecute is true', () => {
    const draw = createMockDraw({ canExecute: true });

    renderCard(draw);

    expect(screen.getByRole('button', { name: /execute/i })).toBeInTheDocument();
  });

  it('does not show execute button when canExecute is false', () => {
    const draw = createMockDraw({ canExecute: false });

    renderCard(draw);

    expect(screen.queryByRole('button', { name: /execute/i })).not.toBeInTheDocument();
  });

  it('shows finalize button when canFinalize is true', () => {
    const draw = createMockDraw({ canFinalize: true });

    renderCard(draw);

    expect(screen.getByRole('button', { name: /finalize/i })).toBeInTheDocument();
  });

  it('shows notify button when canNotify is true', () => {
    const draw = createMockDraw({ canNotify: true });

    renderCard(draw);

    expect(screen.getByRole('button', { name: /notify/i })).toBeInTheDocument();
  });

  it('shows view results button when canViewResults is true', () => {
    const draw = createMockDraw({ canViewResults: true });

    renderCard(draw);

    expect(screen.getByRole('button', { name: /view results/i })).toBeInTheDocument();
  });

  it('shows delete button when canDelete is true', () => {
    const draw = createMockDraw({ canDelete: true });

    renderCard(draw);

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('calls onExecute when execute button clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const draw = createMockDraw({ canExecute: true });

    renderCard(draw);

    const executeButton = screen.getByRole('button', { name: /execute/i });
    await user.click(executeButton);

    expect(mockOnExecute).toHaveBeenCalledWith(draw);
  });

  it('calls onFinalize when finalize button clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const draw = createMockDraw({ canFinalize: true });

    renderCard(draw);

    const finalizeButton = screen.getByRole('button', { name: /finalize/i });
    await user.click(finalizeButton);

    expect(mockOnFinalize).toHaveBeenCalledWith(draw);
  });

  it('calls onNotify when notify button clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const draw = createMockDraw({ canNotify: true });

    renderCard(draw);

    const notifyButton = screen.getByRole('button', { name: /notify/i });
    await user.click(notifyButton);

    expect(mockOnNotify).toHaveBeenCalledWith(draw);
  });

  it('calls onDelete when delete button clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const draw = createMockDraw({ canDelete: true, id: 'draw-123' });

    renderCard(draw);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('draw-123');
  });

  it('disables execute button when isLoading is true', () => {
    const draw = createMockDraw({ canExecute: true });

    render(
      <BrowserRouter>
        <DrawCard
          draw={draw}
          groupId="group-1"
          onExecute={mockOnExecute}
          onFinalize={mockOnFinalize}
          onNotify={mockOnNotify}
          onDelete={mockOnDelete}
          isLoading={true}
        />
      </BrowserRouter>
    );

    const executeButton = screen.getByRole('button', { name: /execute/i });
    expect(executeButton).toBeDisabled();
  });

  it('renders lifecycle stepper with checkmark for completed created step', () => {
    const draw = createMockDraw({ lifecycleStep: 'notified' });

    const { container } = renderCard(draw);

    // The stepper shows checkmarks (✓) for completed steps and numbers for incomplete
    // First step should be completed with a checkmark
    const steppers = container.querySelectorAll('div.flex.items-center.justify-center');
    expect(steppers.length).toBeGreaterThan(0);
    // First step (Created) should be completed
    expect(steppers[0].textContent).toBe('✓');
  });

  it('renders all four stages in lifecycle stepper', () => {
    const draw = createMockDraw({ lifecycleStep: 'notified' });

    const { container } = renderCard(draw);

    // Should have 4 step circles
    const stepCircles = container.querySelectorAll('div.flex.items-center.justify-center.w-6.h-6');
    expect(stepCircles.length).toBe(4);
  });
});
