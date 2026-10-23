import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AppUser = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

interface AuthState {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  clearUser: () => void;
}

/** Cached copy of `/auth/me`, so the app opens (offline too) without
 * waiting for the server. The session itself is the httpOnly cookie. */
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
