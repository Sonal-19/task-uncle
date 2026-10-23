/// <reference lib="webworker" />
import { createStore, get, set } from "idb-keyval";
import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import {
  type PushPayload,
  planReminders,
  toPushPayload,
} from "$/lib/shared/reminder-engine";
import type { Category, Settings, Task, TaskEvent } from "$/lib/shared/types";

declare let self: ServiceWorkerGlobalScope;

// A new version waits until the app says so ("Reload" in the update
// toast, or by itself once the app is in the background and synced).
self.addEventListener("message", (event) => {
  if ((event.data as { type?: string } | null)?.type === "SKIP_WAITING")
    void self.skipWaiting();
});
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA: serve index.html for app routes (not /api).
try {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL("/index.html"), {
      denylist: [/^\/api/],
    }),
  );
} catch {
  // index.html is not precached in dev.
}

const windows = () =>
  self.clients.matchAll({ type: "window", includeUncontrolled: true });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Draws a reminder. Task reminders carry Mark done / Snooze buttons. */
function show(p: PushPayload) {
  const taskId = p.taskId && UUID.test(p.taskId) ? p.taskId : null;
  return self.registration.showNotification(p.title, {
    body: p.body,
    tag: p.tag,
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    renotify: true,
    requireInteraction: !!taskId,
    data: { taskId },
    actions: taskId
      ? [
          { action: "done", title: "✓ Mark done" },
          { action: "snooze", title: "Snooze 1h" },
        ]
      : undefined,
  } as NotificationOptions);
}

/**
 * Server reminders (Web Push). The API sends data only, so this worker
 * draws the notification — the same pattern as myasta's push-sw.js. The
 * push service keeps the message while the device is offline and delivers
 * it when it reconnects (or drops it after an hour; a fresh one follows).
 */
self.addEventListener("push", (event) => {
  let p: PushPayload | null = null;
  try {
    p = event.data?.json() as PushPayload;
  } catch {
    return;
  }
  if (!p?.title) return;
  const payload = p;
  event.waitUntil(
    (async () => {
      // Open tabs refresh their bell and reminder times.
      for (const c of await windows()) c.postMessage({ type: "push-received" });
      await show(payload);
    })(),
  );
});

/** Applies Mark done / Snooze straight through the API (the session cookie
 * goes with it), for when no tab is open. */
async function applyDirect(taskId: string, action: string) {
  const body =
    action === "done"
      ? { status: "done" }
      : { snoozedUntil: new Date(Date.now() + 3_600_000).toISOString() };
  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Reminder taps. "done" / "snooze" go to an open tab (it queues them, so
 * they work offline) without focusing it; with no tab open they are sent to
 * the API directly, and only if that fails (offline, logged out) is the app
 * opened with the action in the URL. A plain tap focuses the app on the task.
 */
self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const raw = (n.data as { taskId?: string | null } | null)?.taskId ?? null;
  const taskId = raw && UUID.test(raw) ? raw : null;
  const action = event.action || "";
  n.close();

  event.waitUntil(
    (async () => {
      const win = (await windows())[0] as WindowClient | undefined;
      if (win) {
        if (taskId) win.postMessage({ type: "task-action", taskId, action });
        if (!action) await win.focus();
        if (!taskId && !action) await win.navigate("/dashboard");
        return;
      }
      if (taskId && action && (await applyDirect(taskId, action))) return;
      const url = taskId
        ? `/tasks?task=${taskId}${action ? `&action=${action}` : ""}`
        : "/dashboard";
      await self.clients.openWindow(url);
    })(),
  );
});

/* ---------------- offline background check (Chrome, installed) ---------------- */

// Same IndexedDB store the app keeps its offline data in (lib/offline/idb.ts).
const store = createStore("task-uncle", "kv");
/** taskId → when this worker last reminded about it. */
const SEEN_KEY = "sw-reminded";

type PersistedCache = {
  clientState?: {
    queries?: { queryKey: unknown[]; state: { data?: unknown } }[];
  };
};

/**
 * Periodic Background Sync wakes the worker now and then (the browser picks
 * how often), network or not. It reminds from the tasks the app last saved
 * on the device — unless an app window is open (its own engine does it) or
 * the server is reachable and sending this user's reminders by push.
 */
async function backgroundCheck() {
  const open = (await windows()) as WindowClient[];
  if (open.some((w) => w.visibilityState === "visible")) return;
  const cache = (await get("query-cache", store)) as PersistedCache | undefined;
  const queries = cache?.clientState?.queries ?? [];
  const data = <T>(k: string) =>
    queries.find((q) => q.queryKey[0] === "tu" && q.queryKey[1] === k)?.state
      .data as T | undefined;
  const tasks = data<Task[]>("tasks");
  const settings = data<Settings>("settings");
  if (!tasks || !settings) return; // logged out, or never loaded
  const push = data<{ devices: number }>("push");
  if ((push?.devices ?? 0) > 0 && self.navigator.onLine) return;

  const seen = ((await get(SEEN_KEY, store)) ?? {}) as Record<string, string>;
  const later = (a: string | null, b?: string) => (!b || (a && a > b) ? a : b);
  const merged = tasks.map((t) => ({
    ...t,
    lastRemindedAt: later(t.lastRemindedAt, seen[t.id]) ?? null,
  }));
  const names = new Map(
    [
      ...(data<TaskEvent[]>("events") ?? []),
      ...(data<Category[]>("categories") ?? []),
    ].map((r) => [r.id, r.name]),
  );
  const now = new Date();
  const { due, entries } = planReminders(
    merged,
    settings,
    (t) =>
      [names.get(t.eventId), names.get(t.categoryId)]
        .filter(Boolean)
        .join(" · "),
    now,
  );
  if (!due.length) return;
  for (const e of entries) await show(toPushPayload(e));
  const ids = new Set(tasks.map((t) => t.id));
  const next: Record<string, string> = {};
  for (const [id, at] of Object.entries(seen)) if (ids.has(id)) next[id] = at;
  for (const t of due) next[t.id] = now.toISOString();
  await set(SEEN_KEY, next, store);
}

self.addEventListener("periodicsync", ((
  event: ExtendableEvent & { tag: string },
) => {
  if (event.tag === "tu-reminders") event.waitUntil(backgroundCheck());
}) as EventListener);
