import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import {
  BellOff,
  ChevronRight,
  MonitorSmartphone,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useDeferredValue, useState } from "react";
import { RoleBadge, StatusPill } from "@/components/admin/badges";
import { UserSheet } from "@/components/admin/user-sheet";
import { Avatar } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { SelectField } from "@/components/common/select-field";
import { EmptyState, ErrorState, PageLoader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  type AdminUserRow,
  type UserFilters,
  useAdminUsers,
  useUpdateUser,
} from "@/hooks/use-admin";
import type { UserRole, UserStatus } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/_app/admin/users/")({
  component: AdminUsers,
});

const ago = (iso: string | null) =>
  iso ? `${formatDistanceToNowStrict(new Date(iso))} ago` : "never";

function AdminUsers() {
  const me = useAuthStore((s) => s.user);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"" | UserRole>("");
  const [status, setStatus] = useState<"" | UserStatus>("");
  const filters: UserFilters = {
    q: useDeferredValue(q.trim()) || undefined,
    role: role || undefined,
    status: status || undefined,
  };
  const usersQ = useAdminUsers(filters);
  const update = useUpdateUser();
  const [sheet, setSheet] = useState<{
    open: boolean;
    user: AdminUserRow | null;
  }>({ open: false, user: null });

  const users = usersQ.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="Create accounts, edit them and choose who gets notifications."
        actions={
          <Button onClick={() => setSheet({ open: true, user: null })}>
            <UserPlus /> Add user
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_10rem_10rem]">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or email"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <SelectField<"" | UserRole>
          value={role}
          onChange={setRole}
          options={[
            { value: "", label: "All roles" },
            { value: "user", label: "Users" },
            { value: "admin", label: "Admins" },
          ]}
        />
        <SelectField<"" | UserStatus>
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "Any status" },
            { value: "active", label: "Active" },
            { value: "disabled", label: "Disabled" },
          ]}
        />
      </div>

      {usersQ.isLoading ? (
        <PageLoader />
      ) : !usersQ.data ? (
        <ErrorState error={usersQ.error} />
      ) : !users.length ? (
        <EmptyState icon={<Users className="size-8" />} title="No users found">
          Try another search, or add a user.
        </EmptyState>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 p-3 sm:p-4">
              <Link
                to="/admin/users/$userId"
                params={{ userId: String(u.id) }}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium">
                    <span className="truncate">{u.name}</span>
                    <RoleBadge role={u.role} />
                    {u.status !== "active" && <StatusPill status={u.status} />}
                    {u.sessions > 1 && (
                      <span className="flex items-center gap-1 rounded-full bg-progress/12 px-2 py-0.5 text-[10px] font-semibold text-progress">
                        <MonitorSmartphone className="size-3" />
                        {u.sessions} devices
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="text-pending">
                      {u.pendingTasks} pending
                    </span>
                    {" · "}
                    <span className="text-done">{u.doneTasks} done</span>
                    {u.overdueTasks > 0 && (
                      <span className="text-overdue">
                        {" · "}
                        {u.overdueTasks} overdue
                      </span>
                    )}
                    <span className="hidden sm:inline">
                      {" · "}
                      {u.sessions
                        ? `logged in on ${u.sessions} device${u.sessions > 1 ? "s" : ""}`
                        : "logged out"}
                      {" · seen "}
                      {ago(u.lastSeenAt)}
                    </span>
                  </p>
                </div>
              </Link>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <Switch
                  checked={u.notifyPermission === "on"}
                  disabled={update.isPending}
                  onCheckedChange={(v) =>
                    update.mutate({
                      id: u.id,
                      notifyPermission: v ? "on" : "off",
                    })
                  }
                  aria-label={`Notifications for ${u.name}`}
                />
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  {u.notifyPermission === "off" && (
                    <BellOff className="size-3" />
                  )}
                  {u.notifyPermission === "on" ? "Alerts on" : "Alerts off"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => setSheet({ open: true, user: u })}
              >
                Edit
              </Button>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground sm:hidden" />
            </li>
          ))}
        </ul>
      )}

      <UserSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        user={sheet.user}
        isSelf={sheet.user?.id === me?.id}
      />
    </div>
  );
}
