import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Category,
  NotificationLog,
  Person,
  Settings,
  Task,
  TaskEvent,
} from "@/lib/types";
import { idbStorage } from "./idb";

// The outbox: every change lands here first, is shown straight away by
// patching the query cache (apply.ts), and is sent to the server in order by
// the sync engine (sync.ts). It lives in IndexedDB, so changes made offline
// survive a reload or a closed tab and go out when the connection is back -
// the same local-first model as finance-tracker. Rows get their UUID on the
// device, so there are no temporary ids to swap after a create.

export type EventPatch = Partial<
  Pick<
    TaskEvent,
    "name" | "description" | "color" | "icon" | "dueDate" | "status"
  >
>;
export type CategoryPatch = Partial<
  Pick<Category, "eventId" | "name" | "icon" | "color" | "memberIds">
>;
export type PersonPatch = Partial<
  Pick<Person, "name" | "role" | "phone" | "note">
>;
export type TaskPatch = Partial<
  Pick<
    Task,
    | "eventId"
    | "categoryId"
    | "title"
    | "notes"
    | "status"
    | "priority"
    | "dueDate"
    | "dueTime"
    | "assigneeId"
    | "amount"
    | "subtasks"
    | "reminder"
    | "reminderMinutes"
    | "repeat"
    | "repeatTime"
    | "doneDates"
    | "snoozedUntil"
  >
>;

/** `base` = the row's `updatedAt` from the server when the edit was made
 * (optimistic copies keep the server's), for the "changed elsewhere?" check. */
export type OpData =
  | { kind: "event.create"; row: TaskEvent }
  | { kind: "event.update"; id: string; patch: EventPatch; base: string | null }
  | { kind: "event.delete"; id: string }
  | { kind: "category.create"; row: Category }
  | {
      kind: "category.update";
      id: string;
      patch: CategoryPatch;
      base: string | null;
    }
  | { kind: "category.delete"; id: string }
  | { kind: "person.create"; row: Person }
  | {
      kind: "person.update";
      id: string;
      patch: PersonPatch;
      base: string | null;
    }
  | { kind: "person.delete"; id: string }
  | { kind: "task.create"; row: Task }
  | { kind: "task.update"; id: string; patch: TaskPatch; base: string | null }
  | { kind: "task.delete"; id: string }
  /** The reminder engine notified about these (not an edit). */
  | { kind: "task.reminded"; ids: string[]; at: string }
  | { kind: "settings.update"; patch: Partial<Settings> }
  | { kind: "log.add"; entries: NotificationLog[] }
  | { kind: "log.read"; at: string }
  | { kind: "log.clear" };

export type Op = OpData & {
  opId: string;
  /** When the user made the change (sent as `editedAt` on edits). */
  at: string;
  /** Short description for the sync panel, e.g. "Add task: Buy domain". */
  label: string;
  status: "pending" | "failed";
  error?: string;
  /** Send without the conflict check ("Use mine" after a conflict). */
  force?: boolean;
};

interface OutboxState {
  ops: Op[];
  /** `entity:id` → the `updatedAt` the server gave this device's own last
   * write of that row, so the next edit isn't taken for someone else's. */
  confirmed: Record<string, string>;
  /** Whose changes these are; another login clears them. */
  ownerId: number | null;
  /** Last time this device had everything pushed and fresh data pulled. */
  lastSyncedAt: number | null;
  /** Not persisted: */
  online: boolean;
  syncing: boolean;
  inFlight: string | null;
  hydrated: boolean;
  set: (patch: Partial<OutboxState>) => void;
  update: (fn: (ops: Op[]) => Op[]) => void;
}

export const useOutbox = create<OutboxState>()(
  persist(
    (set) => ({
      ops: [],
      confirmed: {},
      ownerId: null,
      lastSyncedAt: null,
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      syncing: false,
      inFlight: null,
      hydrated: false,
      set: (patch) => set(patch),
      update: (fn) => set((s) => ({ ops: fn(s.ops) })),
    }),
    {
      name: "outbox",
      storage: idbStorage(),
      partialize: (s) =>
        ({
          ops: s.ops,
          confirmed: s.confirmed,
          ownerId: s.ownerId,
          lastSyncedAt: s.lastSyncedAt,
        }) as OutboxState,
      onRehydrateStorage: () => () => useOutbox.setState({ hydrated: true }),
    },
  ),
);

/** The row an op is about (null for settings / log / reminder stamps). */
export function opTargetId(op: OpData): string | null {
  if ("row" in op) return op.row.id;
  if ("id" in op) return op.id;
  return null;
}
