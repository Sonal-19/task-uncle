import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  Ban,
  BellOff,
  BellRing,
  CheckCircle2,
  FolderKanban,
  Hourglass,
  KeyRound,
  ListTodo,
  LogOut,
  Monitor,
  Pencil,
  Smartphone,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { RoleBadge, StatusPill } from "@/components/admin/badges";
import { UserSheet } from "@/components/admin/user-sheet";
import { SectionCard } from "@/components/app/section-card";
import { StatCard } from "@/components/app/stat-card";
import { BackLink } from "@/components/common/back-link";
import { Avatar } from "@/components/common/badges";
import { confirm } from "@/components/common/confirm-dialog";
import { ErrorState, PageLoader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useAdminUser,
  useDeleteUser,
  useLogoutDevice,
  useLogoutEverywhere,
  useUpdateUser,
} from "@/hooks/use-admin";
import { deviceLabel, isPhoneUa } from "@/lib/devices";
import { useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/_app/admin/users/$userId")({
  component: AdminUserPage,
});

const ago = (iso: string | null) =>
  iso ? `${formatDistanceToNowStrict(new Date(iso))} ago` : "never";
const when = (iso: string | null) =>
  iso ? format(new Date(iso), "d MMM yyyy, h:mm a") : "—";

function AdminUserPage() {
  const { userId } = Route.useParams();
  const id = Number(userId);
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const q = useAdminUser(id);
  const update = useUpdateUser();
  const logoutDevice = useLogoutDevice();
  const logoutAll = useLogoutEverywhere();
  const remove = useDeleteUser();
  const [sheet, setSheet] = useState<"details" | "password" | null>(null);

  if (q.isLoading) return <PageLoader />;
  if (!q.data) return <ErrorState error={q.error} />;
  const u = q.data;
  const self = u.id === me?.id;
  const disabled = u.status === "disabled";

  async function toggleStatus() {
    if (
      !disabled &&
      !(await confirm({
        title: `Disable ${u.name}?`,
        description:
          "They are logged out on every device and can't log in until you enable the account again. Their data is kept.",
        confirmText: "Disable",
        destructive: true,
      }))
    )
      return;
    update.mutate({ id, status: disabled ? "active" : "disabled" });
  }

  async function deleteUser() {
    if (
      await confirm({
        title: `Delete ${u.name}?`,
        description:
          "The account and all of its events, tasks, people and reminders are deleted for good.",
        confirmText: "Delete account",
        destructive: true,
      })
    )
      remove.mutate(id, {
        onSuccess: () => navigate({ to: "/admin/users", replace: true }),
      });
  }

  return (
    <div className="space-y-5">
      <BackLink to="/admin/users" label="Users" />

      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
        <Avatar name={u.name} className="size-14 text-lg" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-xl font-bold">
            <span className="truncate">{u.name}</span>
            <RoleBadge role={u.role} />
            <StatusPill status={u.status} />
            {self && (
              <span className="text-xs font-normal text-muted-foreground">
                (you)
              </span>
            )}
          </p>
          <p className="truncate text-sm text-muted-foreground">{u.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Joined {when(u.createdAt)} · last login {ago(u.lastLoginAt)} · seen{" "}
            {ago(u.lastSeenAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSheet("details")}
          >
            <Pencil /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSheet("password")}
          >
            <KeyRound /> Password
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/tasks" search={{ userId: id, status: "all" }}>
              <ListTodo /> View tasks
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/reminders" search={{ userId: id }}>
              <BellRing /> Reminders
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pending tasks"
          value={u.pendingTasks}
          icon={<Hourglass />}
          tone="pending"
          hint={u.overdueTasks ? `${u.overdueTasks} overdue` : "None overdue"}
        />
        <StatCard
          label="Completed"
          value={u.doneTasks}
          icon={<CheckCircle2 />}
          tone="done"
        />
        <StatCard label="Events" value={u.events} icon={<FolderKanban />} />
        <StatCard
          label="Logged in on"
          value={`${u.sessions.length} device${u.sessions.length === 1 ? "" : "s"}`}
          icon={<Monitor />}
          tone="progress"
          hint={`${u.devices.length} with push reminders`}
        />
      </div>

      <SectionCard title="Permissions">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                {u.notifyPermission === "on" ? (
                  <BellRing className="size-4 text-primary" />
                ) : (
                  <BellOff className="size-4 text-muted-foreground" />
                )}
                Notifications
              </p>
              <p className="text-sm text-muted-foreground">
                {u.notifyPermission === "on"
                  ? "Allowed: reminders by push and in the app, as they set them up."
                  : "Turned off by an admin: no reminders on any device, and they can't turn them on."}
              </p>
            </div>
            <Switch
              checked={u.notifyPermission === "on"}
              disabled={update.isPending}
              onCheckedChange={(v) =>
                update.mutate({ id, notifyPermission: v ? "on" : "off" })
              }
              aria-label="Notifications allowed"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                {disabled ? (
                  <Ban className="size-4 text-overdue" />
                ) : (
                  <UserCheck className="size-4 text-done" />
                )}
                Account
              </p>
              <p className="text-sm text-muted-foreground">
                {disabled
                  ? `Disabled ${ago(u.disabledAt)}: can't log in.`
                  : self
                    ? "Active. You can't disable your own account."
                    : "Active: can log in and use the app."}
              </p>
            </div>
            <Button
              variant={disabled ? "default" : "outline"}
              size="sm"
              disabled={self || update.isPending}
              onClick={toggleStatus}
            >
              {disabled ? "Enable" : "Disable"}
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={`Logged-in devices (${u.sessions.length})`}
        action={
          u.sessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={logoutAll.isPending}
              onClick={async () => {
                if (
                  await confirm({
                    title: self
                      ? "Log out your other devices?"
                      : `Log ${u.name} out everywhere?`,
                    description: self
                      ? "Every other session ends; this one stays."
                      : "Every session ends. They can log in again.",
                    confirmText: "Log out",
                  })
                )
                  logoutAll.mutate(id);
              }}
            >
              <LogOut /> {self ? "Log out others" : "Log out everywhere"}
            </Button>
          )
        }
      >
        {u.sessions.length ? (
          <ul className="divide-y">
            {u.sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  {isPhoneUa(s.userAgent) ? (
                    <Smartphone className="size-4" />
                  ) : (
                    <Monitor className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {deviceLabel(s.userAgent)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Signed in {when(s.createdAt)}
                    {s.ip ? ` · ${s.ip}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={logoutDevice.isPending}
                  onClick={() => logoutDevice.mutate({ id, sessionId: s.id })}
                >
                  Log out
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Not logged in anywhere right now.
          </p>
        )}
      </SectionCard>

      <SectionCard title={`Push reminder devices (${u.devices.length})`}>
        {u.devices.length ? (
          <ul className="divide-y">
            {u.devices.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                <BellRing className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {deviceLabel(d.userAgent)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Added {when(d.createdAt)} · last delivered{" "}
                    {ago(d.lastSuccessAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No device gets push reminders (reminders still show while the app is
            open, if notifications are allowed).
          </p>
        )}
      </SectionCard>

      {!self && (
        <SectionCard title="Danger zone">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Deletes the account and everything in it. This can't be undone.
            </p>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={remove.isPending}
              onClick={deleteUser}
            >
              <Trash2 /> Delete account
            </Button>
          </div>
        </SectionCard>
      )}

      <UserSheet
        open={!!sheet}
        onOpenChange={(o) => !o && setSheet(null)}
        user={u}
        mode={sheet ?? "details"}
        isSelf={self}
      />
    </div>
  );
}
