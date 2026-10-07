import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildSeed, type DataState } from "@/lib/mock/seed";

/** Stand-in for the database until `apps/api` exists. Only `lib/mock-api.ts`
 * should read or write it; components go through the hooks. */
export const useDataStore = create<DataState>()(
  persist(() => buildSeed(), {
    name: "tu-data",
    version: 1,
    storage: createJSONStorage(() => localStorage),
  }),
);
