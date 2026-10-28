import { desc, eq } from "drizzle-orm";
import { db } from "$/db";
import {
  categoriesTable,
  eventsTable,
  notificationLogTable,
  peopleTable,
  tasksTable,
  userSettingsTable,
} from "$/db/schema";
import {
  CUSTOM_MINUTES_MAX,
  CUSTOM_MINUTES_MIN,
  checkDay,
  type DataState,
  DEFAULT_SETTINGS,
  eventStatuses,
  newId,
  onOff,
  priorities,
  reminderEveries,
  repeatFields,
  type Subtask,
  taskReminders,
  taskRepeats,
  taskStatuses,
} from "$/lib/shared/types";
import {
  categoryOut,
  eventOut,
  logOut,
  personOut,
  settingsOut,
  taskOut,
} from "./serialize";

/** Notification history kept per user. */
export const LOG_LIMIT = 200;

/** Everything one user has, in the backup format. */
export async function exportAll(userId: number): Promise<DataState> {
  const [events, categories, people, tasks, [settings], log] =
    await Promise.all([
      db.select().from(eventsTable).where(eq(eventsTable.userId, userId)),
      db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.userId, userId)),
      db.select().from(peopleTable).where(eq(peopleTable.userId, userId)),
      db.select().from(tasksTable).where(eq(tasksTable.userId, userId)),
      db
        .select()
        .from(userSettingsTable)
        .where(eq(userSettingsTable.userId, userId)),
      db
        .select()
        .from(notificationLogTable)
        .where(eq(notificationLogTable.userId, userId))
        .orderBy(desc(notificationLogTable.sentAt))
        .limit(LOG_LIMIT),
    ]);
  return {
    events: events.map(eventOut),
    categories: categories.map(categoryOut),
    people: people.map(personOut),
    tasks: tasks.map(taskOut),
    settings: settingsOut(settings),
    log: log.map(logOut),
  };
}

/* ---- loose input (old backups, hand-edited files) ---- */

type Loose = Record<string, unknown>;
const arr = (v: unknown): Loose[] =>
  Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : [];
const str = (v: unknown, fallback = "") =>
  typeof v === "string" ? v : fallback;
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T =>
  list.includes(v as T) ? (v as T) : d;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const date = (v: unknown) => (typeof v === "string" && DATE.test(v) ? v : null);
const time = (v: unknown) => (typeof v === "string" && TIME.test(v) ? v : null);
const stamp = (v: unknown) => {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Replaces all of a user's data (backup import, demo reset). Every id gets a
 * fresh UUID, so one file can be imported by several users and old backups
 * with non-UUID ids still load; links between rows follow the new ids, and
 * rows pointing at something missing are dropped (or unlinked if optional).
 */
export async function replaceAll(userId: number, input: unknown) {
  const data = (input ?? {}) as Loose;
  if (!Array.isArray(data.events) || !Array.isArray(data.tasks))
    throw new Error("That file is not a Task Uncle backup");

  const ids = new Map<string, string>();
  const mapId = (old: unknown) => {
    const key = str(old) || newId();
    let id = ids.get(key);
    if (!id) {
      id = newId();
      ids.set(key, id);
    }
    return id;
  };
  const known = (old: unknown) =>
    typeof old === "string" ? (ids.get(old) ?? null) : null;
  const now = new Date();

  const events = arr(data.events).map((e) => ({
    id: mapId(e.id),
    userId,
    name: str(e.name, "Untitled").slice(0, 80) || "Untitled",
    description: str(e.description),
    color: str(e.color, "#4f46e5"),
    icon: str(e.icon, "folder"),
    dueDate: date(e.dueDate),
    status: oneOf(e.status, eventStatuses, "active"),
    archivedAt: stamp(e.archivedAt),
    createdAt: stamp(e.createdAt) ?? now,
  }));
  const people = arr(data.people).map((p) => ({
    id: mapId(p.id),
    userId,
    name: str(p.name, "Someone") || "Someone",
    role: str(p.role),
    phone: str(p.phone),
    note: str(p.note),
    createdAt: stamp(p.createdAt) ?? now,
  }));
  const categories = arr(data.categories).flatMap((c) => {
    const eventId = known(c.eventId);
    if (!eventId) return [];
    const memberIds = (Array.isArray(c.memberIds) ? c.memberIds : [])
      .map(known)
      .filter((m): m is string => !!m);
    return [
      {
        id: mapId(c.id),
        userId,
        eventId,
        name: str(c.name, "General") || "General",
        icon: str(c.icon, "folder"),
        color: str(c.color, "#4f46e5"),
        memberIds,
        createdAt: stamp(c.createdAt) ?? now,
      },
    ];
  });
  const eventOfCategory = new Map(categories.map((c) => [c.id, c.eventId]));
  const tasks = arr(data.tasks).flatMap((t) => {
    // Both optional: a category decides the event; a link to something
    // that isn't in the file is dropped.
    const categoryId = known(t.categoryId);
    const eventId = categoryId
      ? (eventOfCategory.get(categoryId) ?? null)
      : known(t.eventId);
    const subtasks: Subtask[] = arr(t.subtasks).map((s) => ({
      id: str(s.id) || newId(),
      title: str(s.title),
      doneAt: typeof s.doneAt === "string" ? s.doneAt : null,
    }));
    const amount = Number(t.amount);
    const repeating = repeatFields({
      repeat: oneOf(t.repeat, taskRepeats, "off"),
      repeatEvery: Number(t.repeatEvery) || 1,
      repeatDays: Array.isArray(t.repeatDays) ? t.repeatDays.map(Number) : [],
      repeatStart: date(t.repeatStart),
      repeatTime: time(t.repeatTime),
    });
    const doneDates = (Array.isArray(t.doneDates) ? t.doneDates : [])
      .map(date)
      .filter((d): d is string => !!d)
      .reduce<string[]>((list, d) => checkDay(list, d, true), []);
    return [
      {
        id: mapId(t.id),
        userId,
        eventId,
        categoryId,
        title: str(t.title, "Untitled") || "Untitled",
        notes: str(t.notes),
        status: oneOf(t.status, taskStatuses, "pending"),
        priority: oneOf(t.priority, priorities, "medium"),
        dueDate: date(t.dueDate),
        dueTime: date(t.dueDate) ? time(t.dueTime) : null,
        assigneeId: known(t.assigneeId),
        amount:
          t.amount !== null && Number.isSafeInteger(amount) && amount > 0
            ? amount
            : null,
        subtasks,
        reminder: oneOf(t.reminder, taskReminders, "inherit"),
        reminderMinutes:
          t.reminder === "custom" &&
          Number.isInteger(t.reminderMinutes) &&
          (t.reminderMinutes as number) >= CUSTOM_MINUTES_MIN &&
          (t.reminderMinutes as number) <= CUSTOM_MINUTES_MAX
            ? (t.reminderMinutes as number)
            : null,
        ...repeating,
        doneDates,
        snoozedUntil: stamp(t.snoozedUntil),
        lastRemindedAt: stamp(t.lastRemindedAt),
        startedAt: stamp(t.startedAt),
        completedAt: stamp(t.completedAt),
        createdAt: stamp(t.createdAt) ?? now,
        updatedAt: stamp(t.updatedAt) ?? now,
      },
    ];
  });
  const log = arr(data.log)
    .slice(0, LOG_LIMIT)
    .map((l) => ({
      id: newId(),
      userId,
      taskId: known(l.taskId),
      title: str(l.title, "Reminder"),
      body: str(l.body),
      sentAt: stamp(l.sentAt) ?? now,
      readAt: stamp(l.readAt),
    }));
  const s = { ...DEFAULT_SETTINGS, ...((data.settings ?? {}) as Loose) };
  const quiet = s.quietHours as { from?: unknown; to?: unknown } | null;
  const settings = {
    userId,
    notifications: oneOf(s.notifications, onOff, "on"),
    interval: oneOf(s.interval, reminderEveries, "1h"),
    customMinutes:
      Number.isInteger(s.customMinutes) &&
      (s.customMinutes as number) >= CUSTOM_MINUTES_MIN &&
      (s.customMinutes as number) <= CUSTOM_MINUTES_MAX
        ? (s.customMinutes as number)
        : null,
    quietFrom: time(quiet?.from),
    quietTo: time(quiet?.to),
    overdueBoost: oneOf(s.overdueBoost, onOff, "on"),
    permissionPromptDismissedAt: stamp(s.permissionPromptDismissedAt),
    timezone: typeof s.timezone === "string" ? s.timezone.slice(0, 64) : null,
  };

  await db.transaction(async (tx) => {
    // Categories, tasks and their log links go with the events (cascade).
    await tx.delete(eventsTable).where(eq(eventsTable.userId, userId));
    await tx.delete(peopleTable).where(eq(peopleTable.userId, userId));
    await tx
      .delete(notificationLogTable)
      .where(eq(notificationLogTable.userId, userId));
    if (events.length) await tx.insert(eventsTable).values(events);
    if (people.length) await tx.insert(peopleTable).values(people);
    if (categories.length) await tx.insert(categoriesTable).values(categories);
    if (tasks.length) await tx.insert(tasksTable).values(tasks);
    if (log.length) await tx.insert(notificationLogTable).values(log);
    await tx
      .insert(userSettingsTable)
      .values(settings)
      .onConflictDoUpdate({ target: userSettingsTable.userId, set: settings });
  });
}
