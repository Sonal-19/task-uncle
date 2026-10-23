import { t } from "elysia";

/**
 * String enum validator without Elysia's implicit default.
 * `t.UnionEnum` sets `default: values[0]`, which silently fills missing
 * optional query/body fields (e.g. a PATCH without `status` would reset it).
 */
export const tEnum = <const T extends readonly string[]>(values: T) =>
  t.UnionEnum([...values] as unknown as [T[number], ...T[number][]], {
    default: undefined,
  });

export const tUuid = t.String({ format: "uuid" });
export const tIdParam = t.Object({ id: tUuid });
export const tDate = t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" });
export const tTime = t.String({ pattern: "^\\d{2}:\\d{2}$" });
export const tStamp = t.String({ format: "date-time" });
export const tColor = t.String({ pattern: "^#[0-9a-fA-F]{6}$" });
export const tIcon = t.String({ pattern: "^[a-z0-9-]{1,40}$" });
