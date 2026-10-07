import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { IconTile } from "@/components/common/badges";
import { Progress } from "@/components/common/progress";
import { dayLabel, isOverdue } from "@/lib/format";
import { progressPct } from "@/lib/task-utils";
import type { Category, Task, TaskEvent } from "@/lib/types";

export function EventCard({
  event,
  tasks,
  categories,
}: {
  event: TaskEvent;
  tasks: Task[];
  categories: Category[];
}) {
  const mine = tasks.filter((t) => t.eventId === event.id);
  const open = mine.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => isOverdue(t)).length;
  const done = mine.length - open.length;
  const cats = categories.filter((c) => c.eventId === event.id);

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="group block rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ borderTop: `4px solid ${event.color}` }}
    >
      <div className="flex items-start gap-3">
        <IconTile icon={event.icon} color={event.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{event.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {cats.length} categories · {mine.length} tasks
          </p>
        </div>
        <div className="text-right">
          <p className="tabular text-2xl leading-none font-bold">
            {open.length}
          </p>
          <p className="text-[11px] text-muted-foreground">pending</p>
        </div>
      </div>
      <Progress
        value={done}
        max={mine.length}
        className="mt-4"
        color={event.color}
      />
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{progressPct(done, mine.length)}% done</span>
        {overdue > 0 ? (
          <span className="flex items-center gap-1 font-semibold text-overdue">
            <AlertTriangle className="size-3.5" /> {overdue} overdue
          </span>
        ) : event.dueDate ? (
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" /> {dayLabel(event.dueDate)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
