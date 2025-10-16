import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ExclusionForm } from './ExclusionForm';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];

const mockMembers: MemberResponse[] = [
  {
    id: 'member-1',
    group_id: 'group-1',
    name: 'Alice',
    email: 'alice@example.com',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'member-2',
    group_id: 'group-1',
    name: 'Bob',
    email: 'bob@example.com',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
];

describe('ExclusionForm', () => {
  it('renders all form fields', () => {
    render(
      <ExclusionForm
        members={mockMembers}
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByLabelText(/giver member/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/receiver member/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mutual/i)).toBeInTheDocument();
  });

  it('populates member dropdowns', () => {
    render(
      <ExclusionForm
        members={mockMembers}
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );

    const giverSelect = screen.getByLabelText(/giver member/i) as HTMLSelectElement;
    expect(giverSelect.options).toHaveLength(3); // placeholder + 2 members
    expect(giverSelect.options[1].text).toBe('Alice');
    expect(giverSelect.options[2].text).toBe('Bob');
  });

  it('validates that giver is selected', async () => {
    const user = userEvent.setup();
    render(
      <ExclusionForm
        members={mockMembers}
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );

    const receiverSelect = screen.getByLabelText(/receiver member/i);
    await user.selectOption(receiverSelect, 'member-1');

    const submitButton = screen.getByRole('button', {
      name: /create exclusion/i,
    });
    await user.click(submitButton);

    expect(screen.getByText(/please select a giver member/i)).toBeInTheDocument();
  });

  it('validates that receiver is selected', async () => {
    const user = userEvent.setup();
    render(
      <ExclusionForm
        members={mockMembers}
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );

    const giverSelect = screen.getByLabelText(/giver member/i);
    await user.selectOption(giverSelect, 'member-1');

    const submitButton = screen.getByRole('button', {
      name: /create exclusion/i,
    });
    await user.click(submitButton);

    expect(screen.getByText(/please select a receiver member/i)).toBeInTheDocument();
  });

  it('prevents self-exclusions', async () => {
    const user = userEvent.setup();
    render(
      <ExclusionForm
        members={mockMembers}
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );

    const giverSelect = screen.getByLabelText(/giver member/i);
    const receiverSelect = screen.getByLabelText(/receiver member/i);

    await user.selectOption(giverSelect, 'member-1');
    await user.selectOption(receiverSelect, 'member-1');

    const submitButton = screen.getByRole('button', {
      name: /create exclusion/i,
    });
    await user.click(submitButton);

    expect(
      screen.getByText(/giver and receiver cannot be the same/i)
    ).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ExclusionForm
        members={mockMembers}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );

    const giverSelect = screen.getByLabelText(/giver member/i);
    const receiverSelect = screen.getByLabelText(/receiver member/i);
    const mutualCheckbox = screen.getByLabelText(/mutual/i);

    await user.selectOption(giverSelect, 'member-1');
    await user.selectOption(receiverSelect, 'member-2');
    await user.click(mutualCheckbox);

    const submitButton = screen.getByRole('button', {
      name: /create exclusion/i,
    });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith('member-1', 'member-2', true);
  });

  it('submits with mutual false by default', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ExclusionForm
        members={mockMembers}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );

    const giverSelect = screen.getByLabelText(/giver member/i);
    const receiverSelect = screen.getByLabelText(/receiver member/i);

    await user.selectOption(giverSelect, 'member-1');
    await user.selectOption(receiverSelect, 'member-2');

    const submitButton = screen.getByRole('button', {
      name: /create exclusion/i,
    });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith('member-1', 'member-2', false);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ExclusionForm
        members={mockMembers}
        onSubmit={() => {}}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('disables form when loading', () => {
    render(
      <ExclusionForm
        members={mockMembers}
        onSubmit={() => {}}
        onCancel={() => {}}
        isLoading={true}
      />
    );

    const giverSelect = screen.getByLabelText(/giver member/i) as HTMLSelectElement;
    const receiverSelect = screen.getByLabelText(/receiver member/i) as HTMLSelectElement;
    const mutualCheckbox = screen.getByLabelText(/mutual/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', {
      name: /creating/i,
    });

    expect(giverSelect.disabled).toBe(true);
    expect(receiverSelect.disabled).toBe(true);
    expect(mutualCheckbox.disabled).toBe(true);
    expect(submitButton).toBeDisabled();
  });

  it('clears error when form is resubmitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ExclusionForm
        members={mockMembers}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );

    const submitButton = screen.getByRole('button', {
      name: /create exclusion/i,
    });

    await user.click(submitButton);
    expect(screen.getByText(/please select a giver member/i)).toBeInTheDocument();

    const giverSelect = screen.getByLabelText(/giver member/i);
    const receiverSelect = screen.getByLabelText(/receiver member/i);

    await user.selectOption(giverSelect, 'member-1');
    await user.selectOption(receiverSelect, 'member-2');
    await user.click(submitButton);

    expect(screen.queryByText(/please select a giver member/i)).not.toBeInTheDocument();
  });
});
