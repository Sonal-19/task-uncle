import { index, pgTable } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.sql";
import { eventStatusEnum } from "./enums.sql";

/** A project or area of life (Shimlawale CRM, Personal…). */
export const eventsTable = pgTable(
  "events",
  (pg) => ({
    /** Made by the client (UUID) so rows created offline keep their id. */
    id: pg.uuid().primaryKey(),
    userId: pg
      .integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: pg.text().notNull(),
    description: pg.text().notNull().default(""),
    color: pg.text().notNull(),
    icon: pg.text().notNull(),
    dueDate: pg.date("due_date", { mode: "string" }),
    status: eventStatusEnum("status").notNull().default("active"),
    archivedAt: pg.timestamp("archived_at", { withTimezone: true }),
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
  (t) => [index("events_user_idx").on(t.userId)],
);

export type SelectEvent = typeof eventsTable.$inferSelect;
