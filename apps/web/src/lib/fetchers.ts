import { api, call } from "@/lib/api";
import type {
  Category,
  NotificationLog,
  Person,
  Settings,
  Task,
  TaskEvent,
} from "@/lib/types";

/** GETs behind each cached collection. */
export const fetchers = {
  events: (): Promise<TaskEvent[]> => call(api.events.get()),
  categories: (): Promise<Category[]> => call(api.categories.get()),
  people: (): Promise<Person[]> => call(api.people.get()),
  tasks: (): Promise<Task[]> => call(api.tasks.get()),
  settings: (): Promise<Settings> => call(api.settings.get()),
  log: (): Promise<NotificationLog[]> => call(api.log.get()),
};
