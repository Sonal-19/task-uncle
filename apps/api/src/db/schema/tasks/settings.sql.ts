import { pgTable } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.sql";
import { onOffEnum, reminderEveryEnum } from "./enums.sql";

/** Reminder settings, one row per user (created on first write; reads fall
 * back to `DEFAULT_SETTINGS`). */
export const userSettingsTable = pgTable("user_settings", (pg) => ({
  userId: pg
    .integer("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  notifications: onOffEnum("notifications").notNull().default("on"),
  interval: reminderEveryEnum("interval").notNull().default("1h"),
  /** "HH:mm"; both null = never quiet. */
  quietFrom: pg.text("quiet_from"),
  quietTo: pg.text("quiet_to"),
  overdueBoost: onOffEnum("overdue_boost").notNull().default("on"),
  permissionPromptDismissedAt: pg.timestamp("permission_prompt_dismissed_at", {
    withTimezone: true,
  }),
  updatedAt: pg
    .timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}));

export type SelectUserSettings = typeof userSettingsTable.$inferSelect;
