import { type DataState, kindOf, placeTask, statusPatch } from "@/lib/types";
import type { OpData } from "./outbox";

/** Whatever part of the data is in the query cache right now. */
export type LocalState = Partial<DataState>;

type Row = { id: string };
const upsert = <T extends Row>(list: T[], row: T, prepend = false) =>
  list.some((x) => x.id === row.id)
    ? list.map((x) => (x.id === row.id ? row : x))
    : prepend
      ? [row, ...list]
      : [...list, row];
const patchRow = <T extends Row>(list: T[], id: string, fn: (r: T) => T) =>
  list.map((x) => (x.id === id ? fn(x) : x));

/**
 * What an op does to the data, mirroring the API (cascades, `kind`,
 * `statusPatch`, `completedAt`). Ops are deterministic (`at` is the op's own
 * time) and idempotent, so pending ops can be replayed on top of fresh server
 * data any number of times. Collections that aren't loaded stay undefined.
 * Optimistic edits keep the server's `updatedAt` (the conflict-check base).
 */
export function applyOp(
  s: LocalState,
  op: OpData & { at: string },
): LocalState {
  const { events, categories, people, tasks, log } = s;
  switch (op.kind) {
    case "event.create":
      return { ...s, events: events && upsert(events, op.row) };
    case "event.update":
      return {
        ...s,
        events:
          events &&
          patchRow(events, op.id, (e) => ({
            ...e,
            ...op.patch,
            ...(op.patch.status &&
              op.patch.status !== e.status && {
                archivedAt: op.patch.status === "archived" ? op.at : null,
              }),
          })),
      };
    case "event.delete":
      return {
        ...s,
        events: events?.filter((e) => e.id !== op.id),
        categories: categories?.filter((c) => c.eventId !== op.id),
        tasks: tasks?.filter((t) => t.eventId !== op.id),
      };

    case "category.create":
      return {
        ...s,
        categories:
          categories &&
          upsert(categories, { ...op.row, kind: kindOf(op.row.memberIds) }),
      };
    case "category.update": {
      const moveTo = op.patch.eventId;
      return {
        ...s,
        categories:
          categories &&
          patchRow(categories, op.id, (c) => {
            const next = { ...c, ...op.patch };
            return { ...next, kind: kindOf(next.memberIds) };
          }),
        // A category's tasks always live in its event.
        tasks:
          tasks && moveTo
            ? tasks.map((t) =>
                t.categoryId === op.id ? { ...t, eventId: moveTo } : t,
              )
            : tasks,
      };
    }
    case "category.delete":
      return {
        ...s,
        categories: categories?.filter((c) => c.id !== op.id),
        tasks: tasks?.filter((t) => t.categoryId !== op.id),
      };

    case "person.create":
      return { ...s, people: people && upsert(people, op.row) };
    case "person.update":
      return {
        ...s,
        people:
          people && patchRow(people, op.id, (p) => ({ ...p, ...op.patch })),
      };
    case "person.delete":
      return {
        ...s,
        people: people?.filter((p) => p.id !== op.id),
        categories: categories?.map((c) => {
          if (!c.memberIds.includes(op.id)) return c;
          const memberIds = c.memberIds.filter((m) => m !== op.id);
          return { ...c, memberIds, kind: kindOf(memberIds) };
        }),
        tasks: tasks?.map((t) =>
          t.assigneeId === op.id ? { ...t, assigneeId: null } : t,
        ),
      };

    case "task.create":
      return { ...s, tasks: tasks && upsert(tasks, op.row, true) };
    case "task.update":
      return {
        ...s,
        tasks:
          tasks &&
          patchRow(tasks, op.id, (t) => {
            const { status, ...rest } = op.patch;
            const next = {
              ...t,
              ...rest,
              ...(status ? statusPatch(t, status, op.at) : {}),
            };
            if (!next.dueDate) next.dueTime = null;
            // Same rule as the API: a category decides the event.
            if (rest.categoryId !== undefined || rest.eventId !== undefined)
              Object.assign(
                next,
                placeTask(
                  t,
                  rest,
                  (id) => categories?.find((c) => c.id === id)?.eventId,
                ),
              );
            return next;
          }),
      };
    case "task.delete":
      return { ...s, tasks: tasks?.filter((t) => t.id !== op.id) };
    case "task.reminded": {
      const ids = new Set(op.ids);
      return {
        ...s,
        tasks: tasks?.map((t) =>
          ids.has(t.id) ? { ...t, lastRemindedAt: op.at } : t,
        ),
      };
    }

    case "settings.update":
      return { ...s, settings: s.settings && { ...s.settings, ...op.patch } };

    case "log.add": {
      if (!log) return s;
      const have = new Set(log.map((l) => l.id));
      const fresh = op.entries.filter((e) => !have.has(e.id));
      return {
        ...s,
        log: fresh.length ? [...fresh, ...log].slice(0, 200) : log,
      };
    }
    case "log.read":
      return {
        ...s,
        log: log?.map((l) => (l.readAt ? l : { ...l, readAt: op.at })),
      };
    case "log.clear":
      return { ...s, log: log && [] };
  }
}
