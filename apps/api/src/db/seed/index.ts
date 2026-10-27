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

// The admin only gets the admin panel, so the demo data goes to a regular
// demo account.
const ADMIN = {
  name: "Admin",
  email: "admin@taskuncle.app",
  password: "uncle@123",
  role: "admin" as const,
};
const DEMO = {
  name: "Demo User",
  email: "demo@taskuncle.app",
  password: "demo@123",
  role: "user" as const,
};

async function ensureUser(u: typeof ADMIN | typeof DEMO) {
  const [found] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, u.email));
  if (found) return found;
  const created = await createUser(u);
  console.info(`👤 Created ${u.role} ${u.email} / ${u.password}`);
  return created;
}

await ensureUser(ADMIN);
const demo = await ensureUser(DEMO);

const [hasData] = await db
  .select({ id: eventsTable.id })
  .from(eventsTable)
  .where(eq(eventsTable.userId, demo.id))
  .limit(1);
if (hasData && !process.argv.includes("--reset")) {
  console.info("Data already there (pass --reset to replace it with the demo)");
} else {
  await replaceAll(demo.id, buildSeed());
  console.info(`🌱 Demo data seeded for ${DEMO.email}`);
}
process.exit(0);
