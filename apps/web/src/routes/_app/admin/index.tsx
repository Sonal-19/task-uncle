import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import {
  AlertTriangle,
  BellOff,
  CheckCircle2,
  Hourglass,
  ListTodo,
  LogIn,
  MonitorSmartphone,
  Smartphone,
  UserPlus,
  Users,
} from "lucide-react";
import { DayBars } from "@/components/admin/day-bars";
import { SectionCard } from "@/components/app/section-card";
import { StatCard } from "@/components/app/stat-card";
import { Avatar } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState, PageLoader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useAdminOverview } from "@/hooks/use-admin";

export const Route = createFileRoute("/_app/admin/")({
  component: AdminOverview,
});

const ago = (iso: string | null) =>
  iso ? `${formatDistanceToNowStrict(new Date(iso))} ago` : "never";

function AdminOverview() {
  const q = useAdminOverview();
  if (q.isLoading) return <PageLoader />;
  if (!q.data) return <ErrorState error={q.error} />;
  const d = q.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin"
        description="Everyone using Task Uncle, at a glance."
        actions={
          <Button asChild>
            <Link to="/admin/users">
              <Users /> Manage users
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={d.users.total}
          icon={<Users />}
          hint={`${d.users.active} active · ${d.users.disabled} disabled · ${d.users.admins} admin${d.users.admins === 1 ? "" : "s"}`}
          link={{ to: "/admin/users" }}
        />
        <StatCard
          label="Logged in now"
          value={d.logins.loggedInUsers}
          icon={<LogIn />}
          tone="done"
          hint={`${d.logins.sessions} open session${d.logins.sessions === 1 ? "" : "s"} · ${d.users.activeToday} active today`}
          link={{ to: "/admin/devices" }}
        />
        <StatCard
          label="On several devices"
          value={d.logins.multiDeviceUsers}
          icon={<MonitorSmartphone />}
          tone="progress"
          hint="Users logged in on 2+ devices"
          link={{ to: "/admin/devices", search: { view: "multi" } }}
        />
        <StatCard
          label="Push devices"
          value={d.push.devices}
          icon={<Smartphone />}
          hint={`${d.push.users} user${d.push.users === 1 ? "" : "s"} get reminders when closed`}
          link={{ to: "/admin/reminders" }}
        />
        <StatCard
          label="Pending tasks"
          value={d.tasks.pending}
          icon={<Hourglass />}
          tone="pending"
          hint={`${d.tasks.inProgress} in progress · ${d.tasks.total} total`}
          link={{ to: "/admin/tasks" }}
        />
        <StatCard
          label="Completed tasks"
          value={d.tasks.done}
          icon={<CheckCircle2 />}
          tone="done"
          hint={`${d.tasks.doneToday} today`}
          link={{ to: "/admin/tasks", search: { status: "done" } }}
        />
        <StatCard
          label="Overdue"
          value={d.tasks.overdue}
          icon={<AlertTriangle />}
          tone="overdue"
          hint="Past their due date"
          link={{ to: "/admin/tasks", search: { status: "overdue" } }}
        />
        <StatCard
          label="New users"
          value={d.users.newThisWeek}
          icon={<UserPlus />}
          hint={`This week · ${d.users.notificationsOff} with notifications off`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <UserPlus className="size-4.5 text-primary" /> Sign-ups
            </span>
          }
        >
          <DayBars data={d.signupsByDay} />
        </SectionCard>
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <ListTodo className="size-4.5 text-done" /> Tasks completed
            </span>
          }
        >
          <DayBars data={d.completedByDay} barClassName="bg-done" />
        </SectionCard>
      </div>

      <SectionCard
        title="Recent logins"
        action={
          <Link
            to="/admin/users"
            className="text-sm font-medium text-primary hover:underline"
          >
            All users
          </Link>
        }
      >
        {d.recentLogins.length ? (
          <ul className="divide-y">
            {d.recentLogins.map((u) => (
              <li key={u.id}>
                <Link
                  to="/admin/users/$userId"
                  params={{ userId: String(u.id) }}
                  className="flex items-center gap-3 py-2.5 hover:opacity-80"
                >
                  <Avatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {u.name}
                      {u.role === "admin" && (
                        <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Logged in {ago(u.lastLoginAt)}</p>
                    <p className="flex items-center justify-end gap-1">
                      {u.notifyPermission === "off" && (
                        <BellOff
                          className="size-3"
                          aria-label="Notifications off"
                        />
                      )}
                      Seen {ago(u.lastSeenAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No logins yet.</p>
        )}
      </SectionCard>
    </div>
  );
}
