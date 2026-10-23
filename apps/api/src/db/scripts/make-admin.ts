// Promotes an account to admin: bun run --cwd apps/api db:make-admin <email>
import { eq } from "drizzle-orm";
import { db } from "$/db";
import { usersTable } from "$/db/schema";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: bun run db:make-admin <email>");
  process.exit(1);
}
const [row] = await db
  .update(usersTable)
  .set({ role: "admin", status: "active", disabledAt: null })
  .where(eq(usersTable.email, email))
  .returning({ id: usersTable.id, name: usersTable.name });
console.info(
  row
    ? `✅ ${row.name} (${email}) is now an admin`
    : `❌ No account with ${email}`,
);
process.exit(row ? 0 : 1);
