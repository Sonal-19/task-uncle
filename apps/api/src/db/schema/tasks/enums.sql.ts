import { pgEnum } from "drizzle-orm/pg-core";
import {
  eventStatuses,
  onOff,
  priorities,
  reminderEveries,
  taskReminders,
  taskStatuses,
} from "$/lib/shared/types";

export const eventStatusEnum = pgEnum("event_status", eventStatuses);
export const taskStatusEnum = pgEnum("task_status", taskStatuses);
export const priorityEnum = pgEnum("priority", priorities);
export const reminderEveryEnum = pgEnum("reminder_every", reminderEveries);
export const taskReminderEnum = pgEnum("task_reminder", taskReminders);
/** On/off settings (no boolean columns). */
export const onOffEnum = pgEnum("on_off", onOff);
