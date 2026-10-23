import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "$/db";
import { userSettingsTable } from "$/db/schema";
import { settingsOut } from "$/lib/services/serialize";
import {
  CUSTOM_MINUTES_MAX,
  CUSTOM_MINUTES_MIN,
  onOff,
  reminderEveries,
} from "$/lib/shared/types";
import { ok } from "$/lib/utils";
import { tEnum, tStamp, tTime } from "$/lib/utils/schema";
import { protectedUser } from "$/pre-processor";

const S = userSettingsTable;

/** An IANA zone the runtime knows, else null (the default is used). */
function validZone(tz: string | null) {
  if (!tz) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

export const settingsController = new Elysia({
  name: "settings_controller",
  prefix: "/settings",
})
  .use(protectedUser)
  .get("/", async ({ user }) => {
    const [row] = await db.select().from(S).where(eq(S.userId, user.id));
    return ok(settingsOut(row));
  })
  .patch(
    "/",
    async ({ user, body }) => {
      const { quietHours, permissionPromptDismissedAt, timezone, ...rest } =
        body;
      const set = {
        ...rest,
        ...(quietHours !== undefined && {
          quietFrom: quietHours?.from ?? null,
          quietTo: quietHours?.to ?? null,
        }),
        ...(timezone !== undefined && { timezone: validZone(timezone) }),
        ...(permissionPromptDismissedAt !== undefined && {
          permissionPromptDismissedAt: permissionPromptDismissedAt
            ? new Date(permissionPromptDismissedAt)
            : null,
        }),
      };
      const [row] = await db
        .insert(S)
        .values({ ...set, userId: user.id })
        .onConflictDoUpdate({
          target: S.userId,
          set: { ...set, userId: user.id },
        })
        .returning();
      return ok(settingsOut(row));
    },
    {
      body: t.Object({
        notifications: t.Optional(tEnum(onOff)),
        interval: t.Optional(tEnum(reminderEveries)),
        /** null = use `interval`. */
        customMinutes: t.Optional(
          t.Nullable(
            t.Integer({
              minimum: CUSTOM_MINUTES_MIN,
              maximum: CUSTOM_MINUTES_MAX,
            }),
          ),
        ),
        quietHours: t.Optional(
          t.Nullable(t.Object({ from: tTime, to: tTime })),
        ),
        overdueBoost: t.Optional(tEnum(onOff)),
        permissionPromptDismissedAt: t.Optional(t.Nullable(tStamp)),
        timezone: t.Optional(t.Nullable(t.String({ maxLength: 64 }))),
      }),
    },
  );
