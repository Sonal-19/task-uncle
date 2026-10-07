import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;

  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}
