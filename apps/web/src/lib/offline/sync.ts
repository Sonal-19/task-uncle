import { toast } from "sonner";
import { queryClient as qc } from "@/integrations/tanstack-query/root-provider";
import { ApiError, api, call } from "@/lib/api";
import { fetchers } from "@/lib/fetchers";
import { DATA_KEYS, keys } from "@/lib/query-keys";
import { type DataState, newId } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { applyOp, type LocalState } from "./apply";
import { clearOfflineStore } from "./idb";
import { type Op, type OpData, opTargetId, useOutbox } from "./outbox";

const outbox = () => useOutbox.getState();
const uuid = newId;

/* =========================== the local copy =========================== */

/** The cached collections (undefined = not loaded yet). */
export function readLocal(): LocalState {
  const s: LocalState = {};
  for (const k of DATA_KEYS)
    (s as Record<string, unknown>)[k] = qc.getQueryData(keys[k]);
  return s;
}

function writeLocal(prev: LocalState, next: LocalState) {
  for (const k of DATA_KEYS)
    if (next[k] !== undefined && next[k] !== prev[k])
      qc.setQueryData(keys[k], next[k]);
}

/** Shows an op's effect right away. */
function applyLocal(op: OpData & { at: string }) {
  const prev = readLocal();
  writeLocal(prev, applyOp(prev, op));
}

/* ============================== enqueue ============================== */

/**
 * Queues a change: shows it at once, then sends it in the background. Edits
 * to a row that hasn't been sent yet fold into the queued op, and deleting
 * a row that only exists on this device just drops its ops.
 */
export function queue(data: OpData, label: string) {
  const at = new Date().toISOString();
  applyLocal({ ...data, at });

  const id = opTargetId(data);
  const { ops, inFlight } = outbox();
  const unsent = (o: Op) => o.opId !== inFlight && opTargetId(o) === id;
  const entity = data.kind.split(".")[0] ?? "";
  const create = id
    ? ops.find((o) => unsent(o) && o.kind === `${entity}.create`)
    : undefined;
  const edit = id
    ? ops.find(
        (o) =>
          unsent(o) && o.kind === `${entity}.update` && o.status === "pending",
      )
    : undefined;

  if (data.kind.endsWith(".update") && create && "row" in create) {
    // Still only on this device: the create sends the edited row (and a
    // refused one goes again with the fix).
    const coll = collectionOf(entity);
    const alone = { [coll]: [create.row], categories: readLocal().categories };
    const row = (applyOp(alone as LocalState, { ...data, at })[coll] ?? [])[0];
    replaceOp(create.opId, {
      row,
      status: "pending",
      error: undefined,
    } as Partial<Op>);
    return;
  }
  if (
    data.kind.endsWith(".update") &&
    edit &&
    "patch" in edit &&
    "patch" in data
  ) {
    replaceOp(edit.opId, {
      patch: { ...edit.patch, ...data.patch },
      at,
      label,
    } as Partial<Op>);
    return;
  }
  if (data.kind.endsWith(".delete") && id) {
    if (create) {
      dropLocal(id);
      return;
    }
    if (edit)
      outbox().update((list) => list.filter((o) => o.opId !== edit.opId));
  }
  push(data, label, at);
}

function collectionOf(entity: string) {
  const map = {
    event: "events",
    category: "categories",
    person: "people",
    task: "tasks",
  } as const;
  return map[entity as keyof typeof map];
}

function push(data: OpData, label: string, at: string) {
  const op = { ...data, opId: uuid(), at, label, status: "pending" } as Op;
  outbox().update((ops) => [...ops, op]);
  scheduleFlush(0);
  return op;
}

function replaceOp(opId: string, patch: Partial<Op>) {
  outbox().update((ops) =>
    ops.map((o) => (o.opId === opId ? ({ ...o, ...patch } as Op) : o)),
  );
  scheduleFlush(0);
}

/** Drops every unsent op about a row that never reached the server, and
 * the creates of rows inside it (tasks in a new category…). */
function dropLocal(id: string) {
  const inFlight = outbox().inFlight;
  outbox().update((ops) =>
    ops.filter((o) => {
      if (o.opId === inFlight) return true;
      if (opTargetId(o) === id) return false;
      if ("row" in o) {
        const r = o.row as { eventId?: string; categoryId?: string };
        if (r.eventId === id || r.categoryId === id) return false;
      }
      return true;
    }),
  );
}

/** The server's `updatedAt` of a cached row (the conflict-check base). */
export function baseOf(
  coll: "events" | "categories" | "people" | "tasks",
  id: string,
) {
  const list = qc.getQueryData<{ id: string; updatedAt: string }[]>(keys[coll]);
  return list?.find((r) => r.id === id)?.updatedAt ?? null;
}

/* =============================== send =============================== */

/** The session ended mid-flush: stop sending (ops are kept). */
class Unauthorized extends Error {}

const later = (a: string | null | undefined, b: string | null | undefined) =>
  !a ? (b ?? undefined) : !b ? a : a > b ? a : b;

function editMeta(
  op: Op & { base: string | null },
  entity: string,
  id: string,
) {
  if (op.force) return {};
  return {
    baseUpdatedAt: later(op.base, outbox().confirmed[`${entity}:${id}`]),
    editedAt: op.at,
  };
}

function rememberVersion(entity: string, id: string, updatedAt?: string) {
  if (!updatedAt) return;
  useOutbox.setState((s) => ({
    confirmed: { ...s.confirmed, [`${entity}:${id}`]: updatedAt },
  }));
}

async function send(op: Op) {
  switch (op.kind) {
    case "event.create": {
      const { id, name, description, color, icon, dueDate } = op.row;
      const row = await call(
        api.events.post({ id, name, description, color, icon, dueDate }),
      );
      return rememberVersion("event", id, row?.updatedAt);
    }
    case "event.update": {
      const row = await call(
        api
          .events({ id: op.id })
          .patch({ ...op.patch, ...editMeta(op, "event", op.id) }),
      );
      return rememberVersion("event", op.id, row?.updatedAt);
    }
    case "event.delete":
      return void (await call(api.events({ id: op.id }).delete()));

    case "category.create": {
      const { id, eventId, name, icon, color, memberIds } = op.row;
      const row = await call(
        api.categories.post({ id, eventId, name, icon, color, memberIds }),
      );
      return rememberVersion("category", id, row?.updatedAt);
    }
    case "category.update": {
      const row = await call(
        api
          .categories({ id: op.id })
          .patch({ ...op.patch, ...editMeta(op, "category", op.id) }),
      );
      return rememberVersion("category", op.id, row?.updatedAt);
    }
    case "category.delete":
      return void (await call(api.categories({ id: op.id }).delete()));

    case "person.create": {
      const { id, name, role, phone, note } = op.row;
      const row = await call(api.people.post({ id, name, role, phone, note }));
      return rememberVersion("person", id, row?.updatedAt);
    }
    case "person.update": {
      const row = await call(
        api
          .people({ id: op.id })
          .patch({ ...op.patch, ...editMeta(op, "person", op.id) }),
      );
      return rememberVersion("person", op.id, row?.updatedAt);
    }
    case "person.delete":
      return void (await call(api.people({ id: op.id }).delete()));

    case "task.create": {
      const r = op.row;
      const row = await call(
        api.tasks.post({
          id: r.id,
          eventId: r.eventId,
          categoryId: r.categoryId,
          title: r.title,
          notes: r.notes,
          status: r.status,
          priority: r.priority,
          dueDate: r.dueDate,
          dueTime: r.dueTime,
          assigneeId: r.assigneeId,
          amount: r.amount,
          subtasks: r.subtasks,
          reminder: r.reminder,
          reminderMinutes: r.reminderMinutes,
          repeat: r.repeat,
          repeatEvery: r.repeatEvery,
          repeatDays: r.repeatDays,
          repeatStart: r.repeatStart,
          repeatTime: r.repeatTime,
          doneDates: r.doneDates,
          editedAt: op.at,
        }),
      );
      return rememberVersion("task", r.id, row?.updatedAt);
    }
    case "task.update": {
      const row = await call(
        api
          .tasks({ id: op.id })
          .patch({ ...op.patch, ...editMeta(op, "task", op.id) }),
      );
      return rememberVersion("task", op.id, row?.updatedAt);
    }
    case "task.delete":
      return void (await call(api.tasks({ id: op.id }).delete()));
    case "task.reminded":
      return void (await call(
        api.tasks.reminded.post({ ids: op.ids, at: op.at }),
      ));

    case "settings.update":
      return void (await call(api.settings.patch(op.patch)));

    case "log.add":
      return void (await call(
        api.log.post({
          entries: op.entries.map(({ readAt: _r, ...e }) => e),
        }),
      ));
    case "log.read":
      return void (await call(api.log.read.post({ at: op.at })));
    case "log.clear":
      return void (await call(api.log.delete()));
  }
}

/** A newer change from another device was kept; offer to apply this one anyway. */
function conflictStale(op: Op) {
  toast.warning("Kept a newer change made on another device", {
    description: op.label,
    duration: 12_000,
    action: {
      label: "Use mine",
      onClick: () => {
        outbox().update((ops) => [
          ...ops,
          {
            ...op,
            opId: uuid(),
            force: true,
            status: "pending",
            error: undefined,
          },
        ]);
        applyLocal(op);
        scheduleFlush(0);
      },
    },
  });
}

/* =============================== engine =============================== */

let running = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let backoff = 2_000;

export function scheduleFlush(delay = backoff) {
  clearTimeout(timer);
  timer = setTimeout(() => void flush(), delay);
}

/** Other tabs of the app refetch when this one has pushed changes. */
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("tu-sync")
    : null;

/** Sends queued ops one by one, in order, until the queue is empty or the
 * network drops. Order matters: a task's create needs its category's. */
export async function flush() {
  const s = outbox();
  if (running || !s.hydrated || !useAuthStore.getState().user) return;
  if (!navigator.onLine) {
    s.set({ online: false });
    return;
  }
  running = true;
  s.set({ syncing: true });
  let sent = 0;
  try {
    for (;;) {
      const op = outbox().ops.find((o) => o.status === "pending");
      if (!op) break;
      outbox().set({ inFlight: op.opId });
      try {
        await send(op);
        sent++;
        outbox().set({ online: true });
        outbox().update((ops) => ops.filter((o) => o.opId !== op.opId));
        backoff = 2_000;
      } catch (e) {
        const err = e as ApiError | Error;
        if (err instanceof ApiError && err.isNetwork) {
          // Offline or the server is down: keep everything, try again later.
          outbox().set({ online: false });
          backoff = Math.min(backoff * 2, 60_000);
          scheduleFlush();
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          // Logged out elsewhere: keep the changes for when they log back in.
          sessionExpired();
          throw new Unauthorized();
        }
        if (err instanceof ApiError && err.status === 409 && "base" in op) {
          outbox().update((ops) => ops.filter((o) => o.opId !== op.opId));
          conflictStale(op);
          sent++;
          continue;
        }
        // The server refused it (deleted category, invalid value…): park it
        // for the user to retry or discard, and carry on with the rest.
        outbox().update((ops) =>
          ops.map((o) =>
            o.opId === op.opId
              ? { ...o, status: "failed", error: err.message }
              : o,
          ),
        );
        toast.error(`Couldn't save: ${op.label}`, {
          description: err.message,
          duration: 10_000,
        });
      }
    }
  } catch (e) {
    if (!(e instanceof Unauthorized)) throw e;
    return;
  } finally {
    running = false;
    outbox().set({ syncing: false, inFlight: null, confirmed: stillNeeded() });
  }
  if (sent) channel?.postMessage("synced");
  if (sent || !outbox().lastSyncedAt) await refresh();
}

/** Confirmed versions only matter while the cache may show an older copy. */
function stillNeeded() {
  const entries = Object.entries(outbox().confirmed);
  return entries.length > 300
    ? Object.fromEntries(
        entries.sort(([, a], [, b]) => b.localeCompare(a)).slice(0, 300),
      )
    : outbox().confirmed;
}

/** Pulls fresh data for everything (after pushing changes). */
export async function refresh() {
  await qc.invalidateQueries({ queryKey: keys.all });
  if (!outbox().ops.some((o) => o.status === "pending"))
    outbox().set({ lastSyncedAt: Date.now() });
}

/** Push then pull: the "Sync now" button. */
export async function syncNow() {
  await flush();
  if (navigator.onLine) await refresh();
}

export function retryOp(opId: string) {
  replaceOp(opId, { status: "pending", error: undefined });
  void flush();
}

/** Throws a queued change away and puts the screens back to server data. */
export function discardOp(opId: string) {
  const op = outbox().ops.find((o) => o.opId === opId);
  if (!op) return;
  const id = opTargetId(op);
  if (op.kind.endsWith(".create") && id) dropLocal(id);
  outbox().update((ops) => ops.filter((o) => o.opId !== opId));
  void refresh();
}

/** Drops every queued change (before a restore replaces all the data). */
export function discardAll() {
  outbox().set({ ops: [], confirmed: {} });
}

function sessionExpired() {
  if (!useAuthStore.getState().user) return;
  useAuthStore.getState().clearUser();
  toast.error("Your session ended. Log in again.", {
    description: outbox().ops.length
      ? "Your unsynced changes are kept and go out after you log in."
      : undefined,
  });
}

let started = false;

/** Starts the engine once: sync on load, when the connection returns, when
 * the tab comes back, and every 30s while anything is waiting. */
export function startSync() {
  if (started) return;
  started = true;

  // Fresh server data has pending local changes replayed on top of it.
  qc.getQueryCache().subscribe((event) => {
    if (event.type !== "updated") return;
    const { action } = event;
    if (action.type === "error") {
      const err = action.error;
      if (err instanceof ApiError && err.status === 401) sessionExpired();
      // "Online" means the server answers, not just that there's a network.
      else if (err instanceof ApiError && err.isNetwork && outbox().online) {
        outbox().set({ online: false });
        scheduleFlush();
      }
      return;
    }
    if (action.type !== "success" || action.manual) return;
    if (!outbox().online) outbox().set({ online: true });
    const k = DATA_KEYS.find((d) => keys[d][1] === event.query.queryKey[1]);
    const { ops } = outbox();
    if (k && ops.length) {
      const prev = readLocal();
      writeLocal(prev, ops.reduce(applyOp, prev));
    } else if (!ops.length && !outbox().syncing)
      outbox().set({ lastSyncedAt: Date.now() });
  });

  const online = () => {
    outbox().set({ online: true });
    backoff = 2_000;
    void syncNow();
  };
  window.addEventListener("online", online);
  window.addEventListener("offline", () => outbox().set({ online: false }));
  // Back to the app (phones pause installed apps rather than closing them):
  // push anything waiting and pick up changes from other devices.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const last = outbox().lastSyncedAt ?? 0;
    if (outbox().ops.length || Date.now() - last > 30_000) void syncNow();
  });
  channel?.addEventListener("message", () => void refresh());
  setInterval(() => {
    if (outbox().ops.some((o) => o.status === "pending")) void flush();
  }, 30_000);

  const go = () => void flush();
  if (outbox().hydrated) go();
  else {
    const unsub = useOutbox.subscribe((s) => {
      if (s.hydrated) {
        unsub();
        go();
      }
    });
  }
}

/** Unsynced changes, for the logout warning. */
export const pendingCount = () => outbox().ops.length;

/** Everything as this device sees it (backup export works offline). */
export async function localSnapshot(): Promise<DataState> {
  const get = <T>(k: (typeof DATA_KEYS)[number], fn: () => Promise<T>) =>
    qc.ensureQueryData({ queryKey: keys[k], queryFn: fn });
  const [events, categories, people, tasks, settings, log] = await Promise.all([
    get("events", fetchers.events),
    get("categories", fetchers.categories),
    get("people", fetchers.people),
    get("tasks", fetchers.tasks),
    get("settings", fetchers.settings),
    get("log", fetchers.log),
  ]);
  return { events, categories, people, tasks, settings, log };
}

/* ============================ device data ============================ */

/** Resolves once the outbox has loaded from IndexedDB. */
const hydrated = () =>
  new Promise<void>((resolve) => {
    if (useOutbox.persist.hasHydrated()) resolve();
    else {
      const unsub = useOutbox.persist.onFinishHydration(() => {
        unsub();
        resolve();
      });
    }
  });

/** Called with the logged-in user: data kept for someone else is dropped. */
export async function claimDevice(userId: number) {
  await hydrated();
  const { ownerId } = outbox();
  if (ownerId === userId) return void flush();
  if (ownerId !== null) {
    useOutbox.setState({ ops: [], confirmed: {}, lastSyncedAt: null });
    qc.removeQueries({ queryKey: keys.all });
  }
  useOutbox.setState({ ownerId: userId });
  void flush();
}

/** Logout: nothing about this account stays on the device. */
export async function forgetDevice() {
  useOutbox.setState({
    ops: [],
    confirmed: {},
    ownerId: null,
    lastSyncedAt: null,
  });
  qc.clear();
  await clearOfflineStore();
}
