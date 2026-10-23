import { and, asc, eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "$/db";
import { eventsTable } from "$/db/schema";
import { eventOut } from "$/lib/services/serialize";
import { eventStatuses } from "$/lib/shared/types";
import { fail, ok } from "$/lib/utils";
import {
  tColor,
  tDate,
  tEnum,
  tIcon,
  tIdParam,
  tUuid,
} from "$/lib/utils/schema";
import { editTime, editVerdict, staleEdit, tSyncMeta } from "$/lib/utils/sync";
import { protectedUser } from "$/pre-processor";

const E = eventsTable;

const eventBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 80 }),
  description: t.String({ maxLength: 1000 }),
  color: tColor,
  icon: tIcon,
  dueDate: t.Nullable(tDate),
});

async function ownedEvent(userId: number, id: string) {
  const [e] = await db
    .select()
    .from(E)
    .where(and(eq(E.id, id), eq(E.userId, userId)))
    .limit(1);
  return e;
}

export const eventsController = new Elysia({
  name: "events_controller",
  prefix: "/events",
})
  .use(protectedUser)
  .get("/", async ({ user }) => {
    const rows = await db
      .select()
      .from(E)
      .where(eq(E.userId, user.id))
      .orderBy(asc(E.createdAt));
    return ok(rows.map(eventOut));
  })
  .post(
    "/",
    async ({ user, body, status }) => {
      const [row] = await db
        .insert(E)
        .values({ ...body, name: body.name.trim(), userId: user.id })
        .onConflictDoNothing({ target: E.id })
        .returning();
      // A retry of a create that already went through gets the saved row.
      const saved = row ?? (await ownedEvent(user.id, body.id));
      if (!saved) return status(409, fail("That id is already used"));
      return ok(eventOut(saved), `${saved.name} created`);
    },
    { body: t.Composite([t.Object({ id: tUuid }), eventBody]) },
  )
  .patch(
    "/:id",
    async ({ user, params, body, status }) => {
      const event = await ownedEvent(user.id, params.id);
      if (!event) return status(404, fail("Event not found"));
      if (editVerdict(event.updatedAt, body) === "stale")
        return status(409, staleEdit(eventOut(event)));
      const { baseUpdatedAt: _b, editedAt, status: next, ...rest } = body;
      const [row] = await db
        .update(E)
        .set({
          ...rest,
          ...(rest.name && { name: rest.name.trim() }),
          ...(next &&
            next !== event.status && {
              status: next,
              archivedAt: next === "archived" ? editTime(editedAt) : null,
            }),
        })
        .where(and(eq(E.id, event.id), eq(E.userId, user.id)))
        .returning();
      return ok(eventOut(row!), "Event saved");
    },
    {
      params: tIdParam,
      body: t.Composite([
        t.Partial(eventBody),
        t.Object({ status: t.Optional(tEnum(eventStatuses)), ...tSyncMeta }),
      ]),
    },
  )
  .delete(
    "/:id",
    async ({ user, params }) => {
      // Categories and tasks go with it (cascade). Already gone is fine.
      await db.delete(E).where(and(eq(E.id, params.id), eq(E.userId, user.id)));
      return ok(null, "Event deleted");
    },
    { params: tIdParam },
  );
