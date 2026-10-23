import { and, eq, inArray } from "drizzle-orm";
import { db } from "$/db";
import { categoriesTable, eventsTable, peopleTable } from "$/db/schema";

// Ids that arrive in a body (eventId, categoryId, memberIds…) are only
// used after checking they belong to the session user.

export async function ownsEvent(userId: number, id: string) {
  const [row] = await db
    .select({ id: eventsTable.id })
    .from(eventsTable)
    .where(and(eq(eventsTable.id, id), eq(eventsTable.userId, userId)))
    .limit(1);
  return !!row;
}

export async function ownedCategory(userId: number, id: string) {
  const [row] = await db
    .select()
    .from(categoriesTable)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
    .limit(1);
  return row;
}

export async function ownsPerson(userId: number, id: string) {
  const [row] = await db
    .select({ id: peopleTable.id })
    .from(peopleTable)
    .where(and(eq(peopleTable.id, id), eq(peopleTable.userId, userId)))
    .limit(1);
  return !!row;
}

/** The given person ids that belong to the user, in the given order. */
export async function ownedPeople(userId: number, ids: string[]) {
  if (!ids.length) return [];
  const rows = await db
    .select({ id: peopleTable.id })
    .from(peopleTable)
    .where(and(eq(peopleTable.userId, userId), inArray(peopleTable.id, ids)));
  const mine = new Set(rows.map((r) => r.id));
  return [...new Set(ids)].filter((id) => mine.has(id));
}
