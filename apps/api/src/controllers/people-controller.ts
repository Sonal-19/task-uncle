import { and, asc, eq, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "$/db";
import { categoriesTable, peopleTable } from "$/db/schema";
import { personOut } from "$/lib/services/serialize";
import { fail, ok } from "$/lib/utils";
import { tIdParam, tUuid } from "$/lib/utils/schema";
import { editVerdict, staleEdit, tSyncMeta } from "$/lib/utils/sync";
import { protectedUser } from "$/pre-processor";

const P = peopleTable;
const C = categoriesTable;

const personBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 80 }),
  role: t.String({ maxLength: 80 }),
  phone: t.String({ maxLength: 40 }),
  note: t.String({ maxLength: 1000 }),
});

async function ownedPerson(userId: number, id: string) {
  const [p] = await db
    .select()
    .from(P)
    .where(and(eq(P.id, id), eq(P.userId, userId)))
    .limit(1);
  return p;
}

export const peopleController = new Elysia({
  name: "people_controller",
  prefix: "/people",
})
  .use(protectedUser)
  .get("/", async ({ user }) => {
    const rows = await db
      .select()
      .from(P)
      .where(eq(P.userId, user.id))
      .orderBy(asc(P.createdAt));
    return ok(rows.map(personOut));
  })
  .post(
    "/",
    async ({ user, body, status }) => {
      const [row] = await db
        .insert(P)
        .values({ ...body, name: body.name.trim(), userId: user.id })
        .onConflictDoNothing({ target: P.id })
        .returning();
      const saved = row ?? (await ownedPerson(user.id, body.id));
      if (!saved) return status(409, fail("That id is already used"));
      return ok(personOut(saved), `${saved.name} added`);
    },
    { body: t.Composite([t.Object({ id: tUuid }), personBody]) },
  )
  .patch(
    "/:id",
    async ({ user, params, body, status }) => {
      const person = await ownedPerson(user.id, params.id);
      if (!person) return status(404, fail("Person not found"));
      if (editVerdict(person.updatedAt, body) === "stale")
        return status(409, staleEdit(personOut(person)));
      const { baseUpdatedAt: _b, editedAt: _e, ...rest } = body;
      const [row] = await db
        .update(P)
        .set({ ...rest, ...(rest.name && { name: rest.name.trim() }) })
        .where(and(eq(P.id, person.id), eq(P.userId, user.id)))
        .returning();
      return ok(personOut(row!), "Saved");
    },
    {
      params: tIdParam,
      body: t.Composite([t.Partial(personBody), t.Object(tSyncMeta)]),
    },
  )
  .delete(
    "/:id",
    async ({ user, params }) => {
      await db.transaction(async (tx) => {
        // Out of every team; their tasks become unassigned (FK set null).
        await tx
          .update(C)
          .set({
            memberIds: sql`array_remove(${C.memberIds}, ${params.id}::uuid)`,
          })
          .where(
            and(
              eq(C.userId, user.id),
              sql`${params.id}::uuid = any(${C.memberIds})`,
            ),
          );
        await tx
          .delete(P)
          .where(and(eq(P.id, params.id), eq(P.userId, user.id)));
      });
      return ok(null, "Person removed");
    },
    { params: tIdParam },
  );
