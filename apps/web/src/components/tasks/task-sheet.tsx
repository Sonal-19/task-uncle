import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DateInput } from "@/components/common/date-input";
import { Field } from "@/components/common/field";
import { ResponsiveSheet } from "@/components/common/responsive-sheet";
import { Segmented } from "@/components/common/segmented";
import { SelectField } from "@/components/common/select-field";
import { TimeInput } from "@/components/common/time-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCategories,
  useCreateTask,
  useEvents,
  usePeople,
  useUpdateTask,
} from "@/hooks/use-data";
import { fromAmount, toAmount, todayStr, uid } from "@/lib/format";
import type { TaskInput } from "@/lib/mock-api";
import {
  INTERVALS,
  PRIORITIES,
  type Priority,
  STATUSES,
  type Subtask,
  type TaskReminder,
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
  notes: string;
  subtasks: Subtask[];
};

export function TaskSheet() {
  const { open, editing, defaults } = useSheets((s) => s.task);
  const close = useSheets((s) => s.closeTask);
  const events = (useEvents().data ?? []).filter((e) => e.status === "active");
  const categories = useCategories().data ?? [];
  const people = usePeople().data ?? [];
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
        eventId: editing.eventId,
        categoryId: editing.categoryId,
        status: editing.status,
        priority: editing.priority,
        dueDate: editing.dueDate ?? "",
        dueTime: editing.dueTime ?? "",
        assigneeId: editing.assigneeId ?? "",
        amount: editing.amount ? String(fromAmount(editing.amount)) : "",
        reminder: editing.reminder,
        notes: editing.notes,
        subtasks: editing.subtasks,
      });
    } else {
      const eventId = defaults.eventId ?? events[0]?.id ?? "";
      setF({
        ...blank(),
        eventId,
        categoryId:
          defaults.categoryId ??
          categories.find((c) => c.eventId === eventId)?.id ??
          "",
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
    const body: TaskInput = {
      title: f.title.trim(),
      eventId: f.eventId,
      categoryId: f.categoryId,
      status: f.status,
      priority: f.priority,
      dueDate: f.dueDate || null,
      dueTime: f.dueDate && f.dueTime ? f.dueTime : null,
      assigneeId: f.assigneeId || null,
      amount: f.amount ? toAmount(Number(f.amount)) : null,
      reminder: f.reminder,
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
  const noEvents = !events.length;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title={editing ? "Edit task" : "New task"}
      description={
        editing ? undefined : "Uncle will keep reminding you until it's done."
      }
    >
      {noEvents ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Create an event first (e.g. a project), then add tasks to it.
        </p>
      ) : (
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
            <Field label="Event" htmlFor="t-event" required>
              <SelectField
                id="t-event"
                required
                placeholder="Choose event"
                value={f.eventId}
                options={events.map((ev) => ({ value: ev.id, label: ev.name }))}
                onChange={(eventId) =>
                  setF((p) => ({
                    ...p,
                    eventId,
                    categoryId:
                      categories.find((c) => c.eventId === eventId)?.id ?? "",
                  }))
                }
              />
            </Field>
            <Field label="Category" htmlFor="t-cat" required>
              <SelectField
                id="t-cat"
                required
                placeholder={
                  eventCats.length ? "Choose category" : "No categories"
                }
                value={f.categoryId}
                options={eventCats.map((c) => ({ value: c.id, label: c.name }))}
                onChange={(v) => set("categoryId", v)}
              />
            </Field>
          </div>

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

          <Field label="Priority">
            <Segmented
              className="flex w-full"
              value={f.priority}
              onChange={(v) => set("priority", v)}
              options={PRIORITIES}
            />
          </Field>

          {editing && (
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

          <Field label="Remind me" htmlFor="t-rem">
            <SelectField<TaskReminder>
              id="t-rem"
              value={f.reminder}
              onChange={(v) => set("reminder", v)}
              options={[
                { value: "inherit", label: "As in settings" },
                ...INTERVALS,
                { value: "off", label: "Don't remind" },
              ]}
            />
          </Field>

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
              disabled={busy || !f.title.trim() || !f.categoryId}
            >
              {editing ? "Save" : "Add task"}
            </Button>
          </div>
        </form>
      )}
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
    notes: "",
    subtasks: [],
  };
}

export const REMINDER_LABEL: Record<TaskReminder, string> = {
  inherit: "As in settings",
  off: "Off",
  ...Object.fromEntries(INTERVALS.map((i) => [i.value, i.label])),
} as Record<TaskReminder, string>;
