import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import { userRoles, userStatuses } from "$/lib/shared/types";
import { onOffEnum } from "../tasks/enums.sql";

export const userRoleEnum = pgEnum("user_role", userRoles);
export const userStatusEnum = pgEnum("user_status", userStatuses);

/** The people who log in. Assignees are `people` rows, not users. */
export const usersTable = pgTable("users", (pg) => ({
  id: pg.serial().primaryKey(),
  name: pg.text().notNull(),
  email: pg.text().notNull().unique(),
  passwordHash: pg.text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  status: userStatusEnum("status").notNull().default("active"),
  /** When the account was disabled (null while active). */
  disabledAt: pg.timestamp("disabled_at", { withTimezone: true }),
  /** Set by an admin: "off" = no reminders for this account at all. */
  notifyPermission: onOffEnum("notify_permission").notNull().default("on"),
  lastLoginAt: pg.timestamp("last_login_at", { withTimezone: true }),
  /** Last request from any of their sessions (updated at most every 5 min). */
  lastSeenAt: pg.timestamp("last_seen_at", { withTimezone: true }),
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
