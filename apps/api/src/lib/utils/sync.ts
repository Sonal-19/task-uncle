import { t } from "elysia";

// Helpers for writes coming from the web app's offline queue. Creates carry
// the row's own UUID, so a retry finds the row instead of adding it twice;
// an edit carries the `updatedAt` it started from plus when the user made
// it, so a change made elsewhere in the meantime is noticed.

/** Optional on every edit the offline queue sends. */
export const tSyncMeta = {
  /** The row's `updatedAt` when this device last saw it. */
  baseUpdatedAt: t.Optional(t.String({ format: "date-time" })),
  /** When the user made this edit (may be well before it reached us). */
  editedAt: t.Optional(t.String({ format: "date-time" })),
};

export type EditVerdict =
  /** Nobody else changed it (or the client didn't say): just save. */
  | "apply"
  /** Changed elsewhere, but this edit was made later: it wins. */
  | "overwrite"
  /** Changed elsewhere after this edit was made: keep theirs. */
  | "stale";

/** Latest edit wins: compares the row's current `updatedAt` with the edit. */
export function editVerdict(
  current: Date | string,
  meta: { baseUpdatedAt?: string; editedAt?: string },
): EditVerdict {
  if (!meta.baseUpdatedAt) return "apply";
  const now = new Date(current).getTime();
  if (now <= new Date(meta.baseUpdatedAt).getTime()) return "apply";
  const editedAt = meta.editedAt ? new Date(meta.editedAt).getTime() : 0;
  return editedAt >= now ? "overwrite" : "stale";
}

/** 409 body for a stale edit: what is saved now, so the client can show it. */
export function staleEdit<T>(current: T) {
  return {
    success: false as const,
    message: "This was changed on another device after your edit",
    data: current,
  };
}

/** When an edit happened, for the timestamps it sets (`completedAt`…):
 * the client's `editedAt`, but never later than now (a fast device clock). */
export function editTime(editedAt?: string) {
  const now = new Date();
  if (!editedAt) return now;
  const at = new Date(editedAt);
  return at < now ? at : now;
}
