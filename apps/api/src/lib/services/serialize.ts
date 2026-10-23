import type {
  SelectCategory,
  SelectEvent,
  SelectNotificationLog,
  SelectPerson,
  SelectTask,
  SelectUserSettings,
} from "$/db/schema";
import {
  type Category,
  DEFAULT_SETTINGS,
  kindOf,
  type NotificationLog,
  type Person,
  type Settings,
  type Task,
  type TaskEvent,
} from "$/lib/shared/types";

// Rows → the exact shapes in `lib/shared/types.ts` (ISO strings, no userId),
// so the web's types and the API's responses are the same thing.

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export const eventOut = (e: SelectEvent): TaskEvent => ({
  id: e.id,
  name: e.name,
  description: e.description,
  color: e.color,
  icon: e.icon,
  dueDate: e.dueDate,
  status: e.status,
  archivedAt: iso(e.archivedAt),
  createdAt: e.createdAt.toISOString(),
  updatedAt: e.updatedAt.toISOString(),
});

export const categoryOut = (c: SelectCategory): Category => ({
  id: c.id,
  eventId: c.eventId,
  name: c.name,
  icon: c.icon,
  color: c.color,
  kind: kindOf(c.memberIds),
  memberIds: c.memberIds,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

export const personOut = (p: SelectPerson): Person => ({
  id: p.id,
  name: p.name,
  role: p.role,
  phone: p.phone,
  note: p.note,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

export const taskOut = (t: SelectTask): Task => ({
  id: t.id,
  eventId: t.eventId,
  categoryId: t.categoryId,
  title: t.title,
  notes: t.notes,
  status: t.status,
  priority: t.priority,
  dueDate: t.dueDate,
  dueTime: t.dueTime,
  assigneeId: t.assigneeId,
  amount: t.amount,
  subtasks: t.subtasks,
  reminder: t.reminder,
  reminderMinutes: t.reminder === "custom" ? t.reminderMinutes : null,
  snoozedUntil: iso(t.snoozedUntil),
  lastRemindedAt: iso(t.lastRemindedAt),
  createdAt: t.createdAt.toISOString(),
  updatedAt: t.updatedAt.toISOString(),
  startedAt: iso(t.startedAt),
  completedAt: iso(t.completedAt),
});

export const settingsOut = (s: SelectUserSettings | undefined): Settings =>
  s
    ? {
        notifications: s.notifications,
        interval: s.interval,
        customMinutes: s.customMinutes,
        quietHours:
          s.quietFrom && s.quietTo
            ? { from: s.quietFrom, to: s.quietTo }
            : null,
        overdueBoost: s.overdueBoost,
        permissionPromptDismissedAt: iso(s.permissionPromptDismissedAt),
        timezone: s.timezone,
      }
    : DEFAULT_SETTINGS;

export const logOut = (l: SelectNotificationLog): NotificationLog => ({
  id: l.id,
  taskId: l.taskId,
  title: l.title,
  body: l.body,
  sentAt: l.sentAt.toISOString(),
  readAt: iso(l.readAt),
});
