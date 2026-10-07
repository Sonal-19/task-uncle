import { addHours } from "date-fns";
import {
  AlarmClockOff,
  BellOff,
  Check,
  Clock,
  IndianRupee,
  ListChecks,
} from "lucide-react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type * as React from "react";
import { toast } from "sonner";
import { Avatar, PriorityFlag } from "@/components/common/badges";
import { useLookups, useSetTaskStatus, useSnoozeTask } from "@/hooks/use-data";
import { useIsTouch } from "@/hooks/use-media-query";
import { formatAmount, formatDue, isOverdue, timeAgo } from "@/lib/format";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSheets } from "@/stores/sheet-store";

/** Round check that marks a task done (or reopens it). */
export function TaskCheck({
  task,
  className,
}: {
  task: Task;
  className?: string;
}) {
  const setStatus = useSetTaskStatus();
  const done = task.status === "done";
  return (
    <button
      type="button"
      aria-label={done ? "Mark as pending" : "Mark as done"}
      onClick={(e) => {
        e.stopPropagation();
        setStatus.mutate({
          id: task.id,
          status: done ? "pending" : "done",
          prev: task.status,
        });
      }}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90",
        className,
        done
          ? "border-done bg-done text-white"
          : isOverdue(task)
            ? "border-overdue/70 hover:bg-overdue/10"
            : task.status === "in_progress"
              ? "border-progress hover:bg-progress/10"
              : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10",
      )}
    >
      {done && <Check className="size-3.5" strokeWidth={3} />}
    </button>
  );
}

const SWIPE = 90;

export function TaskRow({
  task,
  showEvent = true,
  className,
}: {
  task: Task;
  showEvent?: boolean;
  className?: string;
}) {
  const { eventById, categoryById, personById } = useLookups();
  const showTask = useSheets((s) => s.showTask);
  const setStatus = useSetTaskStatus();
  const snooze = useSnoozeTask();
  const isTouch = useIsTouch();
  const x = useMotionValue(0);
  const doneOpacity = useTransform(x, [0, SWIPE], [0, 1]);
  const snoozeOpacity = useTransform(x, [-SWIPE, 0], [1, 0]);

  const ev = eventById.get(task.eventId);
  const cat = categoryById.get(task.categoryId);
  const who = task.assigneeId ? personById.get(task.assigneeId) : undefined;
  const done = task.status === "done";
  const overdue = isOverdue(task);
  const snoozed =
    !done && task.snoozedUntil && Date.parse(task.snoozedUntil) > Date.now();
  const subDone = task.subtasks.filter((s) => s.doneAt).length;

  function onDragEnd() {
    const dx = x.get();
    if (dx > SWIPE && !done) {
      setStatus.mutate({ id: task.id, status: "done", prev: task.status });
    } else if (dx < -SWIPE && !done) {
      snooze.mutate({
        id: task.id,
        until: addHours(new Date(), 1).toISOString(),
      });
      toast.info("Snoozed for 1 hour", { description: task.title });
    }
    animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {isTouch && !done && (
        <>
          <motion.div
            style={{ opacity: doneOpacity }}
            className="absolute inset-0 flex items-center bg-done px-5 text-sm font-semibold text-white"
          >
            <Check className="mr-2 size-5" /> Done
          </motion.div>
          <motion.div
            style={{ opacity: snoozeOpacity }}
            className="absolute inset-0 flex items-center justify-end bg-pending px-5 text-sm font-semibold text-white"
          >
            Snooze 1h <AlarmClockOff className="ml-2 size-5" />
          </motion.div>
        </>
      )}
      <motion.div
        drag={isTouch && !done ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={onDragEnd}
        style={{ x }}
        role="button"
        tabIndex={0}
        onClick={() => showTask(task.id)}
        onKeyDown={(e) => e.key === "Enter" && showTask(task.id)}
        className={cn(
          "relative flex cursor-pointer items-start gap-3 bg-card px-3 py-3 transition-colors hover:bg-muted/60",
          overdue && "bg-overdue/[0.04]",
        )}
      >
        <div className="pt-0.5">
          <TaskCheck task={task} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "min-w-0 font-medium leading-snug",
                done && "text-muted-foreground line-through decoration-1",
              )}
            >
              {task.title}
            </p>
            <PriorityFlag
              priority={task.priority}
              className="mt-0.5 shrink-0"
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {showEvent && ev && (
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: ev.color }}
                />
                <span className="truncate">
                  {ev.name}
                  {cat ? ` · ${cat.name}` : ""}
                </span>
              </span>
            )}
            {!showEvent && cat && <span className="truncate">{cat.name}</span>}
            {done && task.completedAt ? (
              <span className="flex items-center gap-1 text-done">
                <Check className="size-3.5" /> Done {timeAgo(task.completedAt)}
              </span>
            ) : (
              <span
                className={cn(
                  "flex items-center gap-1",
                  overdue && "font-semibold text-overdue",
                )}
              >
                <Clock className="size-3.5" />
                {formatDue(task)}
              </span>
            )}
            {task.status === "in_progress" && (
              <span className="font-semibold text-progress">In progress</span>
            )}
            {task.subtasks.length > 0 && (
              <span className="flex items-center gap-1">
                <ListChecks className="size-3.5" />
                {subDone}/{task.subtasks.length}
              </span>
            )}
            {!!task.amount && (
              <span
                className={cn(
                  "tabular flex items-center gap-0.5 font-semibold",
                  done ? "text-muted-foreground" : "text-foreground",
                )}
              >
                <IndianRupee className="size-3" />
                {formatAmount(task.amount).replace("₹", "")}
              </span>
            )}
            {snoozed && (
              <span className="flex items-center gap-1 text-pending">
                <AlarmClockOff className="size-3.5" /> Snoozed
              </span>
            )}
            {task.reminder === "off" && !done && (
              <BellOff className="size-3.5" aria-label="Reminders off" />
            )}
          </div>
        </div>
        {who && <Avatar name={who.name} className="size-7 text-[10px]" />}
      </motion.div>
    </div>
  );
}

/** Divided list of rows inside a card. */
export function TaskList({
  tasks,
  showEvent,
  empty,
}: {
  tasks: Task[];
  showEvent?: boolean;
  empty?: React.ReactNode;
}) {
  if (!tasks.length) return <>{empty}</>;
  return (
    <div className="divide-y overflow-hidden rounded-2xl border bg-card">
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          showEvent={showEvent}
          className="rounded-none"
        />
      ))}
    </div>
  );
}
