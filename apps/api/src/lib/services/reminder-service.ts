import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "$/db";
import {
  categoriesTable,
  eventsTable,
  notificationLogTable,
  pushSubscriptionsTable,
  tasksTable,
  userSettingsTable,
  usersTable,
} from "$/db/schema";
import { DEFAULT_TIMEZONE } from "$/env";
import { planReminders, toPushPayload } from "$/lib/shared/reminder-engine";
import { newId } from "$/lib/shared/types";
import { LOG_LIMIT } from "./data-service";
import { pushService } from "./push-service";
import { settingsOut, taskOut } from "./serialize";

const CHECK_EVERY = 60_000;

/**
 * Server-side reminders for users with at least one push-enabled browser,
 * so reminders arrive with the app closed. Same rules as the web's engine
 * (`lib/shared/reminder-engine.ts`); the web's own engine stands down while
 * the server is reachable and the user has push, and takes over offline.
 */
class ReminderService {
  #running = false;

  start() {
    if (!pushService.enabled) return;
    const timer = setInterval(() => void this.runOnce(), CHECK_EVERY);
    if (typeof timer === "object" && "unref" in timer) timer.unref();
    setTimeout(() => void this.runOnce(), 5_000);
    console.info("[Reminders] scheduler started");
  }

  async runOnce(now = new Date()) {
    if (this.#running) return;
    this.#running = true;
    try {
      // Only accounts that are active and allowed reminders by the admin.
      const users = await db
        .selectDistinct({ userId: pushSubscriptionsTable.userId })
        .from(pushSubscriptionsTable)
        .innerJoin(usersTable, eq(usersTable.id, pushSubscriptionsTable.userId))
        .where(
          and(
            eq(usersTable.status, "active"),
            eq(usersTable.notifyPermission, "on"),
          ),
        );
      for (const { userId } of users)
        await this.remindUser(userId, now).catch((err) =>
          console.error(`[Reminders] user ${userId} failed:`, err),
        );
    } finally {
      this.#running = false;
    }
  }

  async remindUser(userId: number, now = new Date()) {
    const [rows, [settingsRow], events, categories] = await Promise.all([
      db
        .select()
        .from(tasksTable)
        .where(
          and(eq(tasksTable.userId, userId), ne(tasksTable.status, "done")),
        ),
      db
        .select()
        .from(userSettingsTable)
        .where(eq(userSettingsTable.userId, userId)),
      db
        .select({ id: eventsTable.id, name: eventsTable.name })
        .from(eventsTable)
        .where(eq(eventsTable.userId, userId)),
      db
        .select({ id: categoriesTable.id, name: categoriesTable.name })
        .from(categoriesTable)
        .where(eq(categoriesTable.userId, userId)),
    ]);
    const settings = settingsOut(settingsRow);
    settings.timezone ??= DEFAULT_TIMEZONE;
    const names = new Map(
      [...events, ...categories].map((r) => [r.id, r.name]),
    );
    const { due, entries } = planReminders(
      rows.map(taskOut),
      settings,
      (t) =>
        [
          t.eventId && names.get(t.eventId),
          t.categoryId && names.get(t.categoryId),
        ]
          .filter(Boolean)
          .join(" · "),
      now,
    );
    if (!due.length) return 0;

    // Stamp first (not an edit: updatedAt stays), then log, then push.
    await db
      .update(tasksTable)
      .set({ lastRemindedAt: now, updatedAt: tasksTable.updatedAt })
      .where(
        and(
          eq(tasksTable.userId, userId),
          inArray(
            tasksTable.id,
            due.map((t) => t.id),
          ),
        ),
      );
    await db.insert(notificationLogTable).values(
      entries.map((e) => ({
        id: newId(),
        userId,
        taskId: e.taskId,
        title: e.title,
        body: e.body,
        sentAt: now,
      })),
    );
    await db.execute(sql`
      delete from ${notificationLogTable}
      where ${notificationLogTable.userId} = ${userId}
        and ${notificationLogTable.id} not in (
          select ${notificationLogTable.id} from ${notificationLogTable}
          where ${notificationLogTable.userId} = ${userId}
          order by ${notificationLogTable.sentAt} desc limit ${LOG_LIMIT}
        )`);
    await pushService.sendToUser(userId, entries.map(toPushPayload));
    return due.length;
  }
}

export const reminderService = new ReminderService();
