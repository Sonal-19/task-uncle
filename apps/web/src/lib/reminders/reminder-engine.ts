import { isOverdue } from "@/lib/format";
import {
  INTERVAL_MS,
  type ReminderEvery,
  type Settings,
  type Task,
} from "@/lib/types";

const minutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** True inside the quiet window (which may wrap past midnight, e.g. 22:00–07:00). */
export function inQuietHours(settings: Settings, now = new Date()) {
  const q = settings.quietHours;
  if (!q) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const from = minutes(q.from);
  const to = minutes(q.to);
  return from <= to ? cur >= from && cur < to : cur >= from || cur < to;
}

/** How often this task reminds, in ms (null = never). */
export function intervalFor(t: Task, settings: Settings, now = new Date()) {
  if (t.reminder === "off") return null;
  const every: ReminderEvery =
    t.reminder === "inherit" ? settings.interval : t.reminder;
  const ms = INTERVAL_MS[every];
  return settings.overdueBoost === "on" && isOverdue(t, now) ? ms / 2 : ms;
}

/**
 * Pending tasks whose reminder is due now. A task keeps coming back every
 * interval until it is marked done; snoozing pushes it to `snoozedUntil`.
 */
export function dueReminders(
  tasks: Task[],
  settings: Settings,
  now = new Date(),
) {
  if (settings.notifications === "off" || inQuietHours(settings, now))
    return [];
  const t0 = now.getTime();
  return tasks.filter((t) => {
    if (t.status === "done") return false;
    if (t.snoozedUntil && Date.parse(t.snoozedUntil) > t0) return false;
    const every = intervalFor(t, settings, now);
    if (every === null) return false;
    // A task never reminded counts from when it was created.
    const last = Date.parse(t.lastRemindedAt ?? t.createdAt);
    return t0 - last >= every;
  });
}

/** End of the quiet window that `at` falls in (else `at` itself). */
function afterQuiet(settings: Settings, at: Date) {
  const q = settings.quietHours;
  if (!q || !inQuietHours(settings, at)) return at;
  const end = new Date(at);
  const m = minutes(q.to);
  end.setHours(Math.floor(m / 60), m % 60, 0, 0);
  if (end <= at) end.setDate(end.getDate() + 1);
  return end;
}

/** When this task will remind next (for the detail sheet). */
export function nextReminderAt(t: Task, settings: Settings, now = new Date()) {
  if (t.status === "done" || settings.notifications === "off") return null;
  const every = intervalFor(t, settings, now);
  if (every === null) return null;
  const last = Date.parse(t.lastRemindedAt ?? t.createdAt);
  const snooze = t.snoozedUntil ? Date.parse(t.snoozedUntil) : 0;
  return afterQuiet(
    settings,
    // The engine checks once a minute.
    new Date(Math.max(last + every, snooze, now.getTime() + 60_000)),
  );
}
