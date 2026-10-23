import { eq } from "drizzle-orm";
import type { Cookie } from "elysia";
import { db } from "$/db";
import { type SelectUser, usersTable } from "$/db/schema";
import { IS_PROD, SESSION_DAYS } from "$/env";
import type { PublicUser, UserRole } from "$/lib/shared/types";
import { coreAuthService } from "./core-auth-service";
import { userCacheService } from "./user-cache-service";

/** Issues a session token and stores it in the httpOnly `token` cookie. */
export async function startSession(
  cookie: Record<string, Cookie<unknown>>,
  userId: number,
  meta: { ip?: string | null; userAgent?: string },
) {
  const { token, expiresAt } = await coreAuthService.issueToken(userId, meta);
  const now = new Date();
  const [row] = await db
    .update(usersTable)
    .set({ lastLoginAt: now, lastSeenAt: now })
    .where(eq(usersTable.id, userId))
    .returning();
  if (row) userCacheService.set(row);
  cookie.token?.set({
    value: token,
    path: "/",
    secure: IS_PROD,
    httpOnly: true,
    sameSite: "lax",
    expires: expiresAt,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export function publicUser(user: SelectUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    notifyPermission: user.notifyPermission,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Creates a login (sign-up, admin panel, seed script). */
export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}) {
  const [user] = await db
    .insert(usersTable)
    .values({
      name: input.name,
      email: input.email,
      passwordHash: await Bun.password.hash(input.password),
      role: input.role ?? "user",
    })
    .returning();
  return user!;
}
