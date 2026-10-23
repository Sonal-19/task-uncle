import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm-dialog";
import { api, call } from "@/lib/api";
import { claimDevice, forgetDevice, pendingCount } from "@/lib/offline/sync";
import { offerInstallAgain } from "@/lib/pwa";
import { keys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";

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
    if (user) void claimDevice(user.id);
  }, [user?.id]);
}

export function useLogin() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (v: { email: string; password: string }) =>
      call(api.auth.login.post(v)),
    onSuccess: async (u) => {
      await claimDevice(u.id);
      offerInstallAgain();
      useAuthStore.getState().setUser(u);
      toast.success(`Welcome back, ${u.name}!`);
      navigate({ to: "/dashboard" });
    },
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
    // Offline is fine: the cookie just expires on its own.
    await call(api.auth.logout.post()).catch(() => {});
    useAuthStore.getState().clearUser();
    await forgetDevice();
    toast.success("Logged out");
    navigate({ to: "/", replace: true });
  };
}
