import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, LogOut } from "lucide-react";
import { NAV } from "@/components/app/nav-items";
import { Avatar } from "@/components/common/badges";
import { useAuth, useLogout } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/more")({
  component: MorePage,
});

function MorePage() {
  const { user } = useAuth();
  const logout = useLogout();
  return (
    <div className="space-y-4">
      {user && (
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <Avatar name={user.name} className="size-12 text-base" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
      )}
      <nav className="divide-y overflow-hidden rounded-2xl border bg-card">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex items-center gap-3 px-4 py-3.5 active:bg-muted"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
              <n.icon className="size-4.5" />
            </span>
            <span className="flex-1 font-medium">{n.label}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </nav>
      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 font-medium text-destructive active:bg-muted"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-destructive/10">
          <LogOut className="size-4.5" />
        </span>
        Log out
      </button>
      <p className="text-center text-xs text-muted-foreground">Task Uncle</p>
    </div>
  );
}
