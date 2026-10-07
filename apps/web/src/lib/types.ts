/** Shapes the future API will send. Ids are strings so mock data and real
 * rows look the same. Timestamps are ISO strings; dates are `yyyy-MM-dd`. */

export type EventStatus = "active" | "archived";
export type TaskStatus = "pending" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";
export type CategoryKind = "general" | "team";
/** How often a pending task reminds. `inherit` = the global setting. */
export type ReminderEvery = "1h" | "5h" | "12h" | "24h";
export type TaskReminder = "inherit" | "off" | ReminderEvery;
export type OnOff = "on" | "off";

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
};

export type Person = {
  id: string;
  name: string;
  role: string;
  phone: string;
  note: string;
  createdAt: string;
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
