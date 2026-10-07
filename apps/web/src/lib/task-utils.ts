import { dueAt, isDueToday, isOverdue, todayStr } from "./format";
import type { Priority, Task } from "./types";

export type TaskView =
  | "pending"
  | "today"
  | "overdue"
  | "upcoming"
  | "done"
  | "all";

export const isOpen = (t: Task) => t.status !== "done";

export const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function matchesView(t: Task, view: TaskView) {
  switch (view) {
    case "pending":
      return isOpen(t);
    case "today":
      return isDueToday(t);
    case "overdue":
      return isOverdue(t);
    case "upcoming":
      return isOpen(t) && !!t.dueDate && t.dueDate > todayStr();
    case "done":
      return t.status === "done";
    default:
      return true;
  }
}

/** Open tasks: overdue first, then by due time, then priority. Done: latest first. */
export function sortTasks(list: Task[]) {
  return [...list].sort((a, b) => {
    if (a.status === "done" || b.status === "done") {
      if (a.status !== b.status) return a.status === "done" ? 1 : -1;
      return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
    }
    const da = dueAt(a)?.getTime() ?? Number.POSITIVE_INFINITY;
    const db = dueAt(b)?.getTime() ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  });
}

export function taskStats(tasks: Task[]) {
  const open = tasks.filter(isOpen);
  const weekAgo = Date.now() - 7 * 86_400_000;
  return {
    total: tasks.length,
    open: open.length,
    overdue: open.filter((t) => isOverdue(t)).length,
    today: open.filter(isDueToday).length,
    inProgress: open.filter((t) => t.status === "in_progress").length,
    doneWeek: tasks.filter(
      (t) => t.completedAt && Date.parse(t.completedAt) >= weekAgo,
    ).length,
    done: tasks.length - open.length,
    /** Unpaid amounts on open tasks (paise). */
    pendingAmount: open.reduce((sum, t) => sum + (t.amount ?? 0), 0),
  };
}

export const progressPct = (done: number, total: number) =>
  total ? Math.round((done / total) * 100) : 0;
