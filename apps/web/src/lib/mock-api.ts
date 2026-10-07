import { buildSeed, type DataState } from "@/lib/mock/seed";
import type {
  Category,
  NotificationLog,
  Person,
  Settings,
  Task,
  TaskEvent,
  TaskStatus,
} from "@/lib/types";
import { useDataStore } from "@/stores/data-store";
import { uid } from "./format";

/**
 * Dummy API over the persisted store, shaped like the future Elysia routes
 * (`GET /events`, `PATCH /tasks/:id` …). Swapping to the real API means
 * replacing these bodies with Eden `call(api…)`; the hooks stay the same.
 */

const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const db = () => useDataStore.getState();
const write = (fn: (s: DataState) => Partial<DataState>) =>
  useDataStore.setState((s) => fn(s));

function notFound(what: string): never {
  throw new Error(`${what} not found`);
}

export type EventInput = Pick<
  TaskEvent,
  "name" | "description" | "color" | "icon" | "dueDate"
>;
export type CategoryInput = Pick<
  Category,
  "eventId" | "name" | "icon" | "color" | "memberIds"
>;
export type PersonInput = Pick<Person, "name" | "role" | "phone" | "note">;
export type TaskInput = Pick<
  Task,
  | "eventId"
  | "categoryId"
  | "title"
  | "notes"
  | "priority"
  | "dueDate"
  | "dueTime"
  | "assigneeId"
  | "amount"
  | "subtasks"
  | "reminder"
> & { status?: TaskStatus };

/** Fields that change with a status, so `completedAt` always tells when it was finished. */
function statusPatch(t: Task, status: TaskStatus): Partial<Task> {
  if (status === t.status) return {};
  const at = now();
  if (status === "done") return { status, completedAt: at, snoozedUntil: null };
  if (status === "in_progress")
    return { status, startedAt: t.startedAt ?? at, completedAt: null };
  return { status, completedAt: null };
}

export const mockApi = {
  // ---- auth (dummy) ----
  async login(email: string, password: string) {
    await wait(500);
    if (
      email.trim().toLowerCase() !== DEMO_USER.email ||
      password !== DEMO_PASSWORD
    )
      throw new Error("Wrong email or password");
    return DEMO_USER;
  },
  async sendResetCode(email: string) {
    await wait(500);
    if (!email.includes("@")) throw new Error("Enter a valid email");
    return { message: `We sent a 6-digit code to ${email}` };
  },
  async resetPassword(otp: string, password: string) {
    await wait(500);
    if (otp !== DEMO_OTP) throw new Error("That code is not right");
    if (password.length < 6)
      throw new Error("Use at least 6 characters for the password");
    return { message: "Password updated. Log in with your new password." };
  },

  // ---- events ----
  async listEvents() {
    await wait();
    return db().events;
  },
  async createEvent(input: EventInput) {
    await wait();
    const row: TaskEvent = {
      ...input,
      id: uid(),
      status: "active",
      archivedAt: null,
      createdAt: now(),
    };
    write((s) => ({ events: [...s.events, row] }));
    return row;
  },
  async updateEvent(id: string, patch: Partial<TaskEvent>) {
    await wait();
    if (!db().events.some((e) => e.id === id)) notFound("Event");
    write((s) => ({
      events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  },
  async setEventStatus(id: string, status: TaskEvent["status"]) {
    return mockApi.updateEvent(id, {
      status,
      archivedAt: status === "archived" ? now() : null,
    });
  },
  /** Deletes the event with its categories and tasks. */
  async deleteEvent(id: string) {
    await wait();
    write((s) => ({
      events: s.events.filter((e) => e.id !== id),
      categories: s.categories.filter((c) => c.eventId !== id),
      tasks: s.tasks.filter((t) => t.eventId !== id),
    }));
  },

  // ---- categories ----
  async listCategories() {
    await wait();
    return db().categories;
  },
  async createCategory(input: CategoryInput) {
    await wait();
    const row: Category = {
      ...input,
      id: uid(),
      kind: input.memberIds.length ? "team" : "general",
      createdAt: now(),
    };
    write((s) => ({ categories: [...s.categories, row] }));
    return row;
  },
  async updateCategory(id: string, patch: Partial<CategoryInput>) {
    await wait();
    write((s) => ({
      categories: s.categories.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c, ...patch };
        return {
          ...next,
          kind: next.memberIds.length ? "team" : "general",
        } as Category;
      }),
      // Moving a category to another event moves its tasks too.
      tasks: patch.eventId
        ? s.tasks.map((t) =>
            t.categoryId === id ? { ...t, eventId: patch.eventId! } : t,
          )
        : s.tasks,
    }));
  },
  async deleteCategory(id: string) {
    await wait();
    write((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      tasks: s.tasks.filter((t) => t.categoryId !== id),
    }));
  },

  // ---- people ----
  async listPeople() {
    await wait();
    return db().people;
  },
  async createPerson(input: PersonInput) {
    await wait();
    const row: Person = { ...input, id: uid(), createdAt: now() };
    write((s) => ({ people: [...s.people, row] }));
    return row;
  },
  async updatePerson(id: string, patch: Partial<PersonInput>) {
    await wait();
    write((s) => ({
      people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  },
  /** Removes the person from groups and unassigns their tasks. */
  async deletePerson(id: string) {
    await wait();
    write((s) => ({
      people: s.people.filter((p) => p.id !== id),
      categories: s.categories.map((c) => {
        const memberIds = c.memberIds.filter((m) => m !== id);
        return memberIds.length === c.memberIds.length
          ? c
          : { ...c, memberIds, kind: memberIds.length ? c.kind : "general" };
      }),
      tasks: s.tasks.map((t) =>
        t.assigneeId === id ? { ...t, assigneeId: null } : t,
      ),
    }));
  },

  // ---- tasks ----
  async listTasks() {
    await wait();
    return db().tasks;
  },
  async createTask(input: TaskInput) {
    await wait();
    const at = now();
    const base: Task = {
      ...input,
      id: uid(),
      status: "pending",
      snoozedUntil: null,
      lastRemindedAt: null,
      createdAt: at,
      updatedAt: at,
      startedAt: null,
      completedAt: null,
    };
    const row = { ...base, ...statusPatch(base, input.status ?? "pending") };
    write((s) => ({ tasks: [row, ...s.tasks] }));
    return row;
  },
  async updateTask(id: string, patch: Partial<TaskInput>) {
    await wait();
    const t = db().tasks.find((x) => x.id === id) ?? notFound("Task");
    const { status, ...rest } = patch;
    const next: Task = {
      ...t,
      ...rest,
      ...(status ? statusPatch(t, status) : {}),
      updatedAt: now(),
    };
    write((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? next : x)) }));
    return next;
  },
  async setTaskStatus(id: string, status: TaskStatus) {
    return mockApi.updateTask(id, { status });
  },
  async snoozeTask(id: string, until: string | null) {
    await wait(60);
    write((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, snoozedUntil: until, updatedAt: now() } : t,
      ),
    }));
  },
  async toggleSubtask(taskId: string, subtaskId: string) {
    await wait(60);
    write((s) => ({
      tasks: s.tasks.map((t) =>
        t.id !== taskId
          ? t
          : {
              ...t,
              updatedAt: now(),
              subtasks: t.subtasks.map((st) =>
                st.id === subtaskId
                  ? { ...st, doneAt: st.doneAt ? null : now() }
                  : st,
              ),
            },
      ),
    }));
  },
  async deleteTask(id: string) {
    await wait();
    write((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },
  /** Used by the reminder engine (no latency, it runs in the background). */
  markReminded(ids: string[], at: string) {
    const set = new Set(ids);
    write((s) => ({
      tasks: s.tasks.map((t) =>
        set.has(t.id) ? { ...t, lastRemindedAt: at } : t,
      ),
    }));
  },

  // ---- settings ----
  async getSettings() {
    await wait(40);
    return db().settings;
  },
  async updateSettings(patch: Partial<Settings>) {
    await wait(60);
    write((s) => ({ settings: { ...s.settings, ...patch } }));
  },

  // ---- notification log ----
  async listLog() {
    await wait(40);
    return db().log;
  },
  addLog(entries: Omit<NotificationLog, "id" | "readAt">[]) {
    write((s) => ({
      log: [
        ...entries.map((e) => ({ ...e, id: uid(), readAt: null })),
        ...s.log,
      ].slice(0, 200),
    }));
  },
  async markLogRead() {
    await wait(40);
    const at = now();
    write((s) => ({
      log: s.log.map((l) => (l.readAt ? l : { ...l, readAt: at })),
    }));
  },
  async clearLog() {
    await wait(40);
    write(() => ({ log: [] }));
  },

  // ---- backup ----
  exportData(): DataState {
    const { events, categories, people, tasks, settings, log } = db();
    return { events, categories, people, tasks, settings, log };
  },
  async importData(data: DataState) {
    await wait();
    if (!Array.isArray(data?.events) || !Array.isArray(data?.tasks))
      throw new Error("That file is not a Task Uncle backup");
    useDataStore.setState({
      events: data.events,
      categories: data.categories ?? [],
      people: data.people ?? [],
      tasks: data.tasks,
      settings: { ...db().settings, ...data.settings },
      log: data.log ?? [],
    });
  },
  async resetDemo() {
    await wait();
    useDataStore.setState(buildSeed());
  },
};

export const DEMO_USER = {
  id: "u-admin",
  name: "Admin",
  email: "admin@taskuncle.app",
  role: "admin" as const,
};
export const DEMO_PASSWORD = "uncle@123";
export const DEMO_OTP = "123456";
