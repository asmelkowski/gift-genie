import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserViewModel {
  id: string;
  email: string;
  name: string;
}

export interface AuthState {
  user: UserViewModel | null;
  csrfToken: string | null;
  isAuthenticated: () => boolean;
  login: (user: UserViewModel, csrfToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      csrfToken: null,
      isAuthenticated: () => get().user !== null,
      login: (user: UserViewModel, csrfToken: string) => {
        set({ user, csrfToken });
      },
      logout: () => {
        set({ user: null, csrfToken: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: state => ({ user: state.user, csrfToken: state.csrfToken }),
    }
  )
);
