import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListTodo, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Segmented } from "@/components/common/segmented";
import { SelectField } from "@/components/common/select-field";
import { EmptyState, PageLoader } from "@/components/common/states";
import { TaskList } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEvents, usePeople, useTasks } from "@/hooks/use-data";
import { applyTaskAction } from "@/hooks/use-reminders";
import { matchesView, sortTasks, type TaskView } from "@/lib/task-utils";
import { PRIORITIES, type Priority } from "@/lib/types";
import { useSheets } from "@/stores/sheet-store";

const VIEWS: TaskView[] = [
  "pending",
  "today",
  "overdue",
  "upcoming",
  "done",
  "all",
];

type TasksSearch = {
  view?: TaskView;
  task?: string;
  action?: "done" | "snooze";
};

export const Route = createFileRoute("/_app/tasks")({
  validateSearch: (s: Record<string, unknown>): TasksSearch => ({
    view: VIEWS.includes(s.view as TaskView) ? (s.view as TaskView) : undefined,
    task: typeof s.task === "string" ? s.task : undefined,
    action: s.action === "done" || s.action === "snooze" ? s.action : undefined,
  }),
  component: TasksPage,
});

function TasksPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/tasks" });
  const view = search.view ?? "pending";
  const tasksQ = useTasks();
  const events = useEvents().data ?? [];
  const people = usePeople().data ?? [];
  const { newTask, showTask } = useSheets();
  const [q, setQ] = useState("");
  const [eventId, setEventId] = useState("");
  const [priority, setPriority] = useState<"" | Priority>("");
  const [assignee, setAssignee] = useState("");

  // Opened from a notification: apply its action / open the task once.
  useEffect(() => {
    if (!search.task || tasksQ.isLoading) return;
    const id = search.task;
    if (search.action) applyTaskAction(id, search.action);
    else showTask(id);
    navigate({
      search: (s) => ({ ...s, task: undefined, action: undefined }),
      replace: true,
    });
  }, [search.task, search.action, tasksQ.isLoading]);

  if (tasksQ.isLoading) return <PageLoader />;
  const tasks = tasksQ.data ?? [];
  const term = q.trim().toLowerCase();
  const filtered = tasks.filter(
    (t) =>
      (!eventId || t.eventId === eventId) &&
      (!priority || t.priority === priority) &&
      (!assignee ||
        (assignee === "me" ? !t.assigneeId : t.assigneeId === assignee)) &&
      (!term ||
        t.title.toLowerCase().includes(term) ||
        t.notes.toLowerCase().includes(term)),
  );
  const count = (v: TaskView) =>
    filtered.filter((t) => matchesView(t, v)).length;
  const shown = sortTasks(filtered.filter((t) => matchesView(t, view)));
  const filtersOn = !!(eventId || priority || assignee || term);

  return (
    <div>
      <PageHeader
        title="All tasks"
        description="Every task across your events."
        actions={
          <Button onClick={() => newTask()} className="hidden md:inline-flex">
            <Plus /> Add task
          </Button>
        }
      />

      <Segmented
        className="mb-3 flex w-full md:inline-flex md:w-auto"
        size="sm"
        value={view}
        onChange={(v) =>
          navigate({ search: (s) => ({ ...s, view: v }), replace: true })
        }
        options={[
          { value: "pending", label: `Pending ${count("pending")}` },
          { value: "today", label: `Today ${count("today")}` },
          { value: "overdue", label: `Overdue ${count("overdue")}` },
          { value: "upcoming", label: "Upcoming" },
          { value: "done", label: "Done" },
          { value: "all", label: "All" },
        ]}
      />

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-[1fr_12rem_9rem_11rem]">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <SelectField
          aria-label="Event"
          value={eventId}
          onChange={setEventId}
          options={[
            { value: "", label: "All events" },
            ...events.map((e) => ({ value: e.id, label: e.name })),
          ]}
        />
        <SelectField<"" | Priority>
          aria-label="Priority"
          value={priority}
          onChange={setPriority}
          options={[{ value: "", label: "Any priority" }, ...PRIORITIES]}
        />
        <SelectField
          aria-label="Assigned to"
          className="col-span-2 md:col-span-1"
          value={assignee}
          onChange={setAssignee}
          options={[
            { value: "", label: "Anyone" },
            { value: "me", label: "Myself" },
            ...people.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      {filtersOn && (
        <button
          type="button"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary"
          onClick={() => {
            setQ("");
            setEventId("");
            setPriority("");
            setAssignee("");
          }}
        >
          <X className="size-4" /> Clear filters
        </button>
      )}

      <TaskList
        tasks={shown}
        empty={
          <EmptyState
            icon={<ListTodo className="size-7" />}
            title={
              view === "overdue"
                ? "Nothing overdue — shabash! 🎉"
                : view === "done"
                  ? "Nothing completed yet"
                  : "No tasks here"
            }
          />
        }
      />
    </div>
  );
}
