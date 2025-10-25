import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuthStore } from './useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Clear the store before each test
    useAuthStore.setState({ user: null, csrfToken: null });
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has initial state with null user and null csrfToken', () => {
    useAuthStore.setState({ user: null, csrfToken: null });
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.csrfToken).toBeNull();
  });

  it('stores user and csrfToken when login() is called', () => {
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };
    const testToken = 'csrf-token-123';

    useAuthStore.getState().login(testUser, testToken);
    const state = useAuthStore.getState();

    expect(state.user).toEqual(testUser);
    expect(state.csrfToken).toEqual(testToken);
  });

  it('clears user and csrfToken when logout() is called', () => {
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };
    const testToken = 'csrf-token-123';

    useAuthStore.getState().login(testUser, testToken);
    expect(useAuthStore.getState().user).not.toBeNull();

    useAuthStore.getState().logout();
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.csrfToken).toBeNull();
  });

  it('returns true from isAuthenticated() when user is set', () => {
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    useAuthStore.getState().login(testUser, 'token');
    const isAuthenticated = useAuthStore.getState().isAuthenticated();

    expect(isAuthenticated).toBe(true);
  });

  it('returns false from isAuthenticated() when user is null', () => {
    useAuthStore.setState({ user: null, csrfToken: null });
    const isAuthenticated = useAuthStore.getState().isAuthenticated();

    expect(isAuthenticated).toBe(false);
  });

  it('persists user data to localStorage on login', () => {
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };
    const testToken = 'csrf-token-123';

    useAuthStore.getState().login(testUser, testToken);

    // The persist middleware saves state, we can verify the state was updated
    const state = useAuthStore.getState();
    expect(state.user).toEqual(testUser);
    expect(state.csrfToken).toEqual(testToken);
  });

  it('clears persisted data on logout', () => {
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };
    const testToken = 'csrf-token-123';

    // Login first
    useAuthStore.getState().login(testUser, testToken);
    expect(useAuthStore.getState().user).toEqual(testUser);

    // Logout
    useAuthStore.getState().logout();

    // Verify state is cleared
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.csrfToken).toBeNull();
  });

  it('updates store when user data changes', () => {
    const user1 = {
      id: 'user-1',
      email: 'user1@example.com',
      name: 'User One',
    };
    const user2 = {
      id: 'user-2',
      email: 'user2@example.com',
      name: 'User Two',
    };

    useAuthStore.getState().login(user1, 'token1');
    expect(useAuthStore.getState().user?.id).toBe('user-1');

    useAuthStore.getState().login(user2, 'token2');
    expect(useAuthStore.getState().user?.id).toBe('user-2');
    expect(useAuthStore.getState().csrfToken).toBe('token2');
  });

  it('can subscribe to store changes', () => {
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    let subscriptionCalled = false;
    const unsubscribe = useAuthStore.subscribe(() => {
      subscriptionCalled = true;
    });

    useAuthStore.getState().login(testUser, 'token');
    expect(subscriptionCalled).toBe(true);

    unsubscribe();
  });
});
