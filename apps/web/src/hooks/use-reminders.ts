import { useNavigate } from "@tanstack/react-router";
import { addHours } from "date-fns";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  addLog,
  markReminded,
  setTaskStatus,
  snoozeTask,
  updateSettings,
  useSettings,
} from "@/hooks/use-data";
import { queryClient as qc } from "@/integrations/tanstack-query/root-provider";
import { fetchers } from "@/lib/fetchers";
import { useOutbox } from "@/lib/offline/outbox";
import { refresh } from "@/lib/offline/sync";
import type { PushConfig } from "@/lib/push";
import { keys } from "@/lib/query-keys";
import { permission, showNotification } from "@/lib/reminders/notify";
import { planReminders } from "@/lib/reminders/reminder-engine";
import type { Category, Task, TaskEvent } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

const CHECK_EVERY = 60_000;

/** The API's scheduler sends this user's reminders by Web Push while it is
 * reachable and at least one of their browsers is subscribed; this engine
 * then stands down (no double reminders) and takes over offline. */
export function serverReminds() {
  const devices = qc.getQueryData<PushConfig>(keys.push)?.devices ?? 0;
  return devices > 0 && navigator.onLine && useOutbox.getState().online;
}

function label(t: Task) {
  const ev = qc
    .getQueryData<TaskEvent[]>(keys.events)
    ?.find((e) => e.id === t.eventId)?.name;
  const cat = qc
    .getQueryData<Category[]>(keys.categories)
    ?.find((c) => c.id === t.categoryId)?.name;
  return [ev, cat].filter(Boolean).join(" · ");
}

/** The data the engine reads: cached (works offline), fetched if missing. */
async function load() {
  const [tasks, settings] = await Promise.all([
    qc.ensureQueryData({ queryKey: keys.tasks, queryFn: fetchers.tasks }),
    qc.ensureQueryData({ queryKey: keys.settings, queryFn: fetchers.settings }),
  ]);
  // Only for the notification text.
  await Promise.all([
    qc.ensureQueryData({ queryKey: keys.events, queryFn: fetchers.events }),
    qc.ensureQueryData({
      queryKey: keys.categories,
      queryFn: fetchers.categories,
    }),
  ]).catch(() => {});
  return { tasks, settings };
}

/** One pass of the in-app engine: stamp `lastRemindedAt`, then notify.
 * `force` treats every pending task as due (Settings → Remind me now). */
export async function runReminderCheck(now = new Date(), force = false) {
  const data = await load().catch(() => null);
  if (!data) return 0;
  const { settings } = data;
  const tasks = force
    ? data.tasks.map((t) => ({
        ...t,
        lastRemindedAt: new Date(0).toISOString(),
      }))
    : data.tasks;
  // The admin turned reminders off for this account.
  if (useAuthStore.getState().user?.notifyPermission === "off") return 0;
  if (!force && serverReminds()) return 0;
  const { due, entries } = planReminders(tasks, settings, label, now);
  if (!due.length) return 0;

  markReminded(
    due.map((t) => t.id),
    now.toISOString(),
  );
  addLog(entries);

  if (permission() === "granted") {
    for (const e of entries)
      await showNotification({
        title: e.title,
        body: e.body,
        tag: e.taskId ? `task-${e.taskId}` : "summary",
        taskId: e.taskId ?? undefined,
        requireInteraction: !!e.taskId,
      });
  } else if (document.visibilityState === "visible") {
    // No permission: at least nudge inside the app.
    toast.warning(entries[0]?.title ?? "Pending work", {
      description: "Allow notifications to get reminders outside the app.",
    });
  }
  return due.length;
}

/** Mounted once in the app shell: runs the engine (in one tab only) and
 * applies Mark done / Snooze taps coming from the service worker. */
export function useReminders() {
  const navigate = useNavigate();

  // The server reminds by this browser's clock: quiet hours and due times
  // are wall-clock times, so tell it the timezone (once, and on a change).
  const savedZone = useSettings().data?.timezone;
  const loaded = useSettings().isSuccess;
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (loaded && zone && savedZone !== zone)
      updateSettings({ timezone: zone });
  }, [loaded, savedZone]);

  useEffect(() => {
    let first: ReturnType<typeof setTimeout> | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => void runReminderCheck();
    const onVisible = () => document.visibilityState === "visible" && tick();
    const run = () => {
      first = setTimeout(tick, 4000);
      timer = setInterval(tick, CHECK_EVERY);
      document.addEventListener("visibilitychange", onVisible);
    };

    // Several tabs open: only the one holding the lock reminds, so nothing
    // is notified or logged twice. When it closes, the next tab takes over.
    const stop = new AbortController();
    let release: (() => void) | undefined;
    if (navigator.locks)
      navigator.locks
        .request("tu-reminders", { signal: stop.signal }, () => {
          run();
          return new Promise<void>((r) => {
            release = r;
          });
        })
        .catch(() => {});
    else run();

    const onMessage = (e: MessageEvent) => {
      const msg = e.data as { type?: string; taskId?: string; action?: string };
      // A push arrived, or the worker changed a task itself: pull fresh data
      // (new reminder times, bell entries).
      if (msg?.type === "push-received" || msg?.type === "refresh")
        return void refresh();
      if (msg?.type !== "task-action" || !msg.taskId) return;
      applyTaskAction(msg.taskId, msg.action);
      if (!msg.action) navigate({ to: "/tasks", search: { task: msg.taskId } });
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      stop.abort();
      release?.();
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [navigate]);
}

/** "done" / "snooze" from a notification button. */
export function applyTaskAction(taskId: string, action?: string) {
  const task = qc
    .getQueryData<Task[]>(keys.tasks)
    ?.find((t) => t.id === taskId);
  if (!task) return;
  if (action === "done") {
    setTaskStatus(taskId, "done");
    toast.success("Marked as done", { description: task.title });
  } else if (action === "snooze") {
    snoozeTask(taskId, addHours(new Date(), 1).toISOString());
    toast.info("Snoozed for 1 hour", { description: task.title });
  }
}
