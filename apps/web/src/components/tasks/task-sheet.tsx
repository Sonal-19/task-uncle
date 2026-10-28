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
import { formatTime, fromAmount, toAmount, todayStr, uid } from "@/lib/format";
import {
  everyLabel,
  INTERVALS,
  PRIORITIES,
  type Priority,
  REPEAT_EVERY_MAX,
  routineLabel,
  routineStart,
  STATUSES,
  type Subtask,
  settingsLabel,
  type Task,
  type TaskReminder,
  type TaskRepeat,
  type TaskStatus,
  WEEK_ORDER,
  WEEKDAYS,
} from "@/lib/types";
import { cn } from "@/lib/utils";
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
  /** How it repeats; `custom` uses `repeatUnit` + `repeatEvery`. */
  repeatPreset: RepeatPreset;
  repeatUnit: Exclude<TaskRepeat, "off">;
  repeatEvery: string;
  /** Weekdays (0 = Sun) of a weekly routine; empty = the start's. */
  repeatDays: number[];
  /** First occurrence (yyyy-MM-dd). */
  repeatStart: string;
  /** "HH:mm" of the routine's reminder. */
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
        repeatPreset: presetOf(editing),
        repeatUnit: editing.repeat === "off" ? "daily" : editing.repeat,
        repeatEvery: String(editing.repeatEvery || 1),
        repeatDays: editing.repeatDays,
        repeatStart:
          editing.repeat === "off" ? todayStr() : routineStart(editing),
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
    // A routine has no due date: it comes back on its own days.
    const routine = f.repeatPreset !== "off";
    const r = repeatOf(f);
    const body: TaskInput = {
      title: f.title.trim(),
      eventId: f.eventId || null,
      categoryId: f.categoryId || null,
      status: routine ? "pending" : f.status,
      priority: f.priority,
      dueDate: routine ? null : f.dueDate || null,
      dueTime: !routine && f.dueDate && f.dueTime ? f.dueTime : null,
      repeat: routine ? r.repeat : "off",
      repeatEvery: routine ? r.repeatEvery : 1,
      repeatDays: routine ? r.repeatDays : [],
      repeatStart: routine ? f.repeatStart || todayStr() : null,
      repeatTime: routine ? f.repeatTime : null,
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
  const routine = f.repeatPreset !== "off";
  const r = repeatOf(f);
  const everyOk =
    r.repeatEvery >= 1 &&
    r.repeatEvery <= REPEAT_EVERY_MAX &&
    Number.isInteger(Number(f.repeatEvery));
  const routineText =
    routine && everyOk
      ? `${routineLabel({
          ...r,
          repeatStart: f.repeatStart || todayStr(),
          createdAt: "",
        })}${f.repeatTime ? ` at ${formatTime(f.repeatTime)}` : ""}`
      : "";

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title={editing ? "Edit task" : "New task"}
      description={
        editing
          ? undefined
          : routine
            ? "A routine: Uncle reminds you each time it comes back until you turn the repeat off."
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

          <Field label="Repeat" htmlFor="t-repeat">
            <SelectField<RepeatPreset>
              id="t-repeat"
              value={f.repeatPreset}
              onChange={(repeatPreset) =>
                setF((p) => ({
                  ...p,
                  repeatPreset,
                  repeatTime: p.repeatTime || p.dueTime || "09:00",
                  // A routine starts where the due date was.
                  repeatStart:
                    p.repeatPreset === "off" && p.dueDate
                      ? p.dueDate
                      : p.repeatStart || todayStr(),
                }))
              }
              options={REPEAT_PRESETS}
            />
          </Field>

          {routine ? (
            <>
              {f.repeatPreset === "custom" && (
                <div className="grid grid-cols-[6rem_1fr] gap-3">
                  <Field label="Every" htmlFor="t-every" required>
                    <Input
                      id="t-every"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={REPEAT_EVERY_MAX}
                      step={1}
                      value={f.repeatEvery}
                      onChange={(e) => set("repeatEvery", e.target.value)}
                    />
                  </Field>
                  <Field label="Unit" htmlFor="t-unit">
                    <SelectField<Exclude<TaskRepeat, "off">>
                      id="t-unit"
                      value={f.repeatUnit}
                      onChange={(v) => set("repeatUnit", v)}
                      options={[
                        { value: "daily", label: "Days" },
                        { value: "weekly", label: "Weeks" },
                        { value: "monthly", label: "Months" },
                      ]}
                    />
                  </Field>
                </div>
              )}
              {r.repeat === "weekly" && f.repeatPreset !== "weekdays" && (
                <Field label="On these days" required>
                  <WeekdayPicker
                    value={r.repeatDays}
                    onChange={(v) => set("repeatDays", v)}
                  />
                </Field>
              )}
              <div className="grid grid-cols-[1fr_8.5rem] gap-3">
                <Field label="Starts on" htmlFor="t-rstart" required>
                  <DateInput
                    id="t-rstart"
                    value={f.repeatStart}
                    onChange={(v) => set("repeatStart", v)}
                  />
                </Field>
                <Field label="Remind at" htmlFor="t-rtime" required>
                  <TimeInput
                    id="t-rtime"
                    placeholder="Pick a time"
                    value={f.repeatTime}
                    onChange={(v) => set("repeatTime", v)}
                  />
                </Field>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                {routineText && (
                  <span className="font-medium text-foreground">
                    {routineText}.{" "}
                  </span>
                )}
                Uncle reminds you on the day, then once a day at this time until
                you tick it off. It keeps coming back until you set Repeat to
                Once.
              </p>
            </>
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

          {editing && !routine && (
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

          {!routine && (
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
          {!routine && f.reminder === "custom" && (
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
                (routine && (!f.repeatTime || !f.repeatStart || !everyOk)) ||
                (!routine &&
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
    repeatPreset: "off",
    repeatUnit: "daily",
    repeatEvery: "1",
    repeatDays: [],
    repeatStart: todayStr(),
    repeatTime: "",
    notes: "",
    subtasks: [],
  };
}

type RepeatPreset =
  | "off"
  | "day"
  | "week"
  | "weekdays"
  | "15days"
  | "month"
  | "custom";

const REPEAT_PRESETS: { value: RepeatPreset; label: string }[] = [
  { value: "off", label: "Once" },
  { value: "day", label: "Every day" },
  { value: "week", label: "Every week" },
  { value: "weekdays", label: "Every weekday (Mon–Fri)" },
  { value: "15days", label: "Every 15 days" },
  { value: "month", label: "Every month" },
  { value: "custom", label: "Custom…" },
];

const MON_FRI = [1, 2, 3, 4, 5];

const PRESET_REPEAT: Record<
  Exclude<RepeatPreset, "off" | "custom">,
  {
    repeat: Exclude<TaskRepeat, "off">;
    repeatEvery: number;
    repeatDays?: number[];
  }
> = {
  day: { repeat: "daily", repeatEvery: 1 },
  week: { repeat: "weekly", repeatEvery: 1 },
  weekdays: { repeat: "weekly", repeatEvery: 1, repeatDays: MON_FRI },
  "15days": { repeat: "daily", repeatEvery: 15 },
  month: { repeat: "monthly", repeatEvery: 1 },
};

/** The preset a saved routine matches (else custom). */
function presetOf(
  t: Pick<Task, "repeat" | "repeatEvery" | "repeatDays">,
): RepeatPreset {
  if (t.repeat === "off") return "off";
  if (t.repeat === "weekly" && t.repeatEvery === 1)
    return t.repeatDays.join() === MON_FRI.join() ? "weekdays" : "week";
  const hit = Object.entries(PRESET_REPEAT).find(
    ([, r]) => r.repeat === t.repeat && r.repeatEvery === t.repeatEvery,
  );
  return (hit?.[0] as RepeatPreset | undefined) ?? "custom";
}

/** 0 = Sun … 6 = Sat of a yyyy-MM-dd. */
const weekdayOfDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`).getUTCDay();

/** The form's repeat as the task's unit + count (+ weekdays). A weekly one
 * with no days picked yet falls on the start's weekday. */
function repeatOf(f: Form) {
  const base =
    f.repeatPreset === "off" || f.repeatPreset === "custom"
      ? {
          repeat: f.repeatUnit,
          repeatEvery: Math.trunc(Number(f.repeatEvery)) || 0,
        }
      : PRESET_REPEAT[f.repeatPreset];
  const repeatDays =
    base.repeat !== "weekly"
      ? []
      : ("repeatDays" in base && base.repeatDays) ||
        (f.repeatDays.length
          ? f.repeatDays
          : [weekdayOfDate(f.repeatStart || todayStr())]);
  return { repeat: base.repeat, repeatEvery: base.repeatEvery, repeatDays };
}

/** Mon … Sun toggles; at least one stays on. */
function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEK_ORDER.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            aria-label={WEEKDAYS[d]}
            onClick={() => {
              if (on && value.length === 1) return;
              onChange(
                on
                  ? value.filter((x) => x !== d)
                  : [...value, d].sort((a, b) => a - b),
              );
            }}
            className={cn(
              "h-10 rounded-lg border text-xs font-semibold transition-colors md:h-9",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:border-primary hover:bg-primary/10",
            )}
          >
            {WEEKDAYS[d]}
          </button>
        );
      })}
    </div>
  );
}

/** A task's repeat as text: "Every 2 h", "As in settings", "Off". */
export function reminderLabel(t: Pick<Task, "reminder" | "reminderMinutes">) {
  if (t.reminder === "inherit") return "As in settings";
  if (t.reminder === "off") return "Off";
  if (t.reminder === "custom")
    return t.reminderMinutes ? everyLabel(t.reminderMinutes) : "As in settings";
  return INTERVALS.find((i) => i.value === t.reminder)?.label ?? "";
}
