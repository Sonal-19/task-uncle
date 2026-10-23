import { and, desc, eq, inArray } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "$/db";
import { tasksTable } from "$/db/schema";
import { ownedCategory, ownsPerson } from "$/lib/services/ownership";
import { taskOut } from "$/lib/services/serialize";
import {
  priorities,
  statusPatch,
  taskReminders,
  taskStatuses,
} from "$/lib/shared/types";
import { fail, ok } from "$/lib/utils";
import {
  tDate,
  tEnum,
  tIdParam,
  tStamp,
  tTime,
  tUuid,
} from "$/lib/utils/schema";
import { editTime, editVerdict, staleEdit, tSyncMeta } from "$/lib/utils/sync";
import { protectedUser } from "$/pre-processor";

const T = tasksTable;

const tSubtask = t.Object({
  id: t.String({ minLength: 1, maxLength: 64 }),
  title: t.String({ maxLength: 300 }),
  doneAt: t.Nullable(tStamp),
});

const taskBody = t.Object({
  categoryId: tUuid,
  title: t.String({ minLength: 1, maxLength: 300 }),
  notes: t.String({ maxLength: 5000 }),
  priority: tEnum(priorities),
  dueDate: t.Nullable(tDate),
  dueTime: t.Nullable(tTime),
  assigneeId: t.Nullable(tUuid),
  /** Paise. */
  amount: t.Nullable(t.Integer({ minimum: 1, maximum: 100_000_000_000 })),
  subtasks: t.Array(tSubtask, { maxItems: 100 }),
  reminder: tEnum(taskReminders),
});

const extra = {
  /** Sent by the web for its own copy; the API takes it from the category. */
  eventId: t.Optional(tUuid),
  status: t.Optional(tEnum(taskStatuses)),
};

async function ownedTask(userId: number, id: string) {
  const [row] = await db
    .select()
    .from(T)
    .where(and(eq(T.id, id), eq(T.userId, userId)))
    .limit(1);
  return row;
}

/** An assignee deleted elsewhere just leaves the task unassigned. */
async function assignee(userId: number, id: string | null | undefined) {
  if (id === undefined) return undefined;
  return id && (await ownsPerson(userId, id)) ? id : null;
}

const toDate = (s: string | null) => (s ? new Date(s) : null);

export const tasksController = new Elysia({
  name: "tasks_controller",
  prefix: "/tasks",
})
  .use(protectedUser)
  .get("/", async ({ user }) => {
    const rows = await db
      .select()
      .from(T)
      .where(eq(T.userId, user.id))
      .orderBy(desc(T.createdAt));
    return ok(rows.map(taskOut));
  })
  .post(
    "/",
    async ({ user, body, status }) => {
      const cat = await ownedCategory(user.id, body.categoryId);
      if (!cat) return status(400, fail("That category no longer exists"));
      const { id, status: st, eventId: _e, editedAt, ...rest } = body;
      const at = editTime(editedAt).toISOString();
      const s = statusPatch(
        { status: "pending", startedAt: null },
        st ?? "pending",
        at,
      );
      const [row] = await db
        .insert(T)
        .values({
          ...rest,
          id,
          userId: user.id,
          eventId: cat.eventId,
          title: rest.title.trim(),
          dueTime: rest.dueDate ? rest.dueTime : null,
          assigneeId: await assignee(user.id, rest.assigneeId),
          status: s.status ?? "pending",
          startedAt: toDate(s.startedAt ?? null),
          completedAt: toDate(s.completedAt ?? null),
        })
        .onConflictDoNothing({ target: T.id })
        .returning();
      const saved = row ?? (await ownedTask(user.id, id));
      if (!saved) return status(409, fail("That id is already used"));
      return ok(taskOut(saved), "Task added");
    },
    {
      body: t.Composite([
        t.Object({ id: tUuid, ...extra, editedAt: tSyncMeta.editedAt }),
        taskBody,
      ]),
    },
  )
  .patch(
    "/:id",
    async ({ user, params, body, status }) => {
      const task = await ownedTask(user.id, params.id);
      if (!task) return status(404, fail("Task not found"));
      if (editVerdict(task.updatedAt, body) === "stale")
        return status(409, staleEdit(taskOut(task)));
      const {
        baseUpdatedAt: _b,
        editedAt,
        eventId: _e,
        status: st,
        snoozedUntil,
        assigneeId,
        ...rest
      } = body;
      let eventId: string | undefined;
      if (rest.categoryId && rest.categoryId !== task.categoryId) {
        const cat = await ownedCategory(user.id, rest.categoryId);
        if (!cat) return status(400, fail("That category no longer exists"));
        eventId = cat.eventId;
      }
      const s = st
        ? statusPatch(
            {
              status: task.status,
              startedAt: task.startedAt?.toISOString() ?? null,
            },
            st,
            editTime(editedAt).toISOString(),
          )
        : {};
      const dueDate = rest.dueDate !== undefined ? rest.dueDate : task.dueDate;
      const [row] = await db
        .update(T)
        .set({
          ...rest,
          ...(rest.title && { title: rest.title.trim() }),
          ...(eventId && { eventId }),
          ...(!dueDate && { dueTime: null }),
          ...(assigneeId !== undefined && {
            assigneeId: await assignee(user.id, assigneeId),
          }),
          ...(snoozedUntil !== undefined && {
            snoozedUntil: toDate(snoozedUntil),
          }),
          ...(s.status && { status: s.status }),
          ...("startedAt" in s && { startedAt: toDate(s.startedAt ?? null) }),
          ...("completedAt" in s && {
            completedAt: toDate(s.completedAt ?? null),
          }),
          ...("snoozedUntil" in s && { snoozedUntil: null }),
        })
        .where(and(eq(T.id, task.id), eq(T.userId, user.id)))
        .returning();
      return ok(taskOut(row!), "Task saved");
    },
    {
      params: tIdParam,
      body: t.Composite([
        t.Partial(taskBody),
        t.Object({
          ...extra,
          snoozedUntil: t.Optional(t.Nullable(tStamp)),
          ...tSyncMeta,
        }),
      ]),
    },
  )
  /** The reminder engine stamps what it just notified about. Not an edit:
   * `updatedAt` stays, so it never makes a real edit look outdated. */
  .post(
    "/reminded",
    async ({ user, body }) => {
      if (body.ids.length)
        await db
          .update(T)
          .set({ lastRemindedAt: new Date(body.at), updatedAt: T.updatedAt })
          .where(and(eq(T.userId, user.id), inArray(T.id, body.ids)));
      return ok(null);
    },
    {
      body: t.Object({
        ids: t.Array(tUuid, { maxItems: 1000 }),
        at: tStamp,
      }),
    },
  )
  .delete(
    "/:id",
    async ({ user, params }) => {
      await db.delete(T).where(and(eq(T.id, params.id), eq(T.userId, user.id)));
      return ok(null, "Task deleted");
    },
    { params: tIdParam },
  );
