import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "admin";
};

interface AuthState {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  clearUser: () => void;
}

/** Logged-in admin. With the dummy API this is the session itself; once
 * `apps/api` exists it becomes the cached copy of `/auth/me`. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    { name: "tu-user", storage: createJSONStorage(() => localStorage) },
  ),
);
