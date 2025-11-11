import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('renders input with password type initially', () => {
    render(
      <PasswordInput value="test" onChange={() => {}} showPassword={false} onToggle={() => {}} />
    );

    const input = screen.getByDisplayValue('test');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveValue('test');
  });

  it('shows password when showPassword is true', () => {
    render(
      <PasswordInput value="test" onChange={() => {}} showPassword={true} onToggle={() => {}} />
    );

    const input = screen.getByDisplayValue('test');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('calls onChange when input changes', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(
      <PasswordInput
        value=""
        onChange={mockOnChange}
        showPassword={false}
        onToggle={() => {}}
        data-testid="password-input"
      />
    );

    const input = screen.getByTestId('password-input');
    await user.type(input, 'new value');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('calls onToggle when button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnToggle = vi.fn();
    render(
      <PasswordInput
        value="test"
        onChange={() => {}}
        showPassword={false}
        onToggle={mockOnToggle}
      />
    );

    const button = screen.getByRole('button', { name: /show password/i });
    await user.click(button);

    expect(mockOnToggle).toHaveBeenCalled();
  });

  it('shows correct button aria-label based on showPassword', () => {
    const { rerender } = render(
      <PasswordInput value="test" onChange={() => {}} showPassword={false} onToggle={() => {}} />
    );

    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();

    rerender(
      <PasswordInput value="test" onChange={() => {}} showPassword={true} onToggle={() => {}} />
    );

    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
  });
});
