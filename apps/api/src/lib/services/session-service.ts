import type { Cookie } from "elysia";
import { db } from "$/db";
import { type SelectUser, usersTable } from "$/db/schema";
import { IS_PROD, SESSION_DAYS } from "$/env";
import { coreAuthService } from "./core-auth-service";

/** Issues a session token and stores it in the httpOnly `token` cookie. */
export async function startSession(
  cookie: Record<string, Cookie<unknown>>,
  userId: number,
  meta: { ip?: string | null; userAgent?: string },
) {
  const { token, expiresAt } = await coreAuthService.issueToken(userId, meta);
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

export function publicUser(user: SelectUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Creates a login (seed script). */
export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const [user] = await db
    .insert(usersTable)
    .values({
      name: input.name,
      email: input.email,
      passwordHash: await Bun.password.hash(input.password),
    })
    .returning();
  return user!;
}
