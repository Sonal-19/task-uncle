import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { addHours } from "date-fns";
import { useEffect } from "react";
import { toast } from "sonner";
import { keys } from "@/hooks/use-data";
import { isOverdue } from "@/lib/format";
import { mockApi } from "@/lib/mock-api";
import { permission, showNotification } from "@/lib/reminders/notify";
import { dueReminders } from "@/lib/reminders/reminder-engine";
import { PRIORITY_RANK } from "@/lib/task-utils";
import type { Task } from "@/lib/types";
import { useDataStore } from "@/stores/data-store";

const CHECK_EVERY = 60_000;
/** Individual notifications per check; the rest go into one summary. */
const MAX_SINGLE = 3;

function label(t: Task) {
  const { events, categories } = useDataStore.getState();
  const ev = events.find((e) => e.id === t.eventId)?.name;
  const cat = categories.find((c) => c.id === t.categoryId)?.name;
  return [ev, cat].filter(Boolean).join(" · ");
}

/** One pass of the engine: notify, then stamp `lastRemindedAt`. */
export async function runReminderCheck(now = new Date()) {
  const { tasks, settings } = useDataStore.getState();
  const due = dueReminders(tasks, settings, now).sort(
    (a, b) =>
      Number(isOverdue(b, now)) - Number(isOverdue(a, now)) ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  );
  if (!due.length) return 0;

  const at = now.toISOString();
  // Stamp first so a second tab running the same check skips these.
  mockApi.markReminded(
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
  mockApi.addLog(entries);

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

/** Mounted once in the app shell: runs the engine, keeps tabs in sync and
 * applies Mark done / Snooze taps coming from the service worker. */
export function useReminders() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: keys.all });
    const tick = () =>
      runReminderCheck().then((n) => {
        if (n) refresh();
      });

    const first = setTimeout(tick, 4000);
    const timer = setInterval(tick, CHECK_EVERY);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);

    // Another tab changed the data → reload it here.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "tu-data") return;
      useDataStore.persist.rehydrate();
      refresh();
    };
    window.addEventListener("storage", onStorage);

    const onMessage = async (e: MessageEvent) => {
      const msg = e.data as { type?: string; taskId?: string; action?: string };
      if (msg?.type !== "task-action" || !msg.taskId) return;
      await applyTaskAction(msg.taskId, msg.action);
      refresh();
      if (!msg.action) navigate({ to: "/tasks", search: { task: msg.taskId } });
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [qc, navigate]);
}

/** "done" / "snooze" from a notification button. */
export async function applyTaskAction(taskId: string, action?: string) {
  const task = useDataStore.getState().tasks.find((t) => t.id === taskId);
  if (!task) return;
  if (action === "done") {
    await mockApi.setTaskStatus(taskId, "done");
    toast.success("Marked as done", { description: task.title });
  } else if (action === "snooze") {
    await mockApi.snoozeTask(taskId, addHours(new Date(), 1).toISOString());
    toast.info("Snoozed for 1 hour", { description: task.title });
  }
}
