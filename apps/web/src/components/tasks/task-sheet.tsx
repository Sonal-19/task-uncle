import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DateInput } from "@/components/common/date-input";
import {
  DurationPicker,
  validRepeat,
} from "@/components/common/duration-picker";
import { Field } from "@/components/common/field";
import { ResponsiveSheet } from "@/components/common/responsive-sheet";
import { Segmented } from "@/components/common/segmented";
import { SelectField } from "@/components/common/select-field";
import { TimeInput } from "@/components/common/time-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TaskInput } from "@/hooks/use-data";
import {
  useCategories,
  useCreateTask,
  useEvents,
  usePeople,
  useSettings,
  useUpdateTask,
} from "@/hooks/use-data";
import { fromAmount, toAmount, todayStr, uid } from "@/lib/format";
import {
  everyLabel,
  INTERVALS,
  PRIORITIES,
  type Priority,
  STATUSES,
  type Subtask,
  settingsLabel,
  type Task,
  type TaskReminder,
  type TaskRepeat,
  type TaskStatus,
} from "@/lib/types";
import { useSheets } from "@/stores/sheet-store";

type Form = {
  title: string;
  eventId: string;
  categoryId: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  dueTime: string;
  assigneeId: string;
  amount: string;
  reminder: TaskReminder;
  /** Repeat for `reminder` = custom. */
  reminderMinutes: number;
  repeat: TaskRepeat;
  /** "HH:mm" of the daily reminder. */
  repeatTime: string;
  notes: string;
  subtasks: Subtask[];
};

export function TaskSheet() {
  const { open, editing, defaults } = useSheets((s) => s.task);
  const close = useSheets((s) => s.closeTask);
  const events = (useEvents().data ?? []).filter((e) => e.status === "active");
  const categories = useCategories().data ?? [];
  const people = usePeople().data ?? [];
  const settings = useSettings().data;
  const create = useCreateTask();
  const update = useUpdateTask();
  const [f, setF] = useState<Form>(blank());
  const [newSub, setNewSub] = useState("");

  // Reset only when the sheet opens.
  useEffect(() => {
    if (!open) return;
    setNewSub("");
    if (editing) {
      setF({
        title: editing.title,
        eventId: editing.eventId ?? "",
        categoryId: editing.categoryId ?? "",
        status: editing.status,
        priority: editing.priority,
        dueDate: editing.dueDate ?? "",
        dueTime: editing.dueTime ?? "",
        assigneeId: editing.assigneeId ?? "",
        amount: editing.amount ? String(fromAmount(editing.amount)) : "",
        reminder: editing.reminder,
        reminderMinutes: editing.reminderMinutes ?? 120,
        repeat: editing.repeat,
        repeatTime: editing.repeatTime ?? "",
        notes: editing.notes,
        subtasks: editing.subtasks,
      });
    } else {
      // Both optional: pre-filled only from the page it was opened on.
      setF({
        ...blank(),
        eventId: defaults.eventId ?? "",
        categoryId: defaults.categoryId ?? "",
        assigneeId: defaults.assigneeId ?? "",
        dueDate: defaults.dueDate ?? todayStr(),
      });
    }
  }, [open]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setF((p) => ({ ...p, [k]: v }));
  const eventCats = categories.filter((c) => c.eventId === f.eventId);
  const team = categories.find((c) => c.id === f.categoryId)?.memberIds ?? [];
  // Team members first in the assignee list.
  const sortedPeople = [...people].sort(
    (a, b) => Number(team.includes(b.id)) - Number(team.includes(a.id)),
  );

  function addSub() {
    const title = newSub.trim();
    if (!title) return;
    set("subtasks", [...f.subtasks, { id: uid(), title, doneAt: null }]);
    setNewSub("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // A daily task has no due date: it comes back every day.
    const daily = f.repeat === "daily";
    const body: TaskInput = {
      title: f.title.trim(),
      eventId: f.eventId || null,
      categoryId: f.categoryId || null,
      status: daily ? "pending" : f.status,
      priority: f.priority,
      dueDate: daily ? null : f.dueDate || null,
      dueTime: !daily && f.dueDate && f.dueTime ? f.dueTime : null,
      repeat: daily ? "daily" : "off",
      repeatTime: daily ? f.repeatTime : null,
      assigneeId: f.assigneeId || null,
      amount: f.amount ? toAmount(Number(f.amount)) : null,
      reminder: f.reminder,
      reminderMinutes: f.reminder === "custom" ? f.reminderMinutes : null,
      notes: f.notes.trim(),
      subtasks: newSub.trim()
        ? [...f.subtasks, { id: uid(), title: newSub.trim(), doneAt: null }]
        : f.subtasks,
    };
    const opts = { onSuccess: close };
    if (editing) update.mutate({ id: editing.id, ...body }, opts);
    else create.mutate(body, opts);
  }

  const busy = create.isPending || update.isPending;
  const daily = f.repeat === "daily";

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title={editing ? "Edit task" : "New task"}
      description={
        editing
          ? undefined
          : daily
            ? "Uncle reminds you every day until you turn the repeat off."
            : "Uncle will keep reminding you until it's done."
      }
    >
      {
        <form onSubmit={submit} className="space-y-4">
          <Field label="What needs to be done?" htmlFor="t-title" required>
            <Input
              id="t-title"
              required
              autoFocus={!editing}
              placeholder="e.g. Buy the domain"
              value={f.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Event" htmlFor="t-event">
              <SelectField
                id="t-event"
                placeholder="No event"
                value={f.eventId}
                options={[
                  { value: "", label: "No event" },
                  ...events.map((ev) => ({ value: ev.id, label: ev.name })),
                ]}
                onChange={(eventId) =>
                  // A category belongs to one event: changing the event clears it.
                  setF((p) => ({ ...p, eventId, categoryId: "" }))
                }
              />
            </Field>
            <Field label="Category" htmlFor="t-cat">
              <SelectField
                id="t-cat"
                disabled={!f.eventId}
                placeholder={
                  !f.eventId
                    ? "Pick an event first"
                    : eventCats.length
                      ? "No category"
                      : "No categories yet"
                }
                value={f.categoryId}
                options={[
                  { value: "", label: "No category" },
                  ...eventCats.map((c) => ({ value: c.id, label: c.name })),
                ]}
                onChange={(v) => set("categoryId", v)}
              />
            </Field>
          </div>

          <Field label="Repeat">
            <Segmented<TaskRepeat>
              className="flex w-full"
              value={f.repeat}
              onChange={(repeat) =>
                setF((p) => ({
                  ...p,
                  repeat,
                  repeatTime: p.repeatTime || p.dueTime || "09:00",
                }))
              }
              options={[
                { value: "off", label: "Once" },
                { value: "daily", label: "Every day" },
              ]}
            />
          </Field>

          {daily ? (
            <Field
              label="Remind me every day at"
              htmlFor="t-rtime"
              required
              hint="One reminder a day at this time. Tick off each day when it's done; it keeps coming until you set Repeat back to Once."
            >
              <TimeInput
                id="t-rtime"
                placeholder="Pick a time"
                value={f.repeatTime}
                onChange={(v) => set("repeatTime", v)}
              />
            </Field>
          ) : (
            <div className="grid grid-cols-[1fr_8.5rem] gap-3">
              <Field label="Due date" htmlFor="t-date">
                <DateInput
                  id="t-date"
                  value={f.dueDate}
                  onChange={(v) => set("dueDate", v)}
                />
              </Field>
              <Field label="Time" htmlFor="t-time">
                <TimeInput
                  id="t-time"
                  placeholder="Any time"
                  disabled={!f.dueDate}
                  value={f.dueTime}
                  onChange={(v) => set("dueTime", v)}
                />
              </Field>
            </div>
          )}

          <Field label="Priority">
            <Segmented
              className="flex w-full"
              value={f.priority}
              onChange={(v) => set("priority", v)}
              options={PRIORITIES}
            />
          </Field>

          {editing && !daily && (
            <Field label="Status">
              <Segmented
                className="flex w-full"
                value={f.status}
                onChange={(v) => set("status", v)}
                options={STATUSES}
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Assigned to" htmlFor="t-who">
              <SelectField
                id="t-who"
                value={f.assigneeId}
                onChange={(v) => set("assigneeId", v)}
                options={[
                  { value: "", label: "Myself" },
                  ...sortedPeople.map((p) => ({
                    value: p.id,
                    label: `${p.name}${team.includes(p.id) ? " ★" : ""}`,
                  })),
                ]}
              />
            </Field>
            <Field
              label="Pending amount (₹)"
              htmlFor="t-amt"
              hint="For payments to make"
            >
              <Input
                id="t-amt"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0"
                value={f.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </Field>
          </div>

          {!daily && (
            <Field label="Remind me" htmlFor="t-rem">
              <SelectField<TaskReminder>
                id="t-rem"
                value={f.reminder}
                onChange={(v) => set("reminder", v)}
                options={[
                  {
                    value: "inherit",
                    label: settings
                      ? `As in settings (${settingsLabel(settings).toLowerCase()})`
                      : "As in settings",
                  },
                  ...INTERVALS,
                  { value: "custom", label: "Custom…" },
                  { value: "off", label: "Don't remind" },
                ]}
              />
            </Field>
          )}
          {!daily && f.reminder === "custom" && (
            <DurationPicker
              // Fresh drafts each time the sheet opens.
              key={`${open}-${editing?.id ?? "new"}`}
              value={f.reminderMinutes}
              onChange={(m) => set("reminderMinutes", m)}
              label="Task reminder"
              hint={(m) =>
                `This task reminds ${everyLabel(m).toLowerCase()} until it's done.`
              }
            />
          )}

          <Field label="Checklist">
            <div className="space-y-2">
              {f.subtasks.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${s.title}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      set(
                        "subtasks",
                        f.subtasks.filter((x) => x.id !== s.id),
                      )
                    }
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a step"
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSub();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addSub}
                  aria-label="Add step"
                  className="h-11 w-11 md:h-9 md:w-9"
                >
                  <Plus />
                </Button>
              </div>
            </div>
          </Field>

          <Field label="Notes" htmlFor="t-notes">
            <Textarea
              id="t-notes"
              rows={3}
              placeholder="Phone number, address, what was discussed…"
              value={f.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>

          <div className="sticky bottom-0 -mx-1 flex gap-2 bg-card px-1 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                busy ||
                !f.title.trim() ||
                (daily && !f.repeatTime) ||
                (!daily &&
                  f.reminder === "custom" &&
                  !validRepeat(f.reminderMinutes))
              }
            >
              {editing ? "Save" : "Add task"}
            </Button>
          </div>
        </form>
      }
    </ResponsiveSheet>
  );
}

function blank(): Form {
  return {
    title: "",
    eventId: "",
    categoryId: "",
    status: "pending",
    priority: "medium",
    dueDate: todayStr(),
    dueTime: "",
    assigneeId: "",
    amount: "",
    reminder: "inherit",
    reminderMinutes: 120,
    repeat: "off",
    repeatTime: "",
    notes: "",
    subtasks: [],
  };
}

/** A task's repeat as text: "Every 2 h", "As in settings", "Off". */
export function reminderLabel(t: Pick<Task, "reminder" | "reminderMinutes">) {
  if (t.reminder === "inherit") return "As in settings";
  if (t.reminder === "off") return "Off";
  if (t.reminder === "custom")
    return t.reminderMinutes ? everyLabel(t.reminderMinutes) : "As in settings";
  return INTERVALS.find((i) => i.value === t.reminder)?.label ?? "";
}
