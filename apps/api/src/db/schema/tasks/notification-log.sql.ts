import { index, pgTable } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.sql";
import { tasksTable } from "./tasks.sql";

/** Reminders the app has shown (written by the web's reminder engine). */
export const notificationLogTable = pgTable(
  "notification_log",
  (pg) => ({
    id: pg.uuid().primaryKey(),
    userId: pg
      .integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    taskId: pg
      .uuid("task_id")
      .references(() => tasksTable.id, { onDelete: "set null" }),
    title: pg.text().notNull(),
    body: pg.text().notNull().default(""),
    sentAt: pg.timestamp("sent_at", { withTimezone: true }).notNull(),
    readAt: pg.timestamp("read_at", { withTimezone: true }),
  }),
  (t) => [
    index("notification_log_user_idx").on(t.userId, t.sentAt),
    index("notification_log_task_idx").on(t.taskId),
  ],
);

export type SelectNotificationLog = typeof notificationLogTable.$inferSelect;
