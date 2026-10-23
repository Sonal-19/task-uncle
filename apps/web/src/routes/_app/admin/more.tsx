import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, LogOut } from "lucide-react";
import { ADMIN_NAV } from "@/components/app/nav-items";
import { THEMES } from "@/components/app/user-menu";
import { Avatar } from "@/components/common/badges";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme-store";

export const Route = createFileRoute("/_app/admin/more")({
  component: AdminMore,
});

/** Phones: the admin pages that aren't in the bottom bar, theme, logout. */
function AdminMore() {
  const { user } = useAuth();
  const logout = useLogout();
  const { theme, setTheme } = useThemeStore();
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
        {ADMIN_NAV.map((n) => (
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
      <div className="rounded-2xl border bg-card p-4">
        <p className="mb-3 text-sm font-medium">Appearance</p>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm font-medium",
                theme === t.value
                  ? "border-primary bg-accent text-accent-foreground"
                  : "hover:bg-muted",
              )}
            >
              <t.icon className="size-5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>
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
    </div>
  );
}
