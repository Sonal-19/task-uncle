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
export const taskReminders = ["inherit", "off", ...reminderEveries] as const;
export const onOff = ["on", "off"] as const;

export type EventStatus = (typeof eventStatuses)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type Priority = (typeof priorities)[number];
export type CategoryKind = (typeof categoryKinds)[number];
/** How often a pending task reminds. `inherit` = the global setting. */
export type ReminderEvery = (typeof reminderEveries)[number];
export type TaskReminder = (typeof taskReminders)[number];
export type OnOff = (typeof onOff)[number];

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
  eventId: string;
  categoryId: string;
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
  /** "HH:mm" window when no reminders are sent; null = never quiet. */
  quietHours: { from: string; to: string } | null;
  /** Overdue tasks remind twice as often. */
  overdueBoost: OnOff;
  /** Banner on the dashboard asking for permission was dismissed at. */
  permissionPromptDismissedAt: string | null;
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
  quietHours: { from: "22:00", to: "07:00" },
  overdueBoost: "on",
  permissionPromptDismissedAt: null,
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
