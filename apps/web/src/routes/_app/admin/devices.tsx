import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Monitor, MonitorSmartphone, Smartphone } from "lucide-react";
import { RoleBadge } from "@/components/admin/badges";
import { Avatar } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { Segmented } from "@/components/common/segmented";
import { EmptyState, ErrorState, PageLoader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import {
  type AdminSession,
  useAdminSessions,
  useLogoutDevice,
} from "@/hooks/use-admin";
import { deviceLabel, isPhoneUa } from "@/lib/devices";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

type View = "all" | "multi";

export const Route = createFileRoute("/_app/admin/devices")({
  validateSearch: (s: Record<string, unknown>): { view?: View } => ({
    view: s.view === "multi" ? "multi" : undefined,
  }),
  component: AdminDevices,
});

/** Who is logged in where, grouped by user; users on several devices first. */
function AdminDevices() {
  const { view = "all" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const me = useAuthStore((s) => s.user);
  const q = useAdminSessions();
  const logout = useLogoutDevice();

  if (q.isLoading) return <PageLoader />;
  if (!q.data) return <ErrorState error={q.error} />;

  const byUser = new Map<number, AdminSession[]>();
  for (const s of q.data)
    byUser.set(s.user.id, [...(byUser.get(s.user.id) ?? []), s]);
  const groups = [...byUser.values()]
    .filter((g) => view === "all" || g.length > 1)
    .sort((a, b) => b.length - a.length);
  const multi = [...byUser.values()].filter((g) => g.length > 1).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Devices"
        description={`${byUser.size} user${byUser.size === 1 ? "" : "s"} logged in on ${q.data.length} device${q.data.length === 1 ? "" : "s"} · ${multi} on several devices`}
      />
      <Segmented<View>
        value={view}
        onChange={(v) =>
          navigate({
            search: { view: v === "all" ? undefined : v },
            replace: true,
          })
        }
        options={[
          { value: "all", label: "Everyone logged in" },
          { value: "multi", label: `On several devices (${multi})` },
        ]}
      />

      {!groups.length ? (
        <EmptyState
          icon={<MonitorSmartphone className="size-8" />}
          title={
            view === "multi"
              ? "Nobody is on several devices"
              : "Nobody is logged in"
          }
        />
      ) : (
        groups.map((sessions) => {
          const u = sessions[0]!.user;
          return (
            <section key={u.id} className="rounded-2xl border bg-card">
              <Link
                to="/admin/users/$userId"
                params={{ userId: String(u.id) }}
                className="flex items-center gap-3 border-b p-3 hover:bg-muted/50 sm:px-4"
              >
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{u.name}</span>
                    <RoleBadge role={u.role} />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    sessions.length > 1
                      ? "bg-progress/12 text-progress"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {sessions.length} device{sessions.length === 1 ? "" : "s"}
                </span>
              </Link>
              <ul className="divide-y">
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2.5 sm:px-4"
                  >
                    {isPhoneUa(s.userAgent) ? (
                      <Smartphone className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Monitor className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {deviceLabel(s.userAgent)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Signed in{" "}
                        {format(new Date(s.createdAt), "d MMM, h:mm a")}
                        {s.ip ? ` · ${s.ip}` : ""}
                      </p>
                    </div>
                    {u.id !== me?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={logout.isPending}
                        onClick={() =>
                          logout.mutate({ id: u.id, sessionId: s.id })
                        }
                      >
                        Log out
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
