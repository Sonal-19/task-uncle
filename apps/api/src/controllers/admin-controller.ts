import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "$/db";
import {
  authsTable,
  categoriesTable,
  eventsTable,
  notificationLogTable,
  peopleTable,
  pushSubscriptionsTable,
  tasksTable,
  usersTable,
} from "$/db/schema";
import { DEFAULT_TIMEZONE } from "$/env";
import { coreAuthService } from "$/lib/services/core-auth-service";
import { taskOut } from "$/lib/services/serialize";
import { createUser, publicUser } from "$/lib/services/session-service";
import { userCacheService } from "$/lib/services/user-cache-service";
import { onOff, priorities, userRoles, userStatuses } from "$/lib/shared/types";
import { fail, normalizeEmail, ok } from "$/lib/utils";
import { tEnum } from "$/lib/utils/schema";
import { protectedAdmin } from "$/pre-processor";
import { isUniqueViolation } from "./auth-controller";

const U = usersTable;
const A = authsTable;
const T = tasksTable;

const tId = t.Object({ id: t.Numeric({ minimum: 1 }) });
const tEmail = t.String({ format: "email", maxLength: 254 });
const tPassword = t.String({ minLength: 6, maxLength: 128 });

/** Tasks per page in the admin's task list. */
const TASK_PAGE = 50;

/** A session that still works. */
const liveSession = sql`${A.state} = 'active' and ${A.expiresAt} > now()`;
/** "Today" for the stats, in the app's timezone. */
const today = sql`(now() at time zone ${DEFAULT_TIMEZONE})::date`;

// Per-user counts as correlated subqueries. Inside a single-table select
// drizzle drops the table prefix in sql``, so "users"."id" is spelled out.
const perUser = {
  pendingTasks: sql<number>`(select count(*)::int from tasks where tasks.user_id = "users"."id" and tasks.status <> 'done')`,
  doneTasks: sql<number>`(select count(*)::int from tasks where tasks.user_id = "users"."id" and tasks.status = 'done')`,
  overdueTasks: sql<number>`(select count(*)::int from tasks where tasks.user_id = "users"."id" and tasks.status <> 'done' and tasks.due_date < ${today})`,
  events: sql<number>`(select count(*)::int from events where events.user_id = "users"."id")`,
  sessions: sql<number>`(select count(*)::int from auths where auths.user_id = "users"."id" and auths.state = 'active' and auths.expires_at > now())`,
  pushDevices: sql<number>`(select count(*)::int from push_subscriptions where push_subscriptions.user_id = "users"."id")`,
};

const userRow = (u: typeof U.$inferSelect) => ({
  ...publicUser(u),
  status: u.status,
  disabledAt: u.disabledAt?.toISOString() ?? null,
  lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
});

async function findUser(id: number) {
  const [u] = await db.select().from(U).where(eq(U.id, id)).limit(1);
  return u;
}

const adminCount = async () =>
  (
    await db
      .select({ n: count() })
      .from(U)
      .where(and(eq(U.role, "admin"), eq(U.status, "active")))
  )[0]?.n ?? 0;

/** Per-day counts for the last `days` days (oldest first, gaps as 0). */
async function perDay(column: "users" | "completed", days = 14) {
  const rows =
    column === "users"
      ? await db
          .select({
            day: sql<string>`to_char((${U.createdAt} at time zone ${DEFAULT_TIMEZONE})::date, 'YYYY-MM-DD')`,
            n: sql<number>`count(*)::int`,
          })
          .from(U)
          .where(gt(U.createdAt, sql`now() - make_interval(days => ${days})`))
          .groupBy(sql`1`)
      : await db
          .select({
            day: sql<string>`to_char((${T.completedAt} at time zone ${DEFAULT_TIMEZONE})::date, 'YYYY-MM-DD')`,
            n: sql<number>`count(*)::int`,
          })
          .from(T)
          .where(
            and(
              eq(T.status, "done"),
              gt(T.completedAt, sql`now() - make_interval(days => ${days})`),
            ),
          )
          .groupBy(sql`1`);
  const byDay = new Map(rows.map((r) => [r.day, r.n]));
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE });
  return Array.from({ length: days }, (_, i) => {
    const day = fmt.format(new Date(Date.now() - (days - 1 - i) * 86_400_000));
    return { day, count: byDay.get(day) ?? 0 };
  });
}

/**
 * The admin panel. The only routes that read across users (the exception to
 * "every query filters by the session user"); they return counts and
 * account details, never anyone's task contents.
 */
export const adminController = new Elysia({
  name: "admin_controller",
  prefix: "/admin",
})
  .use(protectedAdmin)
  .get("/overview", async () => {
    const [
      [users],
      [tasks],
      [sessions],
      [multi],
      [push],
      [other],
      signups,
      completed,
      recentLogins,
    ] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${U.status} = 'active')::int`,
          disabled: sql<number>`count(*) filter (where ${U.status} = 'disabled')::int`,
          admins: sql<number>`count(*) filter (where ${U.role} = 'admin')::int`,
          notificationsOff: sql<number>`count(*) filter (where ${U.notifyPermission} = 'off')::int`,
          newThisWeek: sql<number>`count(*) filter (where ${U.createdAt} > now() - interval '7 days')::int`,
          activeToday: sql<number>`count(*) filter (where ${U.lastSeenAt} > now() - interval '24 hours')::int`,
        })
        .from(U),
      db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where ${T.status} <> 'done')::int`,
          inProgress: sql<number>`count(*) filter (where ${T.status} = 'in_progress')::int`,
          done: sql<number>`count(*) filter (where ${T.status} = 'done')::int`,
          overdue: sql<number>`count(*) filter (where ${T.status} <> 'done' and ${T.dueDate} < ${today})::int`,
          doneToday: sql<number>`count(*) filter (where ${T.status} = 'done' and (${T.completedAt} at time zone ${DEFAULT_TIMEZONE})::date = ${today})::int`,
        })
        .from(T),
      db
        .select({
          sessions: sql<number>`count(*)::int`,
          users: sql<number>`count(distinct ${A.userId})::int`,
        })
        .from(A)
        .where(liveSession),
      db
        .select({ users: sql<number>`count(*)::int` })
        .from(
          db
            .select({ userId: A.userId })
            .from(A)
            .where(liveSession)
            .groupBy(A.userId)
            .having(sql`count(*) > 1`)
            .as("multi"),
        ),
      db
        .select({
          devices: sql<number>`count(*)::int`,
          users: sql<number>`count(distinct ${pushSubscriptionsTable.userId})::int`,
        })
        .from(pushSubscriptionsTable),
      db
        .select({
          events: sql<number>`(select count(*)::int from ${eventsTable})`,
          people: sql<number>`(select count(*)::int from ${peopleTable})`,
        })
        .from(sql`(select 1) as one`),
      perDay("users"),
      perDay("completed"),
      db
        .select()
        .from(U)
        .where(sql`${U.lastLoginAt} is not null`)
        .orderBy(desc(U.lastLoginAt))
        .limit(8),
    ]);
    return ok({
      users: users!,
      tasks: tasks!,
      logins: {
        sessions: sessions?.sessions ?? 0,
        loggedInUsers: sessions?.users ?? 0,
        multiDeviceUsers: multi?.users ?? 0,
      },
      push: push!,
      events: other?.events ?? 0,
      people: other?.people ?? 0,
      signupsByDay: signups,
      completedByDay: completed,
      recentLogins: recentLogins.map(userRow),
    });
  })
  .get(
    "/users",
    async ({ query }) => {
      const q = query.q?.trim();
      const rows = await db
        .select({ user: U, ...perUser })
        .from(U)
        .where(
          and(
            q
              ? or(ilike(U.name, `%${q}%`), ilike(U.email, `%${q}%`))
              : undefined,
            query.role ? eq(U.role, query.role) : undefined,
            query.status ? eq(U.status, query.status) : undefined,
          ),
        )
        .orderBy(desc(U.createdAt))
        .limit(500);
      return ok(
        rows.map(({ user, ...counts }) => ({ ...userRow(user), ...counts })),
      );
    },
    {
      query: t.Object({
        q: t.Optional(t.String({ maxLength: 100 })),
        role: t.Optional(tEnum(userRoles)),
        status: t.Optional(tEnum(userStatuses)),
      }),
    },
  )
  .get(
    "/users/:id",
    async ({ params, status }) => {
      const [row] = await db
        .select({ user: U, ...perUser })
        .from(U)
        .where(eq(U.id, params.id));
      if (!row) return status(404, fail("User not found"));
      const [sessions, devices] = await Promise.all([
        db
          .select({
            id: A.id,
            ip: A.ip,
            details: A.details,
            createdAt: A.createdAt,
            expiresAt: A.expiresAt,
          })
          .from(A)
          .where(and(eq(A.userId, params.id), liveSession))
          .orderBy(desc(A.createdAt)),
        db
          .select({
            id: pushSubscriptionsTable.id,
            userAgent: pushSubscriptionsTable.userAgent,
            createdAt: pushSubscriptionsTable.createdAt,
            lastSuccessAt: pushSubscriptionsTable.lastSuccessAt,
          })
          .from(pushSubscriptionsTable)
          .where(eq(pushSubscriptionsTable.userId, params.id))
          .orderBy(desc(pushSubscriptionsTable.createdAt)),
      ]);
      const { user, ...counts } = row;
      return ok({
        ...userRow(user),
        ...counts,
        sessions: sessions.map((s) => ({
          id: s.id,
          ip: s.ip,
          userAgent: s.details?.userAgent ?? null,
          createdAt: s.createdAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
        })),
        devices: devices.map((d) => ({
          id: d.id,
          userAgent: d.userAgent,
          createdAt: d.createdAt.toISOString(),
          lastSuccessAt: d.lastSuccessAt?.toISOString() ?? null,
        })),
      });
    },
    { params: tId },
  )
  /** Creates an account (any role), ready to log in. */
  .post(
    "/users",
    async ({ body, status }) => {
      const email = normalizeEmail(body.email);
      try {
        const user = await createUser({
          name: body.name.trim(),
          email,
          password: body.password,
          role: body.role,
        });
        if (body.notifyPermission === "off") {
          const [u] = await db
            .update(U)
            .set({ notifyPermission: "off" })
            .where(eq(U.id, user.id))
            .returning();
          return ok(userRow(u!), `${user.name} created`);
        }
        return ok(userRow(user), `${user.name} created`);
      } catch (e) {
        if (isUniqueViolation(e))
          return status(409, fail("An account with this email already exists"));
        throw e;
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 80 }),
        email: tEmail,
        password: tPassword,
        role: t.Optional(tEnum(userRoles)),
        notifyPermission: t.Optional(tEnum(onOff)),
      }),
    },
  )
  .patch(
    "/users/:id",
    async ({ user: me, params, body, status }) => {
      const target = await findUser(params.id);
      if (!target) return status(404, fail("User not found"));
      const self = target.id === me.id;
      if (self && body.role && body.role !== "admin")
        return status(400, fail("You can't remove your own admin role"));
      if (self && body.status === "disabled")
        return status(400, fail("You can't disable your own account"));
      // Never leave the app without an active admin.
      const losesAdmin =
        target.role === "admin" &&
        target.status === "active" &&
        ((body.role && body.role !== "admin") || body.status === "disabled");
      if (losesAdmin && (await adminCount()) <= 1)
        return status(400, fail("There must be at least one active admin"));

      const email = body.email ? normalizeEmail(body.email) : undefined;
      if (email && email !== target.email) {
        const [taken] = await db
          .select({ id: U.id })
          .from(U)
          .where(and(eq(U.email, email), ne(U.id, target.id)));
        if (taken)
          return status(409, fail("An account with this email already exists"));
      }
      let row: typeof U.$inferSelect | undefined;
      try {
        [row] = await db
          .update(U)
          .set({
            ...(body.name && { name: body.name.trim() }),
            ...(email && { email }),
            ...(body.role && { role: body.role }),
            ...(body.notifyPermission && {
              notifyPermission: body.notifyPermission,
            }),
            ...(body.status &&
              body.status !== target.status && {
                status: body.status,
                disabledAt: body.status === "disabled" ? new Date() : null,
              }),
            ...(body.password && {
              passwordHash: await Bun.password.hash(body.password),
            }),
          })
          .where(eq(U.id, target.id))
          .returning();
      } catch (e) {
        if (isUniqueViolation(e))
          return status(409, fail("An account with this email already exists"));
        throw e;
      }
      userCacheService.set(row!);
      // Disabled, or a new password: every session of theirs ends.
      if (body.status === "disabled" || body.password)
        await coreAuthService.revokeAllForUser(target.id);
      return ok(userRow(row!), "User saved");
    },
    {
      params: tId,
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2, maxLength: 80 })),
        email: t.Optional(tEmail),
        role: t.Optional(tEnum(userRoles)),
        status: t.Optional(tEnum(userStatuses)),
        notifyPermission: t.Optional(tEnum(onOff)),
        /** Sets a new password (and logs them out everywhere). */
        password: t.Optional(tPassword),
      }),
    },
  )
  /** Logs one device out. */
  .delete(
    "/users/:id/sessions/:sessionId",
    async ({ params, status }) => {
      const [s] = await db
        .select({ token: A.token })
        .from(A)
        .where(and(eq(A.id, params.sessionId), eq(A.userId, params.id)));
      if (!s) return status(404, fail("Session not found"));
      await db
        .delete(pushSubscriptionsTable)
        .where(eq(pushSubscriptionsTable.sessionToken, s.token));
      await coreAuthService.revokeToken(s.token);
      return ok(null, "Device logged out");
    },
    {
      params: t.Object({
        id: t.Numeric({ minimum: 1 }),
        sessionId: t.Numeric({ minimum: 1 }),
      }),
    },
  )
  /** Logs them out on every device. */
  .post(
    "/users/:id/logout-all",
    async ({ user: me, params, token, status }) => {
      if (!(await findUser(params.id)))
        return status(404, fail("User not found"));
      // Your own: keep this session.
      await coreAuthService.revokeAllForUser(
        params.id,
        params.id === me.id ? (token ?? undefined) : undefined,
      );
      return ok(null, "Logged out on every device");
    },
    { params: tId },
  )
  /** Deletes the account and everything in it. */
  .delete(
    "/users/:id",
    async ({ user: me, params, status }) => {
      const target = await findUser(params.id);
      if (!target) return status(404, fail("User not found"));
      if (target.id === me.id)
        return status(400, fail("You can't delete your own account"));
      if (target.role === "admin" && (await adminCount()) <= 1)
        return status(400, fail("There must be at least one active admin"));
      await coreAuthService.revokeAllForUser(target.id);
      await db.delete(U).where(eq(U.id, target.id));
      userCacheService.invalidate(target.id);
      return ok(null, `${target.name} deleted`);
    },
    { params: tId },
  )
  /** Every user's tasks, filtered. `status`: pending (not done, the
   * default), in_progress, done, overdue or all. Newest work first: open
   * tasks by due date, finished ones by when they were finished. */
  .get(
    "/tasks",
    async ({ query }) => {
      const status = query.status ?? "pending";
      const where: (SQL | undefined)[] = [
        status === "pending"
          ? ne(T.status, "done")
          : status === "in_progress"
            ? eq(T.status, "in_progress")
            : status === "done"
              ? eq(T.status, "done")
              : status === "overdue"
                ? and(ne(T.status, "done"), sql`${T.dueDate} < ${today}`)
                : undefined,
        query.userId ? eq(T.userId, query.userId) : undefined,
        query.priority ? eq(T.priority, query.priority) : undefined,
        query.q ? ilike(T.title, `%${query.q.trim()}%`) : undefined,
      ];
      const cond = and(...where);
      const limit = TASK_PAGE;
      const offset = ((query.page ?? 1) - 1) * limit;
      const [rows, [total]] = await Promise.all([
        db
          .select({
            task: T,
            user: { id: U.id, name: U.name, email: U.email },
            eventName: eventsTable.name,
            eventColor: eventsTable.color,
            categoryName: categoriesTable.name,
          })
          .from(T)
          .innerJoin(U, eq(U.id, T.userId))
          .leftJoin(eventsTable, eq(eventsTable.id, T.eventId))
          .leftJoin(categoriesTable, eq(categoriesTable.id, T.categoryId))
          .where(cond)
          .orderBy(
            ...(status === "done"
              ? [desc(T.completedAt)]
              : [
                  sql`${T.dueDate} asc nulls last`,
                  asc(T.dueTime),
                  desc(T.createdAt),
                ]),
          )
          .limit(limit)
          .offset(offset),
        db.select({ n: count() }).from(T).where(cond),
      ]);
      return ok({
        total: total?.n ?? 0,
        page: query.page ?? 1,
        pageSize: limit,
        tasks: rows.map((r) => ({
          ...taskOut(r.task),
          user: r.user,
          eventName: r.eventName,
          eventColor: r.eventColor,
          categoryName: r.categoryName,
        })),
      });
    },
    {
      query: t.Object({
        status: t.Optional(
          tEnum(["pending", "in_progress", "done", "overdue", "all"] as const),
        ),
        userId: t.Optional(t.Numeric({ minimum: 1 })),
        priority: t.Optional(tEnum(priorities)),
        q: t.Optional(t.String({ maxLength: 100 })),
        page: t.Optional(t.Numeric({ minimum: 1, maximum: 10_000 })),
      }),
    },
  )
  /** Every session that still works, with whose it is. */
  .get("/sessions", async () => {
    const rows = await db
      .select({
        id: A.id,
        ip: A.ip,
        details: A.details,
        createdAt: A.createdAt,
        user: { id: U.id, name: U.name, email: U.email, role: U.role },
      })
      .from(A)
      .innerJoin(U, eq(U.id, A.userId))
      .where(liveSession)
      .orderBy(desc(A.createdAt))
      .limit(1000);
    return ok(
      rows.map((r) => ({
        id: r.id,
        ip: r.ip,
        userAgent: r.details?.userAgent ?? null,
        createdAt: r.createdAt.toISOString(),
        user: r.user,
      })),
    );
  })
  /** Reminders sent (newest first), across users or for one. */
  .get(
    "/reminders",
    async ({ query }) => {
      const L = notificationLogTable;
      const rows = await db
        .select({
          id: L.id,
          title: L.title,
          body: L.body,
          sentAt: L.sentAt,
          readAt: L.readAt,
          user: { id: U.id, name: U.name },
        })
        .from(L)
        .innerJoin(U, eq(U.id, L.userId))
        .where(query.userId ? eq(L.userId, query.userId) : undefined)
        .orderBy(desc(L.sentAt))
        .limit(300);
      return ok(
        rows.map((r) => ({
          ...r,
          sentAt: r.sentAt.toISOString(),
          readAt: r.readAt?.toISOString() ?? null,
        })),
      );
    },
    { query: t.Object({ userId: t.Optional(t.Numeric({ minimum: 1 })) }) },
  );
