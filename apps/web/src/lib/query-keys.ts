import type { DataState } from "@/lib/types";

/** Every key starts with "tu" so one invalidation refreshes everything. */
export const keys = {
  all: ["tu"] as const,
  events: ["tu", "events"] as const,
  categories: ["tu", "categories"] as const,
  people: ["tu", "people"] as const,
  tasks: ["tu", "tasks"] as const,
  settings: ["tu", "settings"] as const,
  log: ["tu", "log"] as const,
  me: ["tu", "me"] as const,
};

/** The cached collections, which together make up a `DataState`. */
export const DATA_KEYS = [
  "events",
  "categories",
  "people",
  "tasks",
  "settings",
  "log",
] as const satisfies readonly (keyof DataState & keyof typeof keys)[];
export type DataKey = (typeof DATA_KEYS)[number];
