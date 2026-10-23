import { and, desc, eq, inArray, isNull, notInArray } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "$/db";
import { notificationLogTable, tasksTable } from "$/db/schema";
import { LOG_LIMIT } from "$/lib/services/data-service";
import { logOut } from "$/lib/services/serialize";
import { ok } from "$/lib/utils";
import { tStamp, tUuid } from "$/lib/utils/schema";
import { protectedUser } from "$/pre-processor";

const L = notificationLogTable;

/** Notification history (the bell). Written by the web's reminder engine. */
export const logController = new Elysia({
  name: "log_controller",
  prefix: "/log",
})
  .use(protectedUser)
  .get("/", async ({ user }) => {
    const rows = await db
      .select()
      .from(L)
      .where(eq(L.userId, user.id))
      .orderBy(desc(L.sentAt))
      .limit(LOG_LIMIT);
    return ok(rows.map(logOut));
  })
  .post(
    "/",
    async ({ user, body }) => {
      const taskIds = [
        ...new Set(body.entries.flatMap((e) => (e.taskId ? [e.taskId] : []))),
      ];
      const mine = new Set(
        taskIds.length
          ? (
              await db
                .select({ id: tasksTable.id })
                .from(tasksTable)
                .where(
                  and(
                    eq(tasksTable.userId, user.id),
                    inArray(tasksTable.id, taskIds),
                  ),
                )
            ).map((r) => r.id)
          : [],
      );
      if (body.entries.length)
        await db
          .insert(L)
          .values(
            body.entries.map((e) => ({
              ...e,
              taskId: e.taskId && mine.has(e.taskId) ? e.taskId : null,
              sentAt: new Date(e.sentAt),
              userId: user.id,
            })),
          )
          // Ids come from the client, so a retried send adds nothing.
          .onConflictDoNothing({ target: L.id });
      // Keep the latest LOG_LIMIT.
      const keep = db
        .select({ id: L.id })
        .from(L)
        .where(eq(L.userId, user.id))
        .orderBy(desc(L.sentAt))
        .limit(LOG_LIMIT);
      await db
        .delete(L)
        .where(and(eq(L.userId, user.id), notInArray(L.id, keep)));
      return ok(null);
    },
    {
      body: t.Object({
        entries: t.Array(
          t.Object({
            id: tUuid,
            taskId: t.Nullable(tUuid),
            title: t.String({ maxLength: 300 }),
            body: t.String({ maxLength: 1000 }),
            sentAt: tStamp,
          }),
          { maxItems: 50 },
        ),
      }),
    },
  )
  .post(
    "/read",
    async ({ user, body }) => {
      await db
        .update(L)
        .set({ readAt: new Date(body.at) })
        .where(and(eq(L.userId, user.id), isNull(L.readAt)));
      return ok(null);
    },
    { body: t.Object({ at: tStamp }) },
  )
  .delete("/", async ({ user }) => {
    await db.delete(L).where(eq(L.userId, user.id));
    return ok(null, "Cleared");
  });
