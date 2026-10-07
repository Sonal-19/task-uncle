import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  return { user, isLoading: false, isAuthenticated: !!user };
}

export function useLogout() {
  const qc = useQueryClient();
  const clearUser = useAuthStore((s) => s.clearUser);
  const navigate = useNavigate();
  return () => {
    clearUser();
    qc.clear();
    toast.success("Logged out");
    navigate({ to: "/", replace: true });
  };
}
