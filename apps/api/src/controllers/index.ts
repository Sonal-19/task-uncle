import Elysia from "elysia";
import { adminController } from "./admin-controller";
import { authController } from "./auth-controller";
import { backupController } from "./backup-controller";
import { categoriesController } from "./categories-controller";
import { eventsController } from "./events-controller";
import { logController } from "./log-controller";
import { peopleController } from "./people-controller";
import { pushController } from "./push-controller";
import { settingsController } from "./settings-controller";
import { tasksController } from "./tasks-controller";

/** Logged-in routes. Grouped so protectedUser's scoped hooks stop here
 * and never leak onto the public auth routes. */
const userControllers = new Elysia({ name: "user_controllers" })
  .use(eventsController)
  .use(categoriesController)
  .use(peopleController)
  .use(tasksController)
  .use(settingsController)
  .use(logController)
  .use(backupController)
  .use(pushController);

/** Admin-only routes, grouped for the same reason as above. */
const adminControllers = new Elysia({ name: "admin_controllers" }).use(
  adminController,
);

export const mainController = new Elysia({
  name: "router",
  prefix: "/api",
})
  .use(authController)
  .use(userControllers)
  .use(adminControllers);
