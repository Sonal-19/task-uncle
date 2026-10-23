import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { PublicUser } from "@/lib/types";

/** `role` decides where login lands (admin → /admin) and whether the admin
 * pages show; `notifyPermission` "off" = the admin turned reminders off. */
export type AppUser = PublicUser;

export const homeFor = (u: Pick<AppUser, "role"> | null | undefined) =>
  u?.role === "admin" ? "/admin" : "/dashboard";

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
