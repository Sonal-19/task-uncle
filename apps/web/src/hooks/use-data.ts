import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type CategoryInput,
  type EventInput,
  mockApi,
  type PersonInput,
  type TaskInput,
} from "@/lib/mock-api";
import type { Settings, TaskEvent, TaskStatus } from "@/lib/types";

/** Every key starts with "tu" so one invalidation refreshes everything. */
export const keys = {
  all: ["tu"] as const,
  events: ["tu", "events"] as const,
  categories: ["tu", "categories"] as const,
  people: ["tu", "people"] as const,
  tasks: ["tu", "tasks"] as const,
  settings: ["tu", "settings"] as const,
  log: ["tu", "log"] as const,
};

const live = { staleTime: Number.POSITIVE_INFINITY };

export const useEvents = () =>
  useQuery({ queryKey: keys.events, queryFn: mockApi.listEvents, ...live });
export const useCategories = () =>
  useQuery({
    queryKey: keys.categories,
    queryFn: mockApi.listCategories,
    ...live,
  });
export const usePeople = () =>
  useQuery({ queryKey: keys.people, queryFn: mockApi.listPeople, ...live });
export const useTasks = () =>
  useQuery({ queryKey: keys.tasks, queryFn: mockApi.listTasks, ...live });
export const useSettings = () =>
  useQuery({
    queryKey: keys.settings,
    queryFn: mockApi.getSettings,
    ...live,
  });
export const useLog = () =>
  useQuery({ queryKey: keys.log, queryFn: mockApi.listLog, ...live });

/** Mutation that refreshes all data afterwards and toasts errors. */
function useAct<V, R>(fn: (v: V) => Promise<R>, success?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (success) toast.success(success);
    },
    onError: (e) => toast.error((e as Error).message),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

// ---- events ----
export const useCreateEvent = () =>
  useAct((v: EventInput) => mockApi.createEvent(v), "Event created");
export const useUpdateEvent = () =>
  useAct(
    ({ id, ...patch }: Partial<TaskEvent> & { id: string }) =>
      mockApi.updateEvent(id, patch),
    "Event saved",
  );
export const useSetEventStatus = () =>
  useAct(({ id, status }: { id: string; status: TaskEvent["status"] }) =>
    mockApi.setEventStatus(id, status),
  );
export const useDeleteEvent = () =>
  useAct((id: string) => mockApi.deleteEvent(id), "Event deleted");

// ---- categories ----
export const useCreateCategory = () =>
  useAct((v: CategoryInput) => mockApi.createCategory(v), "Category created");
export const useUpdateCategory = () =>
  useAct(
    ({ id, ...patch }: Partial<CategoryInput> & { id: string }) =>
      mockApi.updateCategory(id, patch),
    "Category saved",
  );
export const useDeleteCategory = () =>
  useAct((id: string) => mockApi.deleteCategory(id), "Category deleted");

// ---- people ----
export const useCreatePerson = () =>
  useAct((v: PersonInput) => mockApi.createPerson(v), "Person added");
export const useUpdatePerson = () =>
  useAct(
    ({ id, ...patch }: Partial<PersonInput> & { id: string }) =>
      mockApi.updatePerson(id, patch),
    "Saved",
  );
export const useDeletePerson = () =>
  useAct((id: string) => mockApi.deletePerson(id), "Person removed");

// ---- tasks ----
export const useCreateTask = () =>
  useAct((v: TaskInput) => mockApi.createTask(v), "Task added");
export const useUpdateTask = () =>
  useAct(
    ({ id, ...patch }: Partial<TaskInput> & { id: string }) =>
      mockApi.updateTask(id, patch),
    "Task saved",
  );
export const useDeleteTask = () =>
  useAct((id: string) => mockApi.deleteTask(id), "Task deleted");
export const useToggleSubtask = () =>
  useAct(({ taskId, subtaskId }: { taskId: string; subtaskId: string }) =>
    mockApi.toggleSubtask(taskId, subtaskId),
  );
export const useSnoozeTask = () =>
  useAct(({ id, until }: { id: string; until: string | null }) =>
    mockApi.snoozeTask(id, until),
  );

/** Status change with an Undo toast; marking done records the finish time. */
export function useSetTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: TaskStatus;
      prev?: TaskStatus;
    }) => mockApi.setTaskStatus(id, status),
    onSuccess: (task, { id, status, prev }) => {
      if (status === "done" && prev && prev !== "done") {
        toast.success("Marked as done", {
          description: task.title,
          action: {
            label: "Undo",
            onClick: () =>
              mockApi
                .setTaskStatus(id, prev)
                .then(() => qc.invalidateQueries({ queryKey: keys.all })),
          },
        });
      }
    },
    onError: (e) => toast.error((e as Error).message),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

// ---- settings & log ----
export const useUpdateSettings = () =>
  useAct((patch: Partial<Settings>) => mockApi.updateSettings(patch));
export const useMarkLogRead = () => useAct(() => mockApi.markLogRead());
export const useClearLog = () => useAct(() => mockApi.clearLog(), "Cleared");

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
