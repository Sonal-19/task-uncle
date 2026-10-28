import { and, desc, eq, inArray } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "$/db";
import { tasksTable } from "$/db/schema";
import { ownedCategory, ownsEvent, ownsPerson } from "$/lib/services/ownership";
import { taskOut } from "$/lib/services/serialize";
import {
  CUSTOM_MINUTES_MAX,
  CUSTOM_MINUTES_MIN,
  checkDay,
  DONE_DATES_MAX,
  onOff,
  placeTask,
  priorities,
  REPEAT_EVERY_MAX,
  repeatFields,
  statusPatch,
  taskReminders,
  taskRepeats,
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
  /** Optional; null = no category. */
  categoryId: t.Nullable(tUuid),
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
  /** Minutes, with reminder = custom. */
  reminderMinutes: t.Optional(
    t.Nullable(
      t.Integer({ minimum: CUSTOM_MINUTES_MIN, maximum: CUSTOM_MINUTES_MAX }),
    ),
  ),
  /** Optional so ops queued by an older build still go through. */
  repeat: t.Optional(tEnum(taskRepeats)),
  /** Every how many days / weeks / months. */
  repeatEvery: t.Optional(t.Integer({ minimum: 1, maximum: REPEAT_EVERY_MAX })),
  /** Weekdays (0 = Sun) of a weekly routine; empty = the start's. */
  repeatDays: t.Optional(
    t.Array(t.Integer({ minimum: 0, maximum: 6 }), { maxItems: 7 }),
  ),
  /** The routine's first occurrence. */
  repeatStart: t.Optional(t.Nullable(tDate)),
  /** "HH:mm" of the routine's reminder. */
  repeatTime: t.Optional(t.Nullable(tTime)),
  /** Occurrences a routine was done (the whole list, like `subtasks`). */
  doneDates: t.Optional(t.Array(tDate, { maxItems: DONE_DATES_MAX })),
});

const extra = {
  /** Optional; with a category, the API takes it from the category. */
  eventId: t.Optional(t.Nullable(tUuid)),
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

const sortedDays = (days: string[]) =>
  days.reduce<string[]>((list, d) => checkDay(list, d, true), []);

/** The event and category a task ends up in (`placeTask`), with the ids
 * checked against the user. A string is the reason it can't. */
async function resolvePlace(
  userId: number,
  current: { eventId: string | null; categoryId: string | null },
  patch: { eventId?: string | null; categoryId?: string | null },
) {
  const candidate =
    patch.categoryId !== undefined ? patch.categoryId : current.categoryId;
  const cat = candidate ? await ownedCategory(userId, candidate) : undefined;
  if (candidate && !cat && patch.categoryId)
    return "That category no longer exists";
  const place = placeTask(current, patch, (id) =>
    cat && cat.id === id ? cat.eventId : undefined,
  );
  if (place.categoryId && !cat) place.categoryId = null;
  // Only an event named without a category needs checking.
  if (place.eventId && !(cat && place.categoryId === cat.id)) {
    if (!(await ownsEvent(userId, place.eventId)))
      return "That event no longer exists";
  }
  return place;
}

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
      const place = await resolvePlace(
        user.id,
        { eventId: null, categoryId: null },
        body,
      );
      if (typeof place === "string") return status(400, fail(place));
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
          ...place,
          title: rest.title.trim(),
          dueTime: rest.dueDate ? rest.dueTime : null,
          ...repeatFields(rest),
          doneDates: sortedDays(rest.doneDates ?? []),
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
        categoryId: _c,
        status: st,
        snoozedUntil,
        assigneeId,
        repeat,
        repeatEvery,
        repeatDays,
        repeatStart,
        repeatTime,
        doneDates,
        tickDay,
        ...rest
      } = body;
      const moving =
        body.categoryId !== undefined || body.eventId !== undefined;
      const place = moving ? await resolvePlace(user.id, task, body) : null;
      if (typeof place === "string") return status(400, fail(place));
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
      const repeating =
        repeat !== undefined ||
        repeatEvery !== undefined ||
        repeatDays !== undefined ||
        repeatStart !== undefined ||
        repeatTime !== undefined
          ? repeatFields({
              repeat: repeat ?? task.repeat,
              repeatEvery: repeatEvery ?? task.repeatEvery,
              repeatDays: repeatDays ?? task.repeatDays,
              repeatStart:
                repeatStart !== undefined ? repeatStart : task.repeatStart,
              repeatTime:
                repeatTime !== undefined ? repeatTime : task.repeatTime,
            })
          : {};
      let days = doneDates && sortedDays(doneDates);
      if (tickDay)
        days = checkDay(
          days ?? task.doneDates,
          tickDay.date,
          tickDay.done === "on",
        );
      const [row] = await db
        .update(T)
        .set({
          ...rest,
          ...(rest.title && { title: rest.title.trim() }),
          ...place,
          ...(!dueDate && { dueTime: null }),
          ...repeating,
          ...(days && { doneDates: days }),
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
          /** Ticks one occurrence of a routine (the service worker's "Mark
           * done", which doesn't know the list). */
          tickDay: t.Optional(t.Object({ date: tDate, done: tEnum(onOff) })),
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
