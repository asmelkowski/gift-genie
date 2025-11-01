import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import * as useAuthStoreModule from '@/hooks/useAuthStore';
import type { AuthState } from '@/hooks/useAuthStore';

vi.mock('@/hooks/useAuthStore');

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderProtectedRoute = (content: string) => {
    return render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>{content}</div>
        </ProtectedRoute>
      </BrowserRouter>
    );
  };

  it('renders protected content when authenticated', () => {
    vi.mocked(useAuthStoreModule.useAuthStore).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      csrfToken: 'token-123',
      isAuthenticated: () => true,
      login: vi.fn(),
      logout: vi.fn(),
    } as AuthState);

    renderProtectedRoute('Protected Content');

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    vi.mocked(useAuthStoreModule.useAuthStore).mockReturnValue({
      user: null,
      csrfToken: null,
      isAuthenticated: () => false,
      login: vi.fn(),
      logout: vi.fn(),
    } as AuthState);

    renderProtectedRoute('Protected Content');

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('hides protected content and redirects when user logs out', () => {
    const { rerender } = renderProtectedRoute('Protected Content');

    vi.mocked(useAuthStoreModule.useAuthStore).mockReturnValue({
      user: null,
      csrfToken: null,
      isAuthenticated: () => false,
      login: vi.fn(),
      logout: vi.fn(),
    } as AuthState);

    rerender(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
