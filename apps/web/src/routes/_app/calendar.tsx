import { createFileRoute } from "@tanstack/react-router";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { TaskList } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import { useLookups, useTasks } from "@/hooks/use-data";
import { dayLabel, isOverdue, todayStr } from "@/lib/format";
import { sortTasks } from "@/lib/task-utils";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSheets } from "@/stores/sheet-store";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
});

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CalendarPage() {
  const tasks = useTasks().data ?? [];
  const { eventById } = useLookups();
  const newTask = useSheets((s) => s.newTask);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(todayStr());

  const byDay = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.dueDate) continue;
    byDay.set(t.dueDate, [...(byDay.get(t.dueDate) ?? []), t]);
  }
  const days = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const dayTasks = sortTasks(byDay.get(selected) ?? []);

  return (
    <div>
      <PageHeader title="Calendar" description="Tasks by due date." />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border bg-card p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous month"
              onClick={() => setMonth(addMonths(month, -1))}
            >
              <ChevronLeft />
            </Button>
            <button
              type="button"
              className="font-semibold"
              onClick={() => {
                setMonth(startOfMonth(new Date()));
                setSelected(todayStr());
              }}
            >
              {format(month, "MMMM yyyy")}
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next month"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
            {WEEK.map((w) => (
              <span key={w} className="py-1">
                <span className="sm:hidden">{w[0]}</span>
                <span className="hidden sm:inline">{w}</span>
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const iso = format(d, "yyyy-MM-dd");
              const list = byDay.get(iso) ?? [];
              const open = list.filter((t) => t.status !== "done");
              const late = open.some((t) => isOverdue(t));
              const sel = iso === selected;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelected(iso)}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-start gap-1 rounded-xl p-1 text-sm transition-colors hover:bg-muted sm:aspect-[1.1] sm:p-1.5",
                    !isSameMonth(d, month) && "text-muted-foreground/50",
                    iso === todayStr() && "font-bold text-primary",
                    sel &&
                      "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  <span className="tabular">{d.getDate()}</span>
                  {list.length > 0 && (
                    <span className="flex flex-wrap justify-center gap-0.5">
                      {list.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          className={cn(
                            "size-1.5 rounded-full",
                            sel && "ring-1 ring-primary-foreground",
                          )}
                          style={{
                            backgroundColor:
                              t.status === "done"
                                ? "var(--done)"
                                : late
                                  ? "var(--overdue)"
                                  : eventById.get(t.eventId)?.color,
                          }}
                        />
                      ))}
                    </span>
                  )}
                  {open.length > 0 && (
                    <span
                      className={cn(
                        "hidden text-[10px] leading-none sm:block",
                        sel
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {open.length} due
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">
              {dayLabel(selected)}{" "}
              <span className="text-muted-foreground">· {dayTasks.length}</span>
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => newTask({ dueDate: selected })}
            >
              <Plus /> Task
            </Button>
          </div>
          <TaskList
            tasks={dayTasks}
            empty={<EmptyState title="Nothing due this day" />}
          />
        </section>
      </div>
    </div>
  );
}
