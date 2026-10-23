import { and, asc, eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "$/db";
import { categoriesTable, tasksTable } from "$/db/schema";
import {
  ownedCategory,
  ownedPeople,
  ownsEvent,
} from "$/lib/services/ownership";
import { categoryOut } from "$/lib/services/serialize";
import { fail, ok } from "$/lib/utils";
import { tColor, tIcon, tIdParam, tUuid } from "$/lib/utils/schema";
import { editVerdict, staleEdit, tSyncMeta } from "$/lib/utils/sync";
import { protectedUser } from "$/pre-processor";

const C = categoriesTable;

const categoryBody = t.Object({
  eventId: tUuid,
  name: t.String({ minLength: 1, maxLength: 80 }),
  icon: tIcon,
  color: tColor,
  memberIds: t.Array(tUuid, { maxItems: 100 }),
});

export const categoriesController = new Elysia({
  name: "categories_controller",
  prefix: "/categories",
})
  .use(protectedUser)
  .get("/", async ({ user }) => {
    const rows = await db
      .select()
      .from(C)
      .where(eq(C.userId, user.id))
      .orderBy(asc(C.createdAt));
    return ok(rows.map(categoryOut));
  })
  .post(
    "/",
    async ({ user, body, status }) => {
      if (!(await ownsEvent(user.id, body.eventId)))
        return status(400, fail("That event no longer exists"));
      const [row] = await db
        .insert(C)
        .values({
          ...body,
          name: body.name.trim(),
          memberIds: await ownedPeople(user.id, body.memberIds),
          userId: user.id,
        })
        .onConflictDoNothing({ target: C.id })
        .returning();
      const saved = row ?? (await ownedCategory(user.id, body.id));
      if (!saved) return status(409, fail("That id is already used"));
      return ok(categoryOut(saved), `${saved.name} created`);
    },
    { body: t.Composite([t.Object({ id: tUuid }), categoryBody]) },
  )
  .patch(
    "/:id",
    async ({ user, params, body, status }) => {
      const cat = await ownedCategory(user.id, params.id);
      if (!cat) return status(404, fail("Category not found"));
      if (editVerdict(cat.updatedAt, body) === "stale")
        return status(409, staleEdit(categoryOut(cat)));
      const { baseUpdatedAt: _b, editedAt: _e, memberIds, ...rest } = body;
      const moving = rest.eventId && rest.eventId !== cat.eventId;
      if (moving && !(await ownsEvent(user.id, rest.eventId!)))
        return status(400, fail("That event no longer exists"));
      const row = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(C)
          .set({
            ...rest,
            ...(rest.name && { name: rest.name.trim() }),
            ...(memberIds && {
              memberIds: await ownedPeople(user.id, memberIds),
            }),
          })
          .where(and(eq(C.id, cat.id), eq(C.userId, user.id)))
          .returning();
        // A category's tasks always live in its event.
        if (moving)
          await tx
            .update(tasksTable)
            .set({ eventId: rest.eventId! })
            .where(
              and(
                eq(tasksTable.categoryId, cat.id),
                eq(tasksTable.userId, user.id),
              ),
            );
        return row!;
      });
      return ok(categoryOut(row), "Category saved");
    },
    {
      params: tIdParam,
      body: t.Composite([t.Partial(categoryBody), t.Object(tSyncMeta)]),
    },
  )
  .delete(
    "/:id",
    async ({ user, params }) => {
      // Its tasks go with it (cascade).
      await db.delete(C).where(and(eq(C.id, params.id), eq(C.userId, user.id)));
      return ok(null, "Category deleted");
    },
    { params: tIdParam },
  );
