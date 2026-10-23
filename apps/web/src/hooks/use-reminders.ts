import { useNavigate } from "@tanstack/react-router";
import { addHours } from "date-fns";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  addLog,
  markReminded,
  setTaskStatus,
  snoozeTask,
} from "@/hooks/use-data";
import { queryClient as qc } from "@/integrations/tanstack-query/root-provider";
import { fetchers } from "@/lib/fetchers";
import { isOverdue } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { permission, showNotification } from "@/lib/reminders/notify";
import { dueReminders } from "@/lib/reminders/reminder-engine";
import { PRIORITY_RANK } from "@/lib/task-utils";
import type { Category, Task, TaskEvent } from "@/lib/types";

const CHECK_EVERY = 60_000;
/** Individual notifications per check; the rest go into one summary. */
const MAX_SINGLE = 3;

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

/** One pass of the engine: stamp `lastRemindedAt`, then notify. `force`
 * treats every pending task as due (Settings → Remind me now). */
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
  const due = dueReminders(tasks, settings, now).sort(
    (a, b) =>
      Number(isOverdue(b, now)) - Number(isOverdue(a, now)) ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  );
  if (!due.length) return 0;

  const at = now.toISOString();
  markReminded(
    due.map((t) => t.id),
    at,
  );

  const entries: {
    taskId: string | null;
    title: string;
    body: string;
    sentAt: string;
  }[] = due.slice(0, MAX_SINGLE).map((t) => ({
    taskId: t.id,
    title: `${isOverdue(t, now) ? "Overdue" : "Pending"}: ${t.title}`,
    body: label(t),
    sentAt: at,
  }));
  if (due.length > MAX_SINGLE) {
    const open = tasks.filter((t) => t.status !== "done");
    entries.push({
      taskId: null,
      title: `You have ${open.length} pending tasks`,
      body: `${open.filter((t) => isOverdue(t, now)).length} overdue — open Task Uncle to clear them`,
      sentAt: at,
    });
  }
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
