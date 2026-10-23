import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDot,
  ListTodo,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PriorityFlag } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { Segmented } from "@/components/common/segmented";
import { SelectField } from "@/components/common/select-field";
import { EmptyState, ErrorState, PageLoader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type AdminTaskStatus,
  useAdminTasks,
  useAdminUsers,
} from "@/hooks/use-admin";
import { formatAmount, formatDue, isOverdue } from "@/lib/format";
import { PRIORITIES, type Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUSES: { value: AdminTaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "overdue", label: "Overdue" },
  { value: "done", label: "Completed" },
  { value: "all", label: "All" },
];

type TaskSearch = {
  status?: AdminTaskStatus;
  userId?: number;
  priority?: Priority;
  q?: string;
  page?: number;
};

export const Route = createFileRoute("/_app/admin/tasks")({
  validateSearch: (s: Record<string, unknown>): TaskSearch => ({
    status: STATUSES.some((x) => x.value === s.status)
      ? (s.status as AdminTaskStatus)
      : undefined,
    userId: Number(s.userId) > 0 ? Number(s.userId) : undefined,
    priority: PRIORITIES.some((p) => p.value === s.priority)
      ? (s.priority as Priority)
      : undefined,
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    page: Number(s.page) > 1 ? Number(s.page) : undefined,
  }),
  component: AdminTasks,
});

/** Every user's tasks (read-only), filtered from the URL so the overview's
 * Pending / Completed / Overdue cards open it pre-filtered. */
function AdminTasks() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const status = search.status ?? "pending";
  const users = useAdminUsers({}).data ?? [];
  const tasksQ = useAdminTasks({ ...search, status });
  const [q, setQ] = useState(search.q ?? "");

  const set = (patch: Partial<TaskSearch>) =>
    navigate({
      search: (s) => ({ ...s, ...patch, page: patch.page }),
      replace: true,
    });

  // Search as you type (debounced).
  useEffect(() => {
    if ((search.q ?? "") === q.trim()) return;
    const t = setTimeout(() => set({ q: q.trim() || undefined }), 300);
    return () => clearTimeout(t);
  }, [q]);

  const data = tasksQ.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const page = search.page ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader
        title="All tasks"
        description="Every user's tasks. Read-only: users manage their own."
      />

      <Segmented
        value={status}
        onChange={(v) => set({ status: v === "pending" ? undefined : v })}
        options={STATUSES}
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_12rem_10rem]">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search task titles"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <SelectField
          value={search.userId ? String(search.userId) : ""}
          onChange={(v) => set({ userId: v ? Number(v) : undefined })}
          options={[
            { value: "", label: "All users" },
            ...users.map((u) => ({ value: String(u.id), label: u.name })),
          ]}
        />
        <SelectField<"" | Priority>
          value={search.priority ?? ""}
          onChange={(v) => set({ priority: v || undefined })}
          options={[{ value: "", label: "Any priority" }, ...PRIORITIES]}
        />
      </div>

      {tasksQ.isLoading ? (
        <PageLoader />
      ) : !data ? (
        <ErrorState error={tasksQ.error} />
      ) : !data.tasks.length ? (
        <EmptyState
          icon={<ListTodo className="size-8" />}
          title="No tasks here"
        >
          Nothing matches these filters.
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data.total} task{data.total === 1 ? "" : "s"}
            {pages > 1 && ` · page ${page} of ${pages}`}
          </p>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {data.tasks.map((t) => {
              const overdue = isOverdue(t);
              const Icon =
                t.status === "done"
                  ? CircleCheck
                  : t.status === "in_progress"
                    ? CircleDot
                    : Circle;
              return (
                <li key={t.id} className="flex items-start gap-3 p-3 sm:p-4">
                  <Icon
                    className={cn(
                      "mt-0.5 size-5 shrink-0",
                      t.status === "done"
                        ? "text-done"
                        : overdue
                          ? "text-overdue"
                          : t.status === "in_progress"
                            ? "text-progress"
                            : "text-muted-foreground",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "font-medium",
                        t.status === "done" &&
                          "text-muted-foreground line-through",
                      )}
                    >
                      {t.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: String(t.user.id) }}
                        className="font-medium text-primary hover:underline"
                      >
                        {t.user.name}
                      </Link>
                      {t.eventName && (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: t.eventColor ?? undefined,
                            }}
                          />
                          <span className="truncate">
                            {t.eventName}
                            {t.categoryName ? ` · ${t.categoryName}` : ""}
                          </span>
                        </span>
                      )}
                      {t.status === "done" && t.completedAt ? (
                        <span className="text-done">
                          Done{" "}
                          {format(new Date(t.completedAt), "d MMM, h:mm a")}
                        </span>
                      ) : (
                        <span className={cn(overdue && "text-overdue")}>
                          {formatDue(t)}
                        </span>
                      )}
                      {!!t.amount && (
                        <span className="tabular">
                          {formatAmount(t.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                  <PriorityFlag priority={t.priority} />
                </li>
              );
            })}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() =>
                  set({ page: page - 1 > 1 ? page - 1 : undefined })
                }
              >
                <ChevronLeft /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => set({ page: page + 1 })}
              >
                Next <ChevronRight />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
