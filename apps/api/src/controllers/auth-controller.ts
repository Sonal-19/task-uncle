import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "$/db";
import { usersTable } from "$/db/schema";
import { coreAuthService } from "$/lib/services/core-auth-service";
import { otpService } from "$/lib/services/otp-service";
import { clientIp, rateLimitService } from "$/lib/services/rate-limit-service";
import { publicUser, startSession } from "$/lib/services/session-service";
import { userCacheService } from "$/lib/services/user-cache-service";
import { fail, normalizeEmail, ok } from "$/lib/utils";
import { authProcessor } from "$/pre-processor";

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const tEmail = t.String({ format: "email", maxLength: 254 });
const tPassword = t.String({ minLength: 6, maxLength: 128 });
const tOtp = t.String({ pattern: "^[0-9]{6}$" });

async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  return user;
}

export const authController = new Elysia({
  name: "auth_controller",
  prefix: "/auth",
})
  .post(
    "/login",
    async ({ body, status, cookie, headers, request, server }) => {
      const ip = clientIp(request, server);
      const key = `login:${ip}`;
      if (!rateLimitService.hit(key, LOGIN_LIMIT, LOGIN_WINDOW_MS))
        return status(
          429,
          fail("Too many login attempts. Try again in 15 minutes."),
        );
      const user = await findUserByEmail(normalizeEmail(body.email));
      const valid =
        user && (await Bun.password.verify(body.password, user.passwordHash));
      if (!user || !valid) return status(403, fail("Wrong email or password"));
      rateLimitService.reset(key);
      await startSession(cookie, user.id, {
        ip,
        userAgent: headers["user-agent"],
      });
      return ok(publicUser(user), "Welcome back");
    },
    {
      body: t.Object({
        email: t.String({ minLength: 3, maxLength: 254 }),
        password: t.String({ minLength: 1, maxLength: 128 }),
      }),
    },
  )
  .post(
    "/password/forgot",
    async ({ body, status, request, server }) => {
      if (
        !rateLimitService.hit(`otp:${clientIp(request, server)}`, 10, 3_600_000)
      )
        return status(429, fail("Too many requests. Try again later."));
      const email = normalizeEmail(body.email);
      // Same answer whether or not the account exists (no email enumeration).
      if (await findUserByEmail(email)) {
        const res = await otpService.send(email, "reset_password");
        if (!res.ok && res.reason === "cooldown")
          return status(
            429,
            fail(`Please wait ${res.retryInSec}s before resending`),
          );
      }
      return ok({ email }, `If ${email} has an account, we sent it a code`);
    },
    { body: t.Object({ email: tEmail }) },
  )
  .post(
    "/password/reset",
    async ({ body, status }) => {
      const email = normalizeEmail(body.email);
      const user = await findUserByEmail(email);
      if (!user) return status(400, fail("That code is not right"));
      const check = await otpService.verify(email, "reset_password", body.otp);
      if (!check.ok) return status(400, fail(check.message));
      await db
        .update(usersTable)
        .set({ passwordHash: await Bun.password.hash(body.password) })
        .where(eq(usersTable.id, user.id));
      userCacheService.invalidate(user.id);
      await coreAuthService.revokeAllForUser(user.id);
      return ok(null, "Password updated. Log in with your new password.");
    },
    { body: t.Object({ email: tEmail, otp: tOtp, password: tPassword }) },
  )
  .post("/logout", async ({ cookie }) => {
    if (cookie?.token?.value && typeof cookie.token.value === "string")
      await coreAuthService.revokeToken(cookie.token.value);
    cookie?.token?.remove();
    return ok(null, "Logged out");
  })
  .use(authProcessor)
  .get("/me", ({ auth, status }) => {
    if (!auth?.user) return status(401, fail("Not logged in"));
    return ok(publicUser(auth.user));
  });
