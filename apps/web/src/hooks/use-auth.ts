import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm-dialog";
import { api, call } from "@/lib/api";
import { claimDevice, forgetDevice, pendingCount } from "@/lib/offline/sync";
import { resetPush, syncPush } from "@/lib/push";
import { offerInstallAgain } from "@/lib/pwa";
import { keys } from "@/lib/query-keys";
import { type AppUser, homeFor, useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  return { user, isLoading: false, isAuthenticated: !!user };
}

/** Checks the session with the server (a 401 logs out via the sync engine)
 * and keeps the cached user fresh. Offline, the cached user is used. */
export function useSession() {
  const user = useAuthStore((s) => s.user);
  const me = useQuery({
    queryKey: keys.me,
    queryFn: () => call(api.auth.me.get()),
    enabled: !!user,
    staleTime: 5 * 60_000,
    retry: false,
  });
  useEffect(() => {
    if (me.data) useAuthStore.getState().setUser(me.data);
  }, [me.data]);
  useEffect(() => {
    if (!user) return;
    void claimDevice(user.id);
    // A browser that already allows notifications gets server reminders.
    if (user.role !== "admin")
      void syncPush(user.id, user.notifyPermission !== "off");
  }, [user?.id, user?.notifyPermission]);
}

/** After login or sign-up: claim this device for them, then go to their
 * home (admins → the admin panel, everyone else → the dashboard). */
function useSignedIn() {
  const navigate = useNavigate();
  return async (u: AppUser, message: string) => {
    await claimDevice(u.id);
    offerInstallAgain();
    useAuthStore.getState().setUser(u);
    toast.success(message);
    navigate({ to: homeFor(u) });
  };
}

export function useLogin() {
  const signedIn = useSignedIn();
  return useMutation({
    mutationFn: (v: { email: string; password: string }) =>
      call(api.auth.login.post(v)),
    onSuccess: (u) => signedIn(u, `Welcome back, ${u.name}!`),
    onError: (e) => toast.error(e.message),
  });
}

export function useRegister() {
  const signedIn = useSignedIn();
  return useMutation({
    mutationFn: (v: { name: string; email: string; password: string }) =>
      call(api.auth.register.post(v)),
    onSuccess: (u) =>
      signedIn(u, `Welcome, ${u.name.split(" ")[0]}! Your account is ready.`),
    onError: (e) => toast.error(e.message),
  });
}

export function useLogout() {
  const navigate = useNavigate();
  return async () => {
    const n = pendingCount();
    if (
      n &&
      !(await confirm({
        title: "Log out with unsynced changes?",
        description: `${n} change${n > 1 ? "s" : ""} made on this device haven't reached the server yet and will be lost.`,
        confirmText: "Log out anyway",
        destructive: true,
      }))
    )
      return;
    await resetPush();
    // Offline is fine: the cookie just expires on its own.
    await call(api.auth.logout.post()).catch(() => {});
    useAuthStore.getState().clearUser();
    await forgetDevice();
    toast.success("Logged out");
    navigate({ to: "/", replace: true });
  };
}
