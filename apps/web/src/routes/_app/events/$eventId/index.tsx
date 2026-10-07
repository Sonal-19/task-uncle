import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { BackLink } from "@/components/common/back-link";
import { IconTile } from "@/components/common/badges";
import { confirm } from "@/components/common/confirm-dialog";
import { Progress } from "@/components/common/progress";
import { EmptyState, PageLoader } from "@/components/common/states";
import { CategoryTile } from "@/components/events/category-tile";
import { TaskList } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCategories,
  useDeleteEvent,
  useEvents,
  useLookups,
  useSetEventStatus,
  useTasks,
} from "@/hooks/use-data";
import { dayLabel, formatAmount } from "@/lib/format";
import { progressPct, sortTasks, taskStats } from "@/lib/task-utils";
import { useSheets } from "@/stores/sheet-store";

export const Route = createFileRoute("/_app/events/$eventId/")({
  component: EventPage,
});

function EventPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const eventsQ = useEvents();
  const categories = (useCategories().data ?? []).filter(
    (c) => c.eventId === eventId,
  );
  const tasks = (useTasks().data ?? []).filter((t) => t.eventId === eventId);
  const { personById } = useLookups();
  const sheets = useSheets();
  const setStatus = useSetEventStatus();
  const del = useDeleteEvent();

  if (eventsQ.isLoading) return <PageLoader />;
  const event = eventsQ.data?.find((e) => e.id === eventId);
  if (!event)
    return (
      <EmptyState title="Event not found">
        <BackLink to="/events" label="All events" />
      </EmptyState>
    );

  const s = taskStats(tasks);
  const pending = sortTasks(tasks.filter((t) => t.status !== "done"));

  async function remove() {
    if (
      await confirm({
        title: `Delete “${event!.name}”?`,
        description: `This deletes its ${categories.length} categories and ${tasks.length} tasks. Archive it instead to keep the history.`,
        confirmText: "Delete event",
        destructive: true,
      })
    )
      del.mutate(eventId, { onSuccess: () => navigate({ to: "/events" }) });
  }

  return (
    <div className="space-y-5">
      <div>
        <BackLink to="/events" label="Events" />
        <div className="flex items-start gap-3">
          <IconTile
            icon={event.icon}
            color={event.color}
            className="size-12 rounded-2xl [&_svg]:size-6"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {event.name}
            </h1>
            {event.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {event.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Event actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => sheets.editEvent(event)}>
                <Pencil /> Edit event
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setStatus.mutate({
                    id: event.id,
                    status: event.status === "active" ? "archived" : "active",
                  })
                }
              >
                {event.status === "active" ? (
                  <>
                    <Archive /> Archive
                  </>
                ) : (
                  <>
                    <ArchiveRestore /> Restore
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={remove}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Stat label="Pending" value={s.open} className="text-pending" />
          <Stat label="Overdue" value={s.overdue} className="text-overdue" />
          <Stat label="Done" value={s.done} className="text-done" />
          <Stat
            label="Pending payments"
            value={formatAmount(s.pendingAmount)}
          />
        </div>
        <Progress
          value={s.done}
          max={s.total}
          color={event.color}
          className="mt-4"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {progressPct(s.done, s.total)}% complete
          {event.dueDate && ` · target ${dayLabel(event.dueDate)}`}
        </p>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-semibold">Categories</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sheets.newCategory(eventId)}
          >
            <Plus /> Category
          </Button>
        </div>
        {categories.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((c) => (
              <CategoryTile
                key={c.id}
                category={c}
                tasks={tasks}
                personById={personById}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No categories yet">
            Add groups like GST, CA, YouTube or Developer team.
          </EmptyState>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-semibold">
            All pending{" "}
            <span className="text-muted-foreground">· {pending.length}</span>
          </h2>
          {categories.length > 0 && (
            <Button size="sm" onClick={() => sheets.newTask({ eventId })}>
              <Plus /> Task
            </Button>
          )}
        </div>
        <TaskList
          tasks={pending}
          showEvent={false}
          empty={<EmptyState title="Nothing pending here 🎉" />}
        />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`tabular truncate text-xl font-bold ${className ?? ""}`}>
        {value}
      </p>
    </div>
  );
}
