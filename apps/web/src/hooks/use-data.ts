import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryClient as qc } from "@/integrations/tanstack-query/root-provider";
import { fetchers } from "@/lib/fetchers";
import { shortDate } from "@/lib/format";
import type { TaskPatch } from "@/lib/offline/outbox";
import { baseOf, queue } from "@/lib/offline/sync";
import { keys } from "@/lib/query-keys";
import {
  type Category,
  checkDay,
  kindOf,
  type NotificationLog,
  newId,
  type Person,
  repeatFields,
  type Settings,
  statusPatch,
  type Task,
  type TaskEvent,
  type TaskStatus,
} from "@/lib/types";

export { keys };

export type EventInput = Pick<
  TaskEvent,
  "name" | "description" | "color" | "icon" | "dueDate"
>;
export type CategoryInput = Pick<
  Category,
  "eventId" | "name" | "icon" | "color" | "memberIds"
>;
export type PersonInput = Pick<Person, "name" | "role" | "phone" | "note">;
export type TaskInput = Pick<
  Task,
  | "eventId"
  | "categoryId"
  | "title"
  | "notes"
  | "priority"
  | "dueDate"
  | "dueTime"
  | "assigneeId"
  | "amount"
  | "subtasks"
  | "reminder"
  | "reminderMinutes"
  | "repeat"
  | "repeatEvery"
  | "repeatDays"
  | "repeatStart"
  | "repeatTime"
> & { status?: TaskStatus };

export const useEvents = () =>
  useQuery({ queryKey: keys.events, queryFn: fetchers.events });
export const useCategories = () =>
  useQuery({ queryKey: keys.categories, queryFn: fetchers.categories });
export const usePeople = () =>
  useQuery({ queryKey: keys.people, queryFn: fetchers.people });
export const useTasks = () =>
  useQuery({ queryKey: keys.tasks, queryFn: fetchers.tasks });
export const useSettings = () =>
  useQuery({ queryKey: keys.settings, queryFn: fetchers.settings });
export const useLog = () =>
  useQuery({ queryKey: keys.log, queryFn: fetchers.log });

const now = () => new Date().toISOString();
const cached = <T extends { id: string }>(
  key: readonly unknown[],
  id: string,
) => qc.getQueryData<T[]>(key)?.find((r) => r.id === id);

/** Writes are queued (lib/offline): they show at once and sync in the
 * background, so the mutation resolves immediately, online or not. */
function useAct<V, R>(fn: (v: V) => R, success?: string) {
  return useMutation({
    mutationFn: async (v: V) => fn(v),
    onSuccess: () => {
      if (success) toast.success(success);
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

/* ---- events ---- */

export function createEvent(v: EventInput): TaskEvent {
  const at = now();
  const row: TaskEvent = {
    ...v,
    id: newId(),
    status: "active",
    archivedAt: null,
    createdAt: at,
    updatedAt: at,
  };
  queue({ kind: "event.create", row }, `Add event: ${row.name}`);
  return row;
}
function updateEvent(
  id: string,
  patch: Partial<EventInput> & { status?: TaskEvent["status"] },
  label = "Edit event",
) {
  const name = patch.name ?? cached<TaskEvent>(keys.events, id)?.name ?? "";
  queue(
    { kind: "event.update", id, patch, base: baseOf("events", id) },
    `${label}: ${name}`,
  );
}

export const useCreateEvent = () => useAct(createEvent, "Event created");
export const useUpdateEvent = () =>
  useAct(
    ({ id, ...patch }: Partial<TaskEvent> & { id: string }) =>
      updateEvent(id, pickEvent(patch)),
    "Event saved",
  );
export const useSetEventStatus = () =>
  useAct(({ id, status }: { id: string; status: TaskEvent["status"] }) =>
    updateEvent(
      id,
      { status },
      status === "archived" ? "Archive event" : "Restore event",
    ),
  );
export const useDeleteEvent = () =>
  useAct((id: string) => {
    const name = cached<TaskEvent>(keys.events, id)?.name ?? "";
    queue({ kind: "event.delete", id }, `Delete event: ${name}`);
  }, "Event deleted");

function pickEvent(p: Partial<TaskEvent>) {
  const { name, description, color, icon, dueDate, status } = p;
  return Object.fromEntries(
    Object.entries({ name, description, color, icon, dueDate, status }).filter(
      ([, v]) => v !== undefined,
    ),
  ) as Partial<EventInput> & { status?: TaskEvent["status"] };
}

/* ---- categories ---- */

export const useCreateCategory = () =>
  useAct((v: CategoryInput) => {
    const at = now();
    const row: Category = {
      ...v,
      id: newId(),
      kind: kindOf(v.memberIds),
      createdAt: at,
      updatedAt: at,
    };
    queue({ kind: "category.create", row }, `Add category: ${row.name}`);
    return row;
  }, "Category created");
export const useUpdateCategory = () =>
  useAct(({ id, ...patch }: Partial<CategoryInput> & { id: string }) => {
    const name =
      patch.name ?? cached<Category>(keys.categories, id)?.name ?? "";
    queue(
      { kind: "category.update", id, patch, base: baseOf("categories", id) },
      `Edit category: ${name}`,
    );
  }, "Category saved");
export const useDeleteCategory = () =>
  useAct((id: string) => {
    const name = cached<Category>(keys.categories, id)?.name ?? "";
    queue({ kind: "category.delete", id }, `Delete category: ${name}`);
  }, "Category deleted");

/* ---- people ---- */

export const useCreatePerson = () =>
  useAct((v: PersonInput) => {
    const at = now();
    const row: Person = { ...v, id: newId(), createdAt: at, updatedAt: at };
    queue({ kind: "person.create", row }, `Add person: ${row.name}`);
    return row;
  }, "Person added");
export const useUpdatePerson = () =>
  useAct(({ id, ...patch }: Partial<PersonInput> & { id: string }) => {
    const name = patch.name ?? cached<Person>(keys.people, id)?.name ?? "";
    queue(
      { kind: "person.update", id, patch, base: baseOf("people", id) },
      `Edit person: ${name}`,
    );
  }, "Saved");
export const useDeletePerson = () =>
  useAct((id: string) => {
    const name = cached<Person>(keys.people, id)?.name ?? "";
    queue({ kind: "person.delete", id }, `Remove person: ${name}`);
  }, "Person removed");

/* ---- tasks ---- */

export function createTask(v: TaskInput): Task {
  const at = now();
  const { status = "pending", ...rest } = v;
  const row: Task = {
    ...rest,
    ...repeatFields(rest),
    id: newId(),
    status: "pending",
    doneDates: [],
    snoozedUntil: null,
    lastRemindedAt: null,
    createdAt: at,
    updatedAt: at,
    startedAt: null,
    completedAt: null,
  };
  // The create carries the status; the queued row shows it like the API will.
  const shown: Task = { ...row, ...statusPatch(row, status, at) };
  queue({ kind: "task.create", row: shown }, `Add task: ${row.title}`);
  return shown;
}

/** Any task change (status, snooze, fields) as one queued edit. */
export function updateTask(id: string, patch: TaskPatch, label = "Edit task") {
  const title = patch.title ?? cached<Task>(keys.tasks, id)?.title ?? "";
  queue(
    { kind: "task.update", id, patch, base: baseOf("tasks", id) },
    `${label}: ${title}`,
  );
  return cached<Task>(keys.tasks, id);
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  done: "Mark done",
  in_progress: "Start",
  pending: "Reopen",
};

export const setTaskStatus = (id: string, status: TaskStatus) =>
  updateTask(id, { status }, STATUS_LABEL[status]);
/** Ticks (or unticks) one occurrence of a routine. Sent as the whole list, like
 * the checklist, so a replay can't flip it back. */
export function setTaskDay(id: string, date: string, done: boolean) {
  const task = cached<Task>(keys.tasks, id);
  if (!task) return;
  updateTask(
    id,
    { doneDates: checkDay(task.doneDates, date, done) },
    `${done ? "Done" : "Not done"} for ${shortDate(date)}`,
  );
  return task;
}

/** Day check with an Undo toast. */
export function useSetTaskDay() {
  return useMutation({
    mutationFn: async (v: { id: string; date: string; done: boolean }) =>
      setTaskDay(v.id, v.date, v.done),
    onSuccess: (task, { id, date, done }) => {
      if (done)
        toast.success(`Done for ${shortDate(date)}`, {
          description: task?.title,
          action: { label: "Undo", onClick: () => setTaskDay(id, date, false) },
        });
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export const snoozeTask = (id: string, until: string | null) =>
  updateTask(id, { snoozedUntil: until }, until ? "Snooze" : "Unsnooze");

export const useCreateTask = () => useAct(createTask, "Task added");
export const useUpdateTask = () =>
  useAct(
    ({ id, ...patch }: Partial<TaskInput> & { id: string }) =>
      updateTask(id, patch),
    "Task saved",
  );
export const useDeleteTask = () =>
  useAct((id: string) => {
    const title = cached<Task>(keys.tasks, id)?.title ?? "";
    queue({ kind: "task.delete", id }, `Delete task: ${title}`);
  }, "Task deleted");
export const useToggleSubtask = () =>
  useAct(({ taskId, subtaskId }: { taskId: string; subtaskId: string }) => {
    const task = cached<Task>(keys.tasks, taskId);
    if (!task) return;
    // Sent as the whole list (not a toggle), so a replay can't flip it back.
    const subtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, doneAt: st.doneAt ? null : now() } : st,
    );
    updateTask(taskId, { subtasks }, "Checklist");
  });
export const useSnoozeTask = () =>
  useAct(({ id, until }: { id: string; until: string | null }) =>
    snoozeTask(id, until),
  );

/** Status change with an Undo toast; marking done records the finish time. */
export function useSetTaskStatus() {
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: TaskStatus;
      prev?: TaskStatus;
    }) => setTaskStatus(id, status),
    onSuccess: (task, { id, status, prev }) => {
      if (status === "done" && prev && prev !== "done") {
        toast.success("Marked as done", {
          description: task?.title,
          action: { label: "Undo", onClick: () => setTaskStatus(id, prev) },
        });
      }
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

/* ---- settings & log ---- */

export const updateSettings = (patch: Partial<Settings>) =>
  queue({ kind: "settings.update", patch }, "Reminder settings");
export const addLog = (entries: Omit<NotificationLog, "id" | "readAt">[]) =>
  queue(
    {
      kind: "log.add",
      entries: entries.map((e) => ({ ...e, id: newId(), readAt: null })),
    },
    entries.length === 1 ? "Reminder sent" : `${entries.length} reminders sent`,
  );
export const markReminded = (ids: string[], at: string) =>
  queue({ kind: "task.reminded", ids, at }, "Reminder times");

export const useUpdateSettings = () => useAct(updateSettings);
export const useMarkLogRead = () =>
  useAct(() =>
    queue({ kind: "log.read", at: now() }, "Mark notifications read"),
  );
export const useClearLog = () =>
  useAct(() => queue({ kind: "log.clear" }, "Clear notifications"), "Cleared");

/** id → row maps for showing names next to tasks. */
export function useLookups() {
  const events = useEvents().data ?? [];
  const categories = useCategories().data ?? [];
  const people = usePeople().data ?? [];
  return {
    eventById: new Map(events.map((e) => [e.id, e])),
    categoryById: new Map(categories.map((c) => [c.id, c])),
    personById: new Map(people.map((p) => [p.id, p])),
  };
}
