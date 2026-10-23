import { sql } from "drizzle-orm";
import { index, pgTable } from "drizzle-orm/pg-core";
import type { Subtask } from "$/lib/shared/types";
import { usersTable } from "../users/users.sql";
import { categoriesTable } from "./categories.sql";
import { priorityEnum, taskReminderEnum, taskStatusEnum } from "./enums.sql";
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
    /** Always the category's event (moved with it). */
    eventId: pg
      .uuid("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    categoryId: pg
      .uuid("category_id")
      .notNull()
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
    index("tasks_event_idx").on(t.eventId),
    index("tasks_category_idx").on(t.categoryId),
    index("tasks_assignee_idx")
      .on(t.assigneeId)
      .where(sql`${t.assigneeId} is not null`),
  ],
);

export type SelectTask = typeof tasksTable.$inferSelect;
