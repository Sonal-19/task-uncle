import { eq } from "drizzle-orm";
import { db } from "$/db";
import { eventsTable, usersTable } from "$/db/schema";
import { replaceAll } from "$/lib/services/data-service";
import { createUser } from "$/lib/services/session-service";
import { buildSeed } from "./demo-data";

// Safety check: prevent accidental seeding on production.
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.DATABASE_URL?.includes("production");
if (isProduction && process.env.FORCE_SEED !== "true") {
  console.error("❌ SEED BLOCKED: Cannot run seed on production database!");
  process.exit(1);
}

const ADMIN = {
  name: "Admin",
  email: "admin@taskuncle.app",
  password: "uncle@123",
};

let [user] = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, ADMIN.email));
if (!user) {
  user = await createUser({ ...ADMIN, role: "admin" });
  console.info(`👤 Created ${ADMIN.email} / ${ADMIN.password}`);
}

const [hasData] = await db
  .select({ id: eventsTable.id })
  .from(eventsTable)
  .where(eq(eventsTable.userId, user.id))
  .limit(1);
if (hasData && !process.argv.includes("--reset")) {
  console.info("Data already there (pass --reset to replace it with the demo)");
} else {
  await replaceAll(user.id, buildSeed());
  console.info("🌱 Demo data seeded");
}
process.exit(0);
