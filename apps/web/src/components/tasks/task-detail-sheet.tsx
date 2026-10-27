import { Link } from "@tanstack/react-router";
import {
  addHours,
  format,
  parseISO,
  setHours,
  setMinutes,
  startOfTomorrow,
} from "date-fns";
import {
  AlarmClock,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  IndianRupee,
  Pencil,
  Play,
  Repeat,
  RotateCcw,
  Trash2,
  User,
} from "lucide-react";
import type * as React from "react";
import {
  Avatar,
  IconTile,
  PriorityFlag,
  StatusBadge,
} from "@/components/common/badges";
import { confirm } from "@/components/common/confirm-dialog";
import { ResponsiveSheet } from "@/components/common/responsive-sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useDeleteTask,
  useLookups,
  useSetTaskDay,
  useSetTaskStatus,
  useSettings,
  useSnoozeTask,
  useTasks,
  useToggleSubtask,
  useUpdateTask,
} from "@/hooks/use-data";
import {
  doneToday,
  formatAmount,
  formatDateTime,
  formatDue,
  formatUpcoming,
  isOverdue,
  lastDays,
  parseDay,
  streakOf,
  todayStr,
} from "@/lib/format";
import { nextReminderAt } from "@/lib/reminders/reminder-engine";
import { isDaily, type Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSheets } from "@/stores/sheet-store";
import { reminderLabel } from "./task-sheet";

export function TaskDetailSheet() {
  const id = useSheets((s) => s.detailId);
  const showTask = useSheets((s) => s.showTask);
  const editTask = useSheets((s) => s.editTask);
  const task = (useTasks().data ?? []).find((t) => t.id === id);
  const settings = useSettings().data;
  const { eventById, categoryById, personById } = useLookups();
  const setStatus = useSetTaskStatus();
  const setDay = useSetTaskDay();
  const update = useUpdateTask();
  const snooze = useSnoozeTask();
  const toggleSub = useToggleSubtask();
  const del = useDeleteTask();

  const open = !!id && !!task;
  const close = () => showTask(null);

  if (!task)
    return (
      <ResponsiveSheet open={false} onOpenChange={close} title="Task">
        {null}
      </ResponsiveSheet>
    );

  const ev = task.eventId ? eventById.get(task.eventId) : undefined;
  const cat = task.categoryId ? categoryById.get(task.categoryId) : undefined;
  const who = task.assigneeId ? personById.get(task.assigneeId) : undefined;
  const done = task.status === "done";
  const daily = isDaily(task) && !done;
  const today = daily && doneToday(task);
  const overdue = isOverdue(task);
  const next = settings ? nextReminderAt(task, settings) : null;
  const snoozed =
    !done && task.snoozedUntil && Date.parse(task.snoozedUntil) > Date.now();

  const snoozeTo = (d: Date) =>
    snooze.mutate({ id: task.id, until: d.toISOString() });

  async function remove() {
    if (
      await confirm({
        title: "Delete this task?",
        description: task?.title,
        confirmText: "Delete",
        destructive: true,
      })
    ) {
      del.mutate(task!.id, { onSuccess: close });
    }
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title={task.title}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {daily ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Repeat className="size-3.5" /> Every day
            </span>
          ) : (
            <StatusBadge status={overdue ? "overdue" : task.status} />
          )}
          <PriorityFlag priority={task.priority} withLabel />
          {snoozed && (
            <span className="text-xs font-medium text-pending">
              Snoozed till {formatDateTime(task.snoozedUntil!)}
            </span>
          )}
        </div>

        {ev && cat && (
          <Link
            to="/events/$eventId/$categoryId"
            params={{ eventId: ev.id, categoryId: cat.id }}
            onClick={close}
            className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted"
          >
            <IconTile icon={cat.icon} color={cat.color} />
            <div className="min-w-0">
              <p className="truncate font-medium">{cat.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {ev.name}
              </p>
            </div>
          </Link>
        )}
        {ev && !cat && (
          <Link
            to="/events/$eventId"
            params={{ eventId: ev.id }}
            onClick={close}
            className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted"
          >
            <IconTile icon={ev.icon} color={ev.color} />
            <div className="min-w-0">
              <p className="truncate font-medium">{ev.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                No category
              </p>
            </div>
          </Link>
        )}

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Info
            icon={daily ? <Repeat /> : <Clock />}
            label={daily ? "Repeats" : "Due"}
          >
            <span className={cn(overdue && "font-semibold text-overdue")}>
              {formatDue(task)}
            </span>
          </Info>
          <Info icon={<User />} label="Assigned to">
            {who ? (
              <span className="flex items-center gap-1.5">
                <Avatar name={who.name} className="size-5 text-[8px]" />
                <span className="truncate">{who.name}</span>
              </span>
            ) : (
              "Myself"
            )}
          </Info>
          {!!task.amount && (
            <Info
              icon={<IndianRupee />}
              label={done ? "Paid" : "Pending amount"}
            >
              <span className="tabular font-semibold">
                {formatAmount(task.amount)}
              </span>
            </Info>
          )}
          <Info icon={<Bell />} label="Reminders">
            {done
              ? "Stopped (done)"
              : daily
                ? next
                  ? `Next ${formatUpcoming(next)}`
                  : "Once a day"
                : task.reminder === "off"
                  ? "Off"
                  : next
                    ? `Next ${formatUpcoming(next)}`
                    : reminderLabel(task)}
          </Info>
        </dl>

        {daily && (
          <DayHistory
            task={task}
            onToggle={(date, done) =>
              setDay.mutate({ id: task.id, date, done })
            }
          />
        )}

        {task.subtasks.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">
              Checklist · {task.subtasks.filter((s) => s.doneAt).length}/
              {task.subtasks.length}
            </p>
            <div className="space-y-1">
              {task.subtasks.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    toggleSub.mutate({ taskId: task.id, subtaskId: s.id })
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-md border-2",
                      s.doneAt
                        ? "border-done bg-done text-white"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {s.doneAt && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span
                    className={cn(
                      s.doneAt && "text-muted-foreground line-through",
                    )}
                  >
                    {s.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {task.notes && (
          <div>
            <p className="mb-1 text-sm font-semibold">Notes</p>
            <p className="whitespace-pre-line rounded-xl bg-muted p-3 text-sm">
              {task.notes}
            </p>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold">Timeline</p>
          <ol className="space-y-2 border-l-2 pl-4 text-sm">
            <Step label="Created" at={task.createdAt} />
            {task.startedAt && <Step label="Started" at={task.startedAt} />}
            {task.lastRemindedAt && (
              <Step label="Last reminded" at={task.lastRemindedAt} />
            )}
            {task.completedAt && (
              <Step label="Completed" at={task.completedAt} tone="done" />
            )}
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {done ? (
            <Button
              variant="outline"
              className="col-span-2"
              onClick={() =>
                setStatus.mutate({ id: task.id, status: "pending" })
              }
            >
              <RotateCcw /> Reopen task
            </Button>
          ) : daily ? (
            <>
              {today ? (
                <Button
                  variant="outline"
                  className="col-span-2"
                  onClick={() =>
                    setDay.mutate({
                      id: task.id,
                      date: todayStr(),
                      done: false,
                    })
                  }
                >
                  <RotateCcw /> Not done today
                </Button>
              ) : (
                <Button
                  className="col-span-2 bg-done text-white hover:bg-done/90 dark:text-emerald-950"
                  onClick={() =>
                    setDay.mutate({ id: task.id, date: todayStr(), done: true })
                  }
                >
                  <CheckCircle2 /> Done for today
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => update.mutate({ id: task.id, repeat: "off" })}
              >
                <Repeat /> Stop repeating
              </Button>
              <Button
                variant="outline"
                disabled={today}
                onClick={() => snoozeTo(addHours(new Date(), 1))}
              >
                <AlarmClock /> Snooze 1h
              </Button>
            </>
          ) : (
            <>
              <Button
                className="col-span-2 bg-done text-white hover:bg-done/90 dark:text-emerald-950"
                onClick={() =>
                  setStatus.mutate(
                    { id: task.id, status: "done", prev: task.status },
                    { onSuccess: close },
                  )
                }
              >
                <CheckCircle2 /> Mark as done
              </Button>
              {task.status === "pending" ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    setStatus.mutate({ id: task.id, status: "in_progress" })
                  }
                >
                  <Play /> Start
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    setStatus.mutate({ id: task.id, status: "pending" })
                  }
                >
                  <RotateCcw /> Back to pending
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <AlarmClock /> Snooze
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => snoozeTo(addHours(new Date(), 1))}
                  >
                    1 hour
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => snoozeTo(addHours(new Date(), 5))}
                  >
                    5 hours
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      snoozeTo(setMinutes(setHours(startOfTomorrow(), 9), 0))
                    }
                  >
                    Tomorrow 9 AM
                  </DropdownMenuItem>
                  {snoozed && (
                    <DropdownMenuItem
                      onClick={() =>
                        snooze.mutate({ id: task.id, until: null })
                      }
                    >
                      Cancel snooze
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              close();
              editTask(task);
            }}
          >
            <Pencil /> Edit
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={remove}
          >
            <Trash2 /> Delete
          </Button>
        </div>
      </div>
    </ResponsiveSheet>
  );
}

const HISTORY_DAYS = 14;

/** The last two weeks of a daily task, each day tickable (oldest left). */
function DayHistory({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (date: string, done: boolean) => void;
}) {
  const done = new Set(task.doneDates);
  // Never before the task existed.
  const since = format(parseISO(task.createdAt), "yyyy-MM-dd");
  const days = lastDays(HISTORY_DAYS)
    .filter((d) => d >= since)
    .reverse();
  const streak = streakOf(task);
  const count = days.filter((d) => done.has(d)).length;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <p className="font-semibold">
          Every day · {count}/{days.length}
        </p>
        {streak > 0 && (
          <span className="flex items-center gap-1 font-semibold text-orange-500">
            <Flame className="size-4" /> {streak} day{streak === 1 ? "" : "s"}{" "}
            in a row
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const on = done.has(d);
          const isToday = d === todayStr();
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              aria-label={`${format(parseDay(d), "d MMM")}: ${on ? "done" : "not done"}`}
              onClick={() => onToggle(d, !on)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg border py-1.5 text-xs transition-colors",
                on
                  ? "border-done bg-done text-white"
                  : "hover:border-primary hover:bg-primary/10",
                isToday && !on && "border-primary",
              )}
            >
              <span
                className={cn("text-[10px]", !on && "text-muted-foreground")}
              >
                {isToday ? "Today" : format(parseDay(d), "EEE")}
              </span>
              <span className="font-semibold tabular">
                {format(parseDay(d), "d MMM")}
              </span>
              {on ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : (
                <span className="size-3.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/70 p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 truncate font-medium">{children}</dd>
    </div>
  );
}

function Step({
  label,
  at,
  tone,
}: {
  label: string;
  at: string;
  tone?: "done";
}) {
  return (
    <li className="relative">
      <span
        className={cn(
          "absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full bg-muted-foreground/50 ring-4 ring-card",
          tone === "done" && "bg-done",
        )}
      />
      <span className={cn("font-medium", tone === "done" && "text-done")}>
        {label}
      </span>
      <span className="text-muted-foreground"> · {formatDateTime(at)}</span>
    </li>
  );
}
