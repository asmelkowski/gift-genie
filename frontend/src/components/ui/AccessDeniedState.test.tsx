import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AccessDeniedState } from './AccessDeniedState';

// Wrapper component for router context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('AccessDeniedState', () => {
  it('renders default message and buttons', () => {
    render(
      <TestWrapper>
        <AccessDeniedState />
      </TestWrapper>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(
      screen.getByText(/don't have permission to access or perform this action/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/contact your system administrator/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to groups/i })).toBeInTheDocument();
  });

  it('renders custom message', () => {
    const customMessage = 'You need admin privileges to view this page.';
    render(
      <TestWrapper>
        <AccessDeniedState message={customMessage} />
      </TestWrapper>
    );

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('hides back button when showBackButton is false', () => {
    render(
      <TestWrapper>
        <AccessDeniedState showBackButton={false} />
      </TestWrapper>
    );

    expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to groups/i })).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <TestWrapper>
        <AccessDeniedState onRetry={onRetry} />
      </TestWrapper>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button when onRetry is not provided', () => {
    render(
      <TestWrapper>
        <AccessDeniedState />
      </TestWrapper>
    );

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });
});
