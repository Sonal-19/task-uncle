import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Avatar, IconTile } from "@/components/common/badges";
import { formatAmountShort, formatDue, isOverdue } from "@/lib/format";
import { sortTasks } from "@/lib/task-utils";
import type { Category, Person, Task } from "@/lib/types";

/** Category inside an event: pending count, next due task, team avatars. */
export function CategoryTile({
  category,
  tasks,
  personById,
}: {
  category: Category;
  tasks: Task[];
  personById: Map<string, Person>;
}) {
  const mine = tasks.filter((t) => t.categoryId === category.id);
  const open = sortTasks(mine.filter((t) => t.status !== "done"));
  const overdue = open.filter((t) => isOverdue(t)).length;
  const amount = open.reduce((s, t) => s + (t.amount ?? 0), 0);
  const next = open[0];

  return (
    <Link
      to="/events/$eventId/$categoryId"
      params={{ eventId: category.eventId, categoryId: category.id }}
      className="group flex flex-col rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <IconTile icon={category.icon} color={category.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{category.name}</p>
          <p className="text-xs text-muted-foreground">
            {mine.length - open.length}/{mine.length} done
            {amount > 0 && ` · ${formatAmountShort(amount)} due`}
          </p>
        </div>
        <div className="text-right">
          <p
            className="tabular text-2xl leading-none font-bold"
            style={{ color: open.length ? category.color : undefined }}
          >
            {open.length}
          </p>
          <p className="text-[11px] text-muted-foreground">pending</p>
        </div>
      </div>

      <div className="mt-3 min-h-9 rounded-lg bg-muted/70 px-3 py-2 text-xs">
        {next ? (
          <p className="truncate">
            <span className="text-muted-foreground">Next: </span>
            <span className="font-medium">{next.title}</span>
            <span
              className={
                isOverdue(next)
                  ? " font-semibold text-overdue"
                  : " text-muted-foreground"
              }
            >
              {" "}
              · {formatDue(next)}
            </span>
          </p>
        ) : (
          <p className="text-done">All done ✓</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex -space-x-2">
          {category.memberIds.slice(0, 4).map((id) => {
            const p = personById.get(id);
            return p ? (
              <Avatar
                key={id}
                name={p.name}
                className="size-7 text-[10px] ring-2 ring-card"
              />
            ) : null;
          })}
        </div>
        <span className="flex items-center gap-2 text-xs">
          {overdue > 0 && (
            <span className="flex items-center gap-1 font-semibold text-overdue">
              <AlertTriangle className="size-3.5" /> {overdue}
            </span>
          )}
          <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
