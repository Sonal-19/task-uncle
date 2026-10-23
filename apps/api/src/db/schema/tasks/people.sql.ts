import { index, pgTable } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.sql";

/** Assignees (no accounts). */
export const peopleTable = pgTable(
  "people",
  (pg) => ({
    id: pg.uuid().primaryKey(),
    userId: pg
      .integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: pg.text().notNull(),
    role: pg.text().notNull().default(""),
    phone: pg.text().notNull().default(""),
    note: pg.text().notNull().default(""),
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
  (t) => [index("people_user_idx").on(t.userId)],
);

export type SelectPerson = typeof peopleTable.$inferSelect;
