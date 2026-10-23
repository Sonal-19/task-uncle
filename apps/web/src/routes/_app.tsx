import {
  createFileRoute,
  Navigate,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { AdminShell } from "@/components/app/admin-shell";
import { AppShell } from "@/components/app/app-shell";
import { useAuth, useSession } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useSession();
  if (!user) return <Navigate to="/" replace />;

  // Admins only get the admin panel, never the task app.
  if (user.role === "admin") {
    if (!pathname.startsWith("/admin")) return <Navigate to="/admin" replace />;
    return (
      <AdminShell user={user}>
        <Outlet />
      </AdminShell>
    );
  }

  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}
