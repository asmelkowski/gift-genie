import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GroupCard } from './GroupCard';
import type { components } from '@/types/schema';

type GroupSummary = components['schemas']['GroupSummary'];

describe('GroupCard', () => {
  const mockOnClick = vi.fn();

  const createMockGroup = (overrides?: Partial<GroupSummary>): GroupSummary => ({
    id: 'group-1',
    name: 'Test Group',
    created_at: '2024-01-15T10:00:00Z',
    historical_exclusions_enabled: true,
    historical_exclusions_lookback: 1,
    ...overrides,
  });

  it('renders group name', () => {
    const group = createMockGroup({ name: 'Family Holiday Gift Exchange' });

    render(<GroupCard group={group} onClick={mockOnClick} />);

    expect(screen.getByText('Family Holiday Gift Exchange')).toBeInTheDocument();
  });

  it('displays creation date in correct format', () => {
    const group = createMockGroup({ created_at: '2024-01-15T00:00:00Z' });

    render(<GroupCard group={group} onClick={mockOnClick} />);

    expect(screen.getByText(/Created.*Jan/)).toBeInTheDocument();
  });

  it('displays historical exclusion label when enabled with default lookback', () => {
    const group = createMockGroup({
      historical_exclusions_enabled: true,
      historical_exclusions_lookback: 1,
    });

    render(<GroupCard group={group} onClick={mockOnClick} />);

    expect(screen.getByText(/Historical exclusions: 1 draw/)).toBeInTheDocument();
  });

  it('displays historical exclusion label with plural draws when lookback > 1', () => {
    const group = createMockGroup({
      historical_exclusions_enabled: true,
      historical_exclusions_lookback: 3,
    });

    render(<GroupCard group={group} onClick={mockOnClick} />);

    expect(screen.getByText(/Historical exclusions: 3 draw/)).toBeInTheDocument();
  });

  it('displays no historical exclusions label when disabled', () => {
    const group = createMockGroup({
      historical_exclusions_enabled: false,
    });

    render(<GroupCard group={group} onClick={mockOnClick} />);

    expect(screen.getByText('No historical exclusions')).toBeInTheDocument();
  });

  it('calls onClick handler with group ID when card is clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const group = createMockGroup({ id: 'group-123', name: 'Test Group' });

    render(<GroupCard group={group} onClick={mockOnClick} />);

    const card = screen.getByText('Test Group').closest('div[class*="cursor-pointer"]');
    await user.click(card!);

    expect(mockOnClick).toHaveBeenCalledWith('group-123');
  });

  it('applies hover styling classes', () => {
    const group = createMockGroup();
    const { container } = render(<GroupCard group={group} onClick={mockOnClick} />);

    const card = container.querySelector('div[class*="cursor-pointer"]');
    expect(card?.className).toMatch(/hover:shadow-xl/);
    expect(card?.className).toMatch(/transition-all/);
  });
});
