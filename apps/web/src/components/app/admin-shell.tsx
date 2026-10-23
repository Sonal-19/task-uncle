import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, Moon, ShieldCheck, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/common/badges";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";
import { ADMIN_NAV } from "./nav-items";
import { UserMenu } from "./user-menu";

const isActive = (pathname: string, n: (typeof ADMIN_NAV)[number]) =>
  n.exact
    ? pathname === n.to || pathname === `${n.to}/`
    : pathname.startsWith(n.to);

/**
 * The admin's layout: only admin pages (overview, users) — none of the task
 * app (no add-task, events, reminders, offline sync). Desktop: sidebar;
 * phones: header with the admin's name + bottom tabs.
 */
export function AdminShell({
  user,
  children,
}: {
  user: AppUser;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logout = useLogout();
  const { theme, setTheme } = useThemeStore();
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[256px_1fr]">
      {/* Desktop / tablet sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-card md:flex">
        <div className="px-5 py-5">
          <Link to="/admin">
            <Logo />
          </Link>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <ShieldCheck className="size-3" /> Admin panel
          </span>
        </div>
        <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3">
          {ADMIN_NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive(pathname, n) &&
                  "bg-accent text-accent-foreground hover:bg-accent",
              )}
            >
              <n.icon className="size-4.5" />
              <span className="flex-1">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-t p-4">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut />
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="pt-safe sticky top-0 z-30 border-b bg-background/85 backdrop-blur-lg">
          <div className="flex h-14 items-center justify-between gap-2 px-4 md:h-16 md:px-8">
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <img
                src="/logo.svg"
                alt=""
                className="size-8 shrink-0 rounded-[9px]"
              />
              <span className="truncate text-lg font-bold">{user.name}</span>
            </div>
            <p className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
              <ShieldCheck className="size-4 text-primary" /> Signed in as admin
            </p>
            <div className="flex items-center gap-1">
              {/* Phones: theme + logout here (no account menu). */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={dark ? "Light mode" : "Dark mode"}
                onClick={() => setTheme(dark ? "light" : "dark")}
              >
                {dark ? (
                  <Sun className="size-5" />
                ) : (
                  <Moon className="size-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Log out"
                onClick={logout}
              >
                <LogOut className="size-5" />
              </Button>
              <div className="hidden md:block">
                <UserMenu user={user} settings={false} />
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 md:px-8 md:pt-6 md:pb-10">
          {children}
        </main>
      </div>

      {/* Phone bottom tabs */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-lg md:hidden">
        <div className="grid h-16 grid-cols-4 items-center">
          {ADMIN_NAV.filter((n) => n.tab).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground",
                isActive(pathname, n) && "text-primary",
              )}
            >
              <n.icon className="size-5.5" />
              {n.label}
            </Link>
          ))}
          <Link
            to="/admin/more"
            className={cn(
              "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground",
              (pathname.startsWith("/admin/more") ||
                ADMIN_NAV.some((n) => !n.tab && isActive(pathname, n))) &&
                "text-primary",
            )}
          >
            <Menu className="size-5.5" />
            More
          </Link>
        </div>
      </nav>
    </div>
  );
}
