import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Plus,
  Search,
} from "lucide-react";
import type * as React from "react";
import { Avatar } from "@/components/common/badges";
import { Logo } from "@/components/common/logo";
import { CategorySheet } from "@/components/events/category-sheet";
import { EventSheet } from "@/components/events/event-sheet";
import { PersonSheet } from "@/components/people/person-sheet";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { TaskSheet } from "@/components/tasks/task-sheet";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-auth";
import { useLog, useTasks } from "@/hooks/use-data";
import { useReminders } from "@/hooks/use-reminders";
import { isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/stores/auth-store";
import { useSheets } from "@/stores/sheet-store";
import { CommandSearch } from "./command-search";
import { NAV } from "./nav-items";
import { UserMenu } from "./user-menu";

const TABS = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/events", label: "Events", icon: FolderKanban },
  null,
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/more", label: "More", icon: Menu },
] as const;

const MORE_PATHS = [
  "/more",
  "/calendar",
  "/people",
  "/notifications",
  "/settings",
];

export function AppShell({
  user,
  children,
}: {
  user: AppUser;
  children: React.ReactNode;
}) {
  useReminders();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const newTask = useSheets((s) => s.newTask);
  const setSearch = useSheets((s) => s.setSearch);
  const logout = useLogout();
  const tasks = useTasks().data ?? [];
  const unread = (useLog().data ?? []).filter((l) => !l.readAt).length;
  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => isOverdue(t)).length;
  const current = NAV.find((n) => pathname.startsWith(n.to));
  // Quick-add inside an event/category pre-selects it.
  const [, eventId, categoryId] =
    pathname.match(/^\/events\/([^/]+)(?:\/([^/]+))?/) ?? [];
  const addTask = () => newTask({ eventId, categoryId });

  const badge = (to: string) =>
    to === "/tasks" ? open.length : to === "/notifications" ? unread : 0;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[256px_1fr]">
      {/* Desktop / tablet sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-card md:flex">
        <div className="px-5 py-5">
          <Link to="/dashboard">
            <Logo />
          </Link>
        </div>
        <div className="space-y-2 px-3">
          <Button className="w-full" onClick={addTask}>
            <Plus /> Add task
          </Button>
          <button
            type="button"
            onClick={() => setSearch(true)}
            className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="rounded border bg-muted px-1.5 text-[10px] font-semibold">
              ⌘K
            </kbd>
          </button>
        </div>
        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.to);
            const count = badge(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-accent text-accent-foreground hover:bg-accent",
                )}
              >
                <n.icon className="size-4.5" />
                <span className="flex-1">{n.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "tabular rounded-full px-2 py-0.5 text-[11px] font-bold",
                      n.to === "/notifications"
                        ? "bg-overdue text-white"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {overdue > 0 && (
          <Link
            to="/tasks"
            search={{ view: "overdue" }}
            className="mx-3 mb-3 rounded-xl bg-overdue/10 p-3 text-sm text-overdue"
          >
            <p className="font-semibold">{overdue} overdue</p>
            <p className="text-xs opacity-80">Uncle is waiting… clear them</p>
          </Link>
        )}
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
        {/* Top bar */}
        <header className="pt-safe sticky top-0 z-30 border-b bg-background/85 backdrop-blur-lg">
          <div className="flex h-14 items-center justify-between gap-2 px-4 md:h-16 md:px-8">
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <img src="/logo.svg" alt="" className="size-8 rounded-[9px]" />
              <span className="truncate text-lg font-bold">
                {current?.label ??
                  (pathname === "/more" ? "More" : "Task Uncle")}
              </span>
            </div>
            <p className="hidden text-sm text-muted-foreground md:block">
              {greeting()},{" "}
              <span className="font-medium text-foreground">
                {user.name.split(" ")[0]}
              </span>{" "}
              👋
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Search"
                onClick={() => setSearch(true)}
              >
                <Search className="size-5" />
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link
                  to="/notifications"
                  aria-label="Notifications"
                  className="relative"
                >
                  <Bell
                    className={cn("size-5", unread && "animate-bell-ring")}
                  />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-overdue px-1 text-[10px] leading-4 font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Link>
              </Button>
              <UserMenu user={user} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-6 md:pb-10">
          {children}
        </main>
      </div>

      {/* Phone bottom tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-lg md:hidden">
        <div className="grid h-16 grid-cols-5 items-center">
          {TABS.map((tab) => {
            if (!tab)
              return (
                <div key="fab" className="grid place-items-center">
                  <button
                    type="button"
                    onClick={addTask}
                    aria-label="Add task"
                    className="-mt-7 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-90"
                  >
                    <Plus className="size-7" />
                  </button>
                </div>
              );
            const active =
              tab.to === "/more"
                ? MORE_PATHS.some((p) => pathname.startsWith(p))
                : pathname.startsWith(tab.to);
            const count = tab.to === "/tasks" ? overdue : 0;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors",
                  active && "text-primary",
                )}
              >
                <tab.icon
                  className={cn(
                    "size-5.5 transition-transform",
                    active && "scale-110",
                  )}
                />
                {tab.label}
                {count > 0 && (
                  <span className="absolute top-2 left-1/2 ml-2 grid min-w-4 place-items-center rounded-full bg-overdue px-1 text-[10px] leading-4 font-bold text-white">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <TaskSheet />
      <TaskDetailSheet />
      <EventSheet />
      <CategorySheet />
      <PersonSheet />
      <CommandSearch />
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
