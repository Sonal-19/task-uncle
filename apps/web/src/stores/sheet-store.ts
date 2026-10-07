import { create } from "zustand";
import type { Category, Person, Task, TaskEvent } from "@/lib/types";

type TaskDefaults = Partial<
  Pick<Task, "eventId" | "categoryId" | "assigneeId" | "dueDate">
>;

/** Open the create/edit sheets from anywhere (FAB, sidebar, rows). */
interface SheetState {
  task: { open: boolean; editing: Task | null; defaults: TaskDefaults };
  detailId: string | null;
  event: { open: boolean; editing: TaskEvent | null };
  category: { open: boolean; editing: Category | null; eventId: string | null };
  person: { open: boolean; editing: Person | null };
  search: boolean;
  newTask: (defaults?: TaskDefaults) => void;
  editTask: (t: Task) => void;
  closeTask: () => void;
  showTask: (id: string | null) => void;
  newEvent: () => void;
  editEvent: (e: TaskEvent) => void;
  closeEvent: () => void;
  newCategory: (eventId: string) => void;
  editCategory: (c: Category) => void;
  closeCategory: () => void;
  newPerson: () => void;
  editPerson: (p: Person) => void;
  closePerson: () => void;
  setSearch: (open: boolean) => void;
}

export const useSheets = create<SheetState>((set) => ({
  task: { open: false, editing: null, defaults: {} },
  detailId: null,
  event: { open: false, editing: null },
  category: { open: false, editing: null, eventId: null },
  person: { open: false, editing: null },
  search: false,
  newTask: (defaults = {}) =>
    set({ task: { open: true, editing: null, defaults } }),
  editTask: (t) => set({ task: { open: true, editing: t, defaults: {} } }),
  closeTask: () => set((s) => ({ task: { ...s.task, open: false } })),
  showTask: (id) => set({ detailId: id }),
  newEvent: () => set({ event: { open: true, editing: null } }),
  editEvent: (e) => set({ event: { open: true, editing: e } }),
  closeEvent: () => set((s) => ({ event: { ...s.event, open: false } })),
  newCategory: (eventId) =>
    set({ category: { open: true, editing: null, eventId } }),
  editCategory: (c) =>
    set({ category: { open: true, editing: c, eventId: c.eventId } }),
  closeCategory: () =>
    set((s) => ({ category: { ...s.category, open: false } })),
  newPerson: () => set({ person: { open: true, editing: null } }),
  editPerson: (p) => set({ person: { open: true, editing: p } }),
  closePerson: () => set((s) => ({ person: { ...s.person, open: false } })),
  setSearch: (search) => set({ search }),
}));
