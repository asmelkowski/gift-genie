import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserViewModel {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: UserViewModel | null;
  csrfToken: string | null;
  isAuthenticated: () => boolean;
  login: (user: UserViewModel, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      csrfToken: null,
      isAuthenticated: () => get().user !== null,
      login: (user: UserViewModel, token: string) => {
        set({ user, csrfToken: token });
      },
      logout: () => {
        set({ user: null, csrfToken: null });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, csrfToken: state.csrfToken }),
    },
  ),
);

