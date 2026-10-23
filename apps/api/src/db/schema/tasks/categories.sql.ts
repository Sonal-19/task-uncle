import { sql } from "drizzle-orm";
import { index, pgTable } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.sql";
import { eventsTable } from "./events.sql";

/** A group inside an event. With `member_ids` it is a team (`kind` is
 * derived from it in the API, never stored). */
export const categoriesTable = pgTable(
  "categories",
  (pg) => ({
    id: pg.uuid().primaryKey(),
    userId: pg
      .integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    eventId: pg
      .uuid("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    name: pg.text().notNull(),
    icon: pg.text().notNull(),
    color: pg.text().notNull(),
    /** `people.id`s; removed by the API when a person is deleted. */
    memberIds: pg
      .uuid("member_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
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
    index("categories_user_idx").on(t.userId),
    index("categories_event_idx").on(t.eventId),
  ],
);

export type SelectCategory = typeof categoriesTable.$inferSelect;
