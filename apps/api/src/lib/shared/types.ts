// Shapes the API sends and the web app shows. Pure TypeScript with no
// imports, so the web imports this same file (`$/lib/shared/types`). Ids are
// UUIDs made by whoever creates the row (the web makes them, so rows created
// offline already have their final id). Timestamps are ISO strings; dates
// are `yyyy-MM-dd`.

export const eventStatuses = ["active", "archived"] as const;
export const taskStatuses = ["pending", "in_progress", "done"] as const;
export const priorities = ["low", "medium", "high", "urgent"] as const;
export const categoryKinds = ["general", "team"] as const;
export const reminderEveries = ["1h", "5h", "12h", "24h"] as const;
/** `custom` = every `reminderMinutes`. */
export const taskReminders = [
  "inherit",
  "off",
  ...reminderEveries,
  "custom",
] as const;
export const onOff = ["on", "off"] as const;
/** A routine: the unit it comes back in (every `repeatEvery` days, weeks or
 * months from `repeatStart`), reminding at `repeatTime` and ticked off per
 * occurrence (`doneDates`) until the repeat is turned off. */
export const taskRepeats = ["off", "daily", "weekly", "monthly"] as const;

/** `admin` opens the admin panel (set with `db:make-admin` or by another admin). */
export const userRoles = ["user", "admin"] as const;
/** `disabled` can't log in; their sessions stop working. */
export const userStatuses = ["active", "disabled"] as const;
export type UserRole = (typeof userRoles)[number];
export type UserStatus = (typeof userStatuses)[number];

/** The logged-in user as the API sends it. `notifyPermission` = whether the
 * admin lets this account get reminders at all. */
export type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  notifyPermission: OnOff;
  createdAt: string;
};

export type EventStatus = (typeof eventStatuses)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type Priority = (typeof priorities)[number];
export type CategoryKind = (typeof categoryKinds)[number];
/** How often a pending task reminds. `inherit` = the global setting. */
export type ReminderEvery = (typeof reminderEveries)[number];
export type TaskReminder = (typeof taskReminders)[number];
export type OnOff = (typeof onOff)[number];
export type TaskRepeat = (typeof taskRepeats)[number];

export type TaskEvent = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  dueDate: string | null;
  status: EventStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  eventId: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  /** People in a `team` group. */
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type Person = {
  id: string;
  name: string;
  role: string;
  phone: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type Subtask = { id: string; title: string; doneAt: string | null };

export type Task = {
  id: string;
  /** Optional. With a category it is always the category's event. */
  eventId: string | null;
  /** Optional; a task can sit in an event without a category. */
  categoryId: string | null;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  /** "HH:mm", only with a dueDate. */
  dueTime: string | null;
  assigneeId: string | null;
  /** Pending payment in paise (integer), e.g. a developer's fee. */
  amount: number | null;
  subtasks: Subtask[];
  reminder: TaskReminder;
  /** Minutes between reminders when `reminder` is "custom" (else null). */
  reminderMinutes: number | null;
  /** A routine stays open; each occurrence is ticked off in `doneDates`. */
  repeat: TaskRepeat;
  /** Every how many days / weeks / months (1 with repeat = off). */
  repeatEvery: number;
  /** Weekdays (0 = Sun … 6 = Sat) a weekly routine falls on, sorted; empty
   * = the weekday of `repeatStart`. Always empty for other repeats. */
  repeatDays: number[];
  /** `yyyy-MM-dd` of the first occurrence; sets the weekday / day of the
   * month. Null = the day it was created. */
  repeatStart: string | null;
  /** "HH:mm" of the routine's reminder (only with a repeat). */
  repeatTime: string | null;
  /** `yyyy-MM-dd` occurrences of a routine that were done, oldest first. */
  doneDates: string[];
  snoozedUntil: string | null;
  lastRemindedAt: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type Settings = {
  notifications: OnOff;
  interval: ReminderEvery;
  /** Custom repeat in minutes; when set it replaces `interval`. */
  customMinutes: number | null;
  /** "HH:mm" window when no reminders are sent; null = never quiet. */
  quietHours: { from: string; to: string } | null;
  /** Overdue tasks remind twice as often. */
  overdueBoost: OnOff;
  /** Banner on the dashboard asking for permission was dismissed at. */
  permissionPromptDismissedAt: string | null;
  /** IANA zone the user's browser reported, for quiet hours and due times
   * when the server sends reminders. null = not reported yet. */
  timezone: string | null;
};

export type NotificationLog = {
  id: string;
  taskId: string | null;
  title: string;
  body: string;
  sentAt: string;
  readAt: string | null;
};

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export const INTERVALS: { value: ReminderEvery; label: string }[] = [
  { value: "1h", label: "Every hour" },
  { value: "5h", label: "Every 5 hours" },
  { value: "12h", label: "Every 12 hours" },
  { value: "24h", label: "Once a day" },
];

/** Limits of the custom repeat (the engine checks once a minute). */
export const CUSTOM_MINUTES_MIN = 5;
export const CUSTOM_MINUTES_MAX = 7 * 24 * 60;

/** "Every 1 h 30 min", "Every 45 min", "Every 2 days". */
export function everyLabel(minutes: number) {
  if (minutes % 1440 === 0) {
    const d = minutes / 1440;
    return `Every ${d === 1 ? "day" : `${d} days`}`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `Every ${[h && `${h} h`, m && `${m} min`].filter(Boolean).join(" ")}`;
}

/** The settings' repeat as text ("Every hour", "Every 1 h 30 min"). */
export function settingsLabel(s: Pick<Settings, "interval" | "customMinutes">) {
  if (s.customMinutes) return everyLabel(s.customMinutes);
  return INTERVALS.find((i) => i.value === s.interval)?.label ?? "Every hour";
}

export const INTERVAL_MS: Record<ReminderEvery, number> = {
  "1h": 3_600_000,
  "5h": 5 * 3_600_000,
  "12h": 12 * 3_600_000,
  "24h": 24 * 3_600_000,
};

/** Everything one user has (also the backup file format). */
export type DataState = {
  events: TaskEvent[];
  categories: Category[];
  people: Person[];
  tasks: Task[];
  settings: Settings;
  log: NotificationLog[];
};

export const DEFAULT_SETTINGS: Settings = {
  notifications: "on",
  interval: "1h",
  customMinutes: null,
  quietHours: { from: "22:00", to: "07:00" },
  overdueBoost: "on",
  permissionPromptDismissedAt: null,
  timezone: null,
};

/** A category with members is a team. */
export const kindOf = (memberIds: string[]): CategoryKind =>
  memberIds.length ? "team" : "general";

/** Fields that change with a status, so `completedAt` always tells when it
 * was finished. `at` is when the change was made; the web (optimistic copy)
 * and the API (saved row) pass the same one, so both agree. */
export function statusPatch(
  t: Pick<Task, "status" | "startedAt">,
  status: TaskStatus,
  at: string,
): Partial<
  Pick<Task, "status" | "startedAt" | "completedAt" | "snoozedUntil">
> {
  if (status === t.status) return {};
  if (status === "done") return { status, completedAt: at, snoozedUntil: null };
  if (status === "in_progress")
    return { status, startedAt: t.startedAt ?? at, completedAt: null };
  return { status, completedAt: null };
}

/** UUID v4. `crypto.randomUUID` needs a secure context, which a phone on the
 * dev server's LAN address (plain http) isn't, so fall back to random bytes. */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Days kept in `doneDates` (older ones are dropped). */
export const DONE_DATES_MAX = 400;

/** `doneDates` with `date` ticked (`done`) or unticked. Set semantics, so
 * the same change applied twice (an offline replay) gives the same list. */
export function checkDay(doneDates: string[], date: string, done: boolean) {
  const rest = doneDates.filter((d) => d !== date);
  return (done ? [...rest, date].sort() : rest).slice(-DONE_DATES_MAX);
}

/** A routine (repeating task) that is on. */
export const isRoutine = (t: Pick<Task, "repeat" | "repeatTime">) =>
  t.repeat !== "off" && !!t.repeatTime;

/** Limits of `repeatEvery`. */
export const REPEAT_EVERY_MAX = 366;

type RepeatFields = Pick<
  Task,
  "repeat" | "repeatEvery" | "repeatDays" | "repeatStart" | "repeatTime"
>;

/** A routine only with a time; its every / start / time only with a repeat.
 * The one rule for the API and the web's reducer. */
export function repeatFields(r: Partial<RepeatFields>): RepeatFields {
  const repeat = r.repeat ?? "off";
  if (repeat === "off" || !r.repeatTime)
    return {
      repeat: "off",
      repeatEvery: 1,
      repeatDays: [],
      repeatStart: null,
      repeatTime: null,
    };
  const every = Math.trunc(Number(r.repeatEvery ?? 1)) || 1;
  const days =
    repeat === "weekly" && Array.isArray(r.repeatDays)
      ? [...new Set(r.repeatDays)]
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
          .sort((a, b) => a - b)
      : [];
  return {
    repeat,
    repeatEvery: Math.min(Math.max(every, 1), REPEAT_EVERY_MAX),
    repeatDays: days,
    repeatStart: r.repeatStart ?? null,
    repeatTime: r.repeatTime,
  };
}

/* ------------------------------ routines ------------------------------ */
// A routine comes back on its occurrences: `repeatStart`, then every
// `repeatEvery` days / weeks / months (a monthly one on the 31st falls on
// the last day of shorter months). A weekly one with `repeatDays` falls on
// each of those weekdays, every `repeatEvery` weeks (weeks start on Monday,
// counted from the start's week). An occurrence stays open until it is
// ticked off or the next one comes.

type RoutineShape = Pick<
  Task,
  "repeat" | "repeatEvery" | "repeatDays" | "repeatStart" | "createdAt"
>;

const ymdParts = (ymd: string) => {
  const [y = 1970, m = 1, d = 1] = ymd.split("-").map(Number);
  return { y, m, d };
};
const utcDay = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
const dayNumber = (ymd: string) => {
  const { y, m, d } = ymdParts(ymd);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

const fromNumber = (n: number) =>
  new Date(n * 86_400_000).toISOString().slice(0, 10);
/** 0 = Sun … 6 = Sat (day 0 of the epoch was a Thursday). */
const weekdayOf = (n: number) => (((n + 4) % 7) + 7) % 7;
const mondayOf = (n: number) => n - ((weekdayOf(n) + 6) % 7);

/** The weekdays of a weekly routine on several days, else null. */
const multiDays = (t: RoutineShape) =>
  t.repeat === "weekly" && t.repeatDays?.length ? t.repeatDays : null;

/** A multi-day weekly routine's latest occurrence on or before `day`. */
function multiOn(t: RoutineShape, days: number[], day: string) {
  const start = dayNumber(routineStart(t));
  const d = dayNumber(day);
  if (d < start) return null;
  const anchor = mondayOf(start);
  const span = stepOf(t) * 7;
  for (
    let wk = anchor + Math.floor((mondayOf(d) - anchor) / span) * span;
    wk >= anchor;
    wk -= span
  )
    for (let i = 6; i >= 0; i--) {
      const x = wk + i;
      if (x <= d && x >= start && days.includes(weekdayOf(x)))
        return fromNumber(x);
    }
  return null;
}

/** A multi-day weekly routine's first occurrence after `day`. */
function multiNext(t: RoutineShape, days: number[], day: string) {
  const start = dayNumber(routineStart(t));
  const d = Math.max(dayNumber(day) + 1, start);
  const anchor = mondayOf(start);
  const span = stepOf(t) * 7;
  let wk = anchor + Math.floor((mondayOf(d) - anchor) / span) * span;
  // `days` is never empty, so this ends within two active weeks.
  for (; ; wk += span)
    for (let i = 0; i < 7; i++) {
      const x = wk + i;
      if (x >= d && days.includes(weekdayOf(x))) return fromNumber(x);
    }
}

/** The first occurrence of a routine. */
export const routineStart = (t: Pick<Task, "repeatStart" | "createdAt">) =>
  t.repeatStart ?? t.createdAt.slice(0, 10);

const stepOf = (t: Pick<Task, "repeatEvery">) =>
  Math.max(1, t.repeatEvery || 1);

/** The `k`-th occurrence (0 = the start). */
function occurrence(t: RoutineShape, k: number) {
  const s = ymdParts(routineStart(t));
  if (t.repeat === "monthly") {
    const months = s.m - 1 + k * stepOf(t);
    const y = s.y + Math.floor(months / 12);
    const m = (((months % 12) + 12) % 12) + 1;
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return utcDay(y, m, Math.min(s.d, last));
  }
  const days = stepOf(t) * (t.repeat === "weekly" ? 7 : 1);
  return utcDay(s.y, s.m, s.d + k * days);
}

/** Which occurrence `day` falls in (-1 = before the start). */
function indexOn(t: RoutineShape, day: string) {
  const start = routineStart(t);
  if (day < start) return -1;
  if (t.repeat === "monthly") {
    const s = ymdParts(start);
    const d = ymdParts(day);
    let k = Math.floor(((d.y - s.y) * 12 + d.m - s.m) / stepOf(t));
    if (occurrence(t, k) > day) k--;
    return Math.max(k, -1);
  }
  const days = stepOf(t) * (t.repeat === "weekly" ? 7 : 1);
  return Math.floor((dayNumber(day) - dayNumber(start)) / days);
}

/** The occurrence `day` belongs to (null before the routine starts). */
export function occurrenceOn(t: RoutineShape, day: string) {
  const days = multiDays(t);
  if (days) return multiOn(t, days, day);
  const k = indexOn(t, day);
  return k < 0 ? null : occurrence(t, k);
}

/** The first occurrence after `day`. */
export function nextOccurrence(t: RoutineShape, day: string) {
  const days = multiDays(t);
  if (days) return multiNext(t, days, day);
  return occurrence(t, indexOn(t, day) + 1);
}

/** The `n` latest occurrences up to `day`'s, newest first. */
export function occurrencesUpTo(t: RoutineShape, day: string, n: number) {
  const out: string[] = [];
  const days = multiDays(t);
  if (days) {
    for (
      let occ = multiOn(t, days, day);
      occ && out.length < n;
      occ = multiOn(t, days, fromNumber(dayNumber(occ) - 1))
    )
      out.push(occ);
    return out;
  }
  const k = indexOn(t, day);
  for (let i = k; i >= 0 && out.length < n; i--) out.push(occurrence(t, i));
  return out;
}

/** The occurrence a routine's check ticks on `today`: the open one, or the
 * first one before the routine starts. */
export const routineDay = (t: RoutineShape, today: string) =>
  occurrenceOn(t, today) ?? routineStart(t);

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Weekday numbers in the order a week is shown (Monday first). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "Mon, Wed, Fri" / "Mon–Fri" (Monday first). */
export function weekdaysLabel(days: number[]) {
  const sorted = WEEK_ORDER.filter((d) => days.includes(d));
  if (sorted.join() === "1,2,3,4,5") return "Mon–Fri";
  if (sorted.length === 7) return "every day";
  return sorted.map((d) => WEEKDAYS[d]).join(", ");
}
const ordinal = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/** "Every day", "Every 15 days", "Every week on Mon", "Every weekday",
 * "Every 2 weeks on Mon, Thu", "Every month on the 5th", "Every 3 months on
 * the 31st". */
export function routineLabel(t: RoutineShape) {
  const n = stepOf(t);
  const start = ymdParts(routineStart(t));
  if (t.repeat === "weekly") {
    const days = multiDays(t) ?? [weekdayOf(dayNumber(routineStart(t)))];
    const on = weekdaysLabel(days);
    if (n === 1 && on === "Mon–Fri") return "Every weekday";
    if (n === 1 && days.length === 7) return "Every day";
    return `Every ${n === 1 ? "week" : `${n} weeks`} on ${on}`;
  }
  if (t.repeat === "monthly")
    return `Every ${n === 1 ? "month" : `${n} months`} on the ${ordinal(start.d)}`;
  return `Every ${n === 1 ? "day" : `${n} days`}`;
}

/** One word for a routine's notifications: "Daily", "Weekly", "Routine". */
export function routineWord(t: Pick<Task, "repeat" | "repeatEvery">) {
  if (stepOf(t) !== 1) return "Routine";
  return t.repeat === "weekly"
    ? "Weekly"
    : t.repeat === "monthly"
      ? "Monthly"
      : "Daily";
}

type Place = { eventId: string | null; categoryId: string | null };

/**
 * Where a task lives after a change. Both are optional; a category decides
 * the event, and moving a task to another event (without naming a category)
 * drops the category of the old one. `eventOf` gives a category's event
 * (undefined when unknown).
 */
export function placeTask(
  current: Place,
  patch: { eventId?: string | null; categoryId?: string | null },
  eventOf: (categoryId: string) => string | undefined,
): Place {
  let categoryId =
    patch.categoryId !== undefined ? patch.categoryId : current.categoryId;
  let eventId = patch.eventId !== undefined ? patch.eventId : current.eventId;
  if (categoryId) {
    const ev = eventOf(categoryId);
    if (
      patch.categoryId === undefined &&
      patch.eventId !== undefined &&
      ev !== undefined &&
      ev !== patch.eventId
    )
      categoryId = null;
    else if (ev !== undefined) eventId = ev;
  }
  return { eventId, categoryId };
}
