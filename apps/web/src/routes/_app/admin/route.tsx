import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/admin")({
  component: AdminLayout,
});

/** Admin pages: everyone else goes to their dashboard (the API refuses
 * them anyway). */
function AdminLayout() {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
