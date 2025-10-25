import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorMessage } from './ErrorMessage';

describe('ErrorMessage', () => {
  it('renders error message', () => {
    render(<ErrorMessage message="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('applies error styling', () => {
    const { container } = render(<ErrorMessage message="Error text" />);

    const paragraph = container.querySelector('p');
    expect(paragraph).toHaveClass('text-sm', 'text-red-600');
  });

  it('renders different messages', () => {
    const { rerender } = render(<ErrorMessage message="First error" />);

    expect(screen.getByText('First error')).toBeInTheDocument();

    rerender(<ErrorMessage message="Second error" />);

    expect(screen.queryByText('First error')).not.toBeInTheDocument();
    expect(screen.getByText('Second error')).toBeInTheDocument();
  });
});
