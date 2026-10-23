// The reminder rules, shared by the API's scheduler (Web Push), the web app's
// in-app engine (offline) and the service worker's background check. Pure
// TypeScript with no imports outside this folder.
//
// Quiet hours and due times are wall-clock times in the user's timezone
// (`settings.timezone`, else this runtime's own), so the server — which may
// run in UTC — decides exactly like the user's browser does.

import {
  CUSTOM_MINUTES_MIN,
  INTERVAL_MS,
  type Priority,
  type Settings,
  type Task,
} from "./types";

/* ---------------------------- wall clock ---------------------------- */

const runtimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const formats = new Map<string, Intl.DateTimeFormat>();
function formatFor(tz: string) {
  let f = formats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formats.set(tz, f);
  }
  return f;
}

/** The user's zone, or this runtime's when unset or unknown. */
export function zoneOf(settings: Pick<Settings, "timezone">) {
  const tz = settings.timezone;
  if (tz) {
    try {
      formatFor(tz);
      return tz;
    } catch {}
  }
  return runtimeZone();
}

/** What a clock in `tz` shows at `at`. */
function wall(at: number, tz: string) {
  const p: Record<string, number> = {};
  for (const x of formatFor(tz).formatToParts(new Date(at)))
    if (x.type !== "literal") p[x.type] = Number(x.value);
  return {
    y: p.year ?? 1970,
    m: p.month ?? 1,
    d: p.day ?? 1,
    h: (p.hour ?? 0) % 24,
    min: p.minute ?? 0,
    s: p.second ?? 0,
  };
}

const minutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** The instant (ms) when a clock in `tz` shows `ymd` `hhmm`. */
export function zonedInstant(ymd: string, hhmm: string, tz: string) {
  const [y = 1970, m = 1, d = 1] = ymd.split("-").map(Number);
  const mins = minutes(hhmm);
  const asUtc = Date.UTC(y, m - 1, d, Math.floor(mins / 60), mins % 60);
  const offset = (at: number) => {
    const w = wall(at, tz);
    return Date.UTC(w.y, w.m - 1, w.d, w.h, w.min, w.s) - at;
  };
  const first = asUtc - offset(asUtc);
  // Across a DST change the offset at the answer can differ from the guess.
  return asUtc - offset(first);
}

/** Past its due date and time (end of the day when there is no time). */
export function isOverdueAt(
  t: Pick<Task, "status" | "dueDate" | "dueTime">,
  now: Date,
  tz: string,
) {
  if (t.status === "done" || !t.dueDate) return false;
  return zonedInstant(t.dueDate, t.dueTime ?? "23:59", tz) < now.getTime();
}

/* ------------------------------- rules ------------------------------- */

/** True inside the quiet window (which may wrap past midnight, e.g. 22:00–07:00). */
export function inQuietHours(settings: Settings, now = new Date()) {
  const q = settings.quietHours;
  if (!q) return false;
  const w = wall(now.getTime(), zoneOf(settings));
  const cur = w.h * 60 + w.min;
  const from = minutes(q.from);
  const to = minutes(q.to);
  return from <= to ? cur >= from && cur < to : cur >= from || cur < to;
}

/** The settings' repeat in ms: the custom one when set, else the preset. */
export function settingsEvery(
  settings: Pick<Settings, "interval" | "customMinutes">,
) {
  const custom = settings.customMinutes;
  return custom && custom > 0
    ? Math.max(custom, CUSTOM_MINUTES_MIN) * 60_000
    : INTERVAL_MS[settings.interval];
}

/** How often this task reminds, in ms (null = never). */
export function intervalFor(t: Task, settings: Settings, now = new Date()) {
  if (t.reminder === "off") return null;
  const ms =
    t.reminder === "inherit"
      ? settingsEvery(settings)
      : INTERVAL_MS[t.reminder];
  return settings.overdueBoost === "on" && isOverdueAt(t, now, zoneOf(settings))
    ? ms / 2
    : ms;
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
  const tz = zoneOf(settings);
  const w = wall(at.getTime(), tz);
  const ymd = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
  let end = zonedInstant(ymd(w.y, w.m, w.d), q.to, tz);
  if (end <= at.getTime()) end = zonedInstant(ymd(w.y, w.m, w.d + 1), q.to, tz);
  return new Date(end);
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

/* ----------------------------- messages ----------------------------- */

/** Individual notifications per check; the rest go into one summary. */
export const MAX_SINGLE = 3;

const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export type ReminderEntry = {
  taskId: string | null;
  title: string;
  body: string;
  sentAt: string;
};

/**
 * One check: the tasks to stamp and the notifications to show (overdue and
 * urgent first, at most `MAX_SINGLE` single ones plus a summary). `label`
 * gives a task's "Event · Category" line.
 */
export function planReminders(
  tasks: Task[],
  settings: Settings,
  label: (t: Task) => string,
  now = new Date(),
) {
  const tz = zoneOf(settings);
  const overdue = (t: Task) => isOverdueAt(t, now, tz);
  const due = dueReminders(tasks, settings, now).sort(
    (a, b) =>
      Number(overdue(b)) - Number(overdue(a)) ||
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
  const sentAt = now.toISOString();
  const entries: ReminderEntry[] = due.slice(0, MAX_SINGLE).map((t) => ({
    taskId: t.id,
    title: `${overdue(t) ? "Overdue" : "Pending"}: ${t.title}`,
    // A task in no event has no "Event · Category" line.
    body: label(t) || "Tap to open it in Task Uncle",
    sentAt,
  }));
  if (due.length > MAX_SINGLE) {
    const open = tasks.filter((t) => t.status !== "done");
    entries.push({
      taskId: null,
      title: `You have ${open.length} pending tasks`,
      body: `${open.filter(overdue).length} overdue — open Task Uncle to clear them`,
      sentAt,
    });
  }
  return { due, entries };
}

/** What the API pushes and the service worker draws. */
export type PushPayload = {
  title: string;
  body: string;
  /** Same tag replaces the earlier notification instead of stacking. */
  tag: string;
  taskId: string | null;
};

export const toPushPayload = (e: ReminderEntry): PushPayload => ({
  title: e.title,
  body: e.body,
  tag: e.taskId ? `task-${e.taskId}` : "summary",
  taskId: e.taskId,
});
