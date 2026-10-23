import { pgTable } from "drizzle-orm/pg-core";

/** The people who log in. Assignees are `people` rows, not users. */
export const usersTable = pgTable("users", (pg) => ({
  id: pg.serial().primaryKey(),
  name: pg.text().notNull(),
  email: pg.text().notNull().unique(),
  passwordHash: pg.text("password_hash").notNull(),
  createdAt: pg
    .timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: pg
    .timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}));

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
