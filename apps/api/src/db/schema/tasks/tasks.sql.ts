import { sql } from "drizzle-orm";
import { index, pgTable } from "drizzle-orm/pg-core";
import type { Subtask } from "$/lib/shared/types";
import { usersTable } from "../users/users.sql";
import { categoriesTable } from "./categories.sql";
import {
  priorityEnum,
  taskReminderEnum,
  taskRepeatEnum,
  taskStatusEnum,
} from "./enums.sql";
import { eventsTable } from "./events.sql";
import { peopleTable } from "./people.sql";

export const tasksTable = pgTable(
  "tasks",
  (pg) => ({
    id: pg.uuid().primaryKey(),
    userId: pg
      .integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** Optional; with a category it is always the category's event (moved
     * with it). Deleting the event deletes its tasks. */
    eventId: pg
      .uuid("event_id")
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    /** Optional. Deleting the category deletes its tasks. */
    categoryId: pg
      .uuid("category_id")
      .references(() => categoriesTable.id, { onDelete: "cascade" }),
    title: pg.text().notNull(),
    notes: pg.text().notNull().default(""),
    status: taskStatusEnum("status").notNull().default("pending"),
    priority: priorityEnum("priority").notNull().default("medium"),
    dueDate: pg.date("due_date", { mode: "string" }),
    /** "HH:mm", only with a due date. */
    dueTime: pg.text("due_time"),
    assigneeId: pg
      .uuid("assignee_id")
      .references(() => peopleTable.id, { onDelete: "set null" }),
    /** Pending payment in paise. */
    amount: pg.bigint({ mode: "number" }),
    subtasks: pg.jsonb().$type<Subtask[]>().notNull().default([]),
    reminder: taskReminderEnum("reminder").notNull().default("inherit"),
    /** Minutes between reminders when `reminder` = custom. */
    reminderMinutes: pg.integer("reminder_minutes"),
    /** A routine's unit (daily / weekly / monthly), ticked off per occurrence. */
    repeat: taskRepeatEnum("repeat").notNull().default("off"),
    /** Every how many days / weeks / months. */
    repeatEvery: pg.integer("repeat_every").notNull().default(1),
    /** `yyyy-MM-dd` of the first occurrence (null = the created day). */
    repeatStart: pg.text("repeat_start"),
    /** "HH:mm", with a repeat. */
    repeatTime: pg.text("repeat_time"),
    /** `yyyy-MM-dd` occurrences a routine was done. */
    doneDates: pg.jsonb("done_dates").$type<string[]>().notNull().default([]),
    snoozedUntil: pg.timestamp("snoozed_until", { withTimezone: true }),
    lastRemindedAt: pg.timestamp("last_reminded_at", { withTimezone: true }),
    startedAt: pg.timestamp("started_at", { withTimezone: true }),
    completedAt: pg.timestamp("completed_at", { withTimezone: true }),
    createdAt: pg
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: pg
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("tasks_user_idx").on(t.userId),
    index("tasks_event_idx").on(t.eventId).where(sql`${t.eventId} is not null`),
    index("tasks_category_idx")
      .on(t.categoryId)
      .where(sql`${t.categoryId} is not null`),
    index("tasks_assignee_idx")
      .on(t.assigneeId)
      .where(sql`${t.assigneeId} is not null`),
  ],
);

export type SelectTask = typeof tasksTable.$inferSelect;
