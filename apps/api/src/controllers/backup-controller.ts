import Elysia, { t } from "elysia";
import { buildSeed } from "$/db/seed/demo-data";
import { exportAll, replaceAll } from "$/lib/services/data-service";
import { fail, ok } from "$/lib/utils";
import { protectedUser } from "$/pre-processor";

/** JSON backup of everything, restore, and the demo data. */
export const backupController = new Elysia({
  name: "backup_controller",
  prefix: "/backup",
})
  .use(protectedUser)
  .get("/", async ({ user }) => ok(await exportAll(user.id)))
  .post(
    "/",
    async ({ user, body, status }) => {
      try {
        await replaceAll(user.id, body);
      } catch (e) {
        return status(400, fail((e as Error).message));
      }
      return ok(null, "Backup restored");
    },
    // Checked field by field (and repaired) in `replaceAll`.
    { body: t.Any() },
  )
  .post("/reset-demo", async ({ user }) => {
    await replaceAll(user.id, buildSeed());
    return ok(null, "Demo data restored");
  });
