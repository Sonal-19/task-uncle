import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { BackLink } from "@/components/common/back-link";
import { Avatar, IconTile } from "@/components/common/badges";
import { confirm } from "@/components/common/confirm-dialog";
import { Segmented } from "@/components/common/segmented";
import { EmptyState, PageLoader } from "@/components/common/states";
import { TaskList } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import {
  useCategories,
  useDeleteCategory,
  useLookups,
  useTasks,
} from "@/hooks/use-data";
import { formatAmount } from "@/lib/format";
import { sortTasks } from "@/lib/task-utils";
import type { TaskStatus } from "@/lib/types";
import { useSheets } from "@/stores/sheet-store";

export const Route = createFileRoute("/_app/events/$eventId/$categoryId")({
  component: CategoryPage,
});

type Filter = "open" | TaskStatus | "all";

function CategoryPage() {
  const { eventId, categoryId } = Route.useParams();
  const navigate = useNavigate();
  const catsQ = useCategories();
  const all = (useTasks().data ?? []).filter(
    (t) => t.categoryId === categoryId,
  );
  const { eventById, personById } = useLookups();
  const sheets = useSheets();
  const del = useDeleteCategory();
  const [filter, setFilter] = useState<Filter>("open");

  if (catsQ.isLoading) return <PageLoader />;
  const cat = catsQ.data?.find((c) => c.id === categoryId);
  const event = eventById.get(eventId);
  if (!cat || !event)
    return (
      <EmptyState title="Category not found">
        <BackLink to="/events" label="All events" />
      </EmptyState>
    );

  const count = (f: Filter) =>
    all.filter((t) =>
      f === "all" ? true : f === "open" ? t.status !== "done" : t.status === f,
    ).length;
  const shown = sortTasks(
    all.filter((t) =>
      filter === "all"
        ? true
        : filter === "open"
          ? t.status !== "done"
          : t.status === filter,
    ),
  );
  const pendingAmt = all
    .filter((t) => t.status !== "done")
    .reduce((s, t) => s + (t.amount ?? 0), 0);

  async function remove() {
    if (
      await confirm({
        title: `Delete “${cat!.name}”?`,
        description: `Its ${all.length} tasks will be deleted too.`,
        confirmText: "Delete",
        destructive: true,
      })
    )
      del.mutate(categoryId, {
        onSuccess: () =>
          navigate({ to: "/events/$eventId", params: { eventId } }),
      });
  }

  return (
    <div className="space-y-5">
      <div>
        <BackLink
          to="/events/$eventId"
          params={{ eventId }}
          label={event.name}
        />
        <div className="flex items-start gap-3">
          <IconTile
            icon={cat.icon}
            color={cat.color}
            className="size-12 rounded-2xl [&_svg]:size-6"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {cat.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {count("open")} pending · {count("done")} done
              {pendingAmt > 0 && ` · ${formatAmount(pendingAmt)} to pay`}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit category"
              onClick={() => sheets.editCategory(cat)}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete category"
              className="text-destructive hover:text-destructive"
              onClick={remove}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </div>

      {cat.memberIds.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {cat.memberIds.map((id) => {
            const p = personById.get(id);
            if (!p) return null;
            const theirs = all.filter(
              (t) => t.assigneeId === id && t.status !== "done",
            ).length;
            return (
              <div
                key={id}
                className="flex shrink-0 items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1"
              >
                <Avatar name={p.name} className="size-8" />
                <div className="text-xs leading-tight">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-muted-foreground">
                    {p.role || "Member"} · {theirs} pending
                  </p>
                </div>
                {p.phone && (
                  <a
                    href={`tel:${p.phone.replace(/\s/g, "")}`}
                    aria-label={`Call ${p.name}`}
                    className="ml-1 grid size-7 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="size-3.5" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={filter}
          onChange={setFilter}
          size="sm"
          options={[
            { value: "open", label: `Pending · ${count("open")}` },
            { value: "in_progress", label: "In progress" },
            { value: "done", label: `Done · ${count("done")}` },
            { value: "all", label: "All" },
          ]}
        />
        <Button
          onClick={() => sheets.newTask({ eventId, categoryId })}
          className="hidden md:inline-flex"
        >
          <Plus /> Add task
        </Button>
      </div>

      <TaskList
        tasks={shown}
        showEvent={false}
        empty={
          <EmptyState
            title={
              filter === "done"
                ? "Nothing done yet"
                : "No pending tasks here 🎉"
            }
          >
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => sheets.newTask({ eventId, categoryId })}
            >
              <Plus /> Add a task to {cat.name}
            </Button>
          </EmptyState>
        }
      />
    </div>
  );
}
