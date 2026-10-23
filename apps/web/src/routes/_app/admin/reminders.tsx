import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { BellRing } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SelectField } from "@/components/common/select-field";
import { EmptyState, ErrorState, PageLoader } from "@/components/common/states";
import { useAdminReminders, useAdminUsers } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/reminders")({
  validateSearch: (s: Record<string, unknown>): { userId?: number } => ({
    userId: Number(s.userId) > 0 ? Number(s.userId) : undefined,
  }),
  component: AdminReminders,
});

/** The reminders Task Uncle sent (latest 300), for everyone or one user. */
function AdminReminders() {
  const { userId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const users = useAdminUsers({}).data ?? [];
  const q = useAdminReminders(userId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reminders log"
        description="Which reminders went out, to whom and when (read = opened in the app)."
      />
      <SelectField
        className="sm:max-w-xs"
        value={userId ? String(userId) : ""}
        onChange={(v) =>
          navigate({
            search: { userId: v ? Number(v) : undefined },
            replace: true,
          })
        }
        options={[
          { value: "", label: "All users" },
          ...users.map((u) => ({ value: String(u.id), label: u.name })),
        ]}
      />
      {q.isLoading ? (
        <PageLoader />
      ) : !q.data ? (
        <ErrorState error={q.error} />
      ) : !q.data.length ? (
        <EmptyState
          icon={<BellRing className="size-8" />}
          title="No reminders yet"
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {q.data.map((r) => (
            <li key={r.id} className="flex items-start gap-3 p-3 sm:px-4">
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  r.readAt ? "bg-muted-foreground/40" : "bg-primary",
                )}
                title={r.readAt ? "Read" : "Unread"}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{r.title}</p>
                {r.body && (
                  <p className="truncate text-xs text-muted-foreground">
                    {r.body}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <Link
                    to="/admin/users/$userId"
                    params={{ userId: String(r.user.id) }}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.user.name}
                  </Link>
                  {" · "}
                  {format(new Date(r.sentAt), "d MMM, h:mm a")}
                  {r.readAt ? " · read" : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
