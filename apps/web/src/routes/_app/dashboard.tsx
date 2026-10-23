import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Hourglass,
  IndianRupee,
  Plus,
  Sparkles,
} from "lucide-react";
import { InstallCard } from "@/components/app/install-app";
import { PermissionBanner } from "@/components/app/permission-banner";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState, PageLoader } from "@/components/common/states";
import { EventCard } from "@/components/events/event-card";
import { TaskList } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import { useCategories, useEvents, useTasks } from "@/hooks/use-data";
import { formatAmountShort, isDueToday, isOverdue } from "@/lib/format";
import { sortTasks, taskStats } from "@/lib/task-utils";
import { useAuthStore } from "@/stores/auth-store";
import { useSheets } from "@/stores/sheet-store";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const tasksQ = useTasks();
  const events = (useEvents().data ?? []).filter((e) => e.status === "active");
  const categories = useCategories().data ?? [];
  const newTask = useSheets((s) => s.newTask);
  const name = useAuthStore((s) => s.user?.name.split(" ")[0] ?? "");

  if (tasksQ.isLoading) return <PageLoader />;
  const tasks = tasksQ.data ?? [];
  const s = taskStats(tasks);
  const overdue = sortTasks(tasks.filter((t) => isOverdue(t)));
  const today = sortTasks(tasks.filter((t) => isDueToday(t) && !isOverdue(t)));
  const recent = sortTasks(tasks.filter((t) => t.status === "done")).slice(
    0,
    5,
  );

  return (
    <div className="space-y-5">
      <InstallCard />
      <PermissionBanner />

      {/* Hero summary */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-5 text-white shadow-xl shadow-indigo-900/20 sm:p-7">
        <div className="bg-dot-pattern pointer-events-none absolute inset-0 opacity-30" />
        <img
          src="/logo.svg"
          alt=""
          className="animate-float-slow pointer-events-none absolute -right-6 -bottom-8 size-36 rotate-12 rounded-[2rem] opacity-25 sm:size-44"
        />
        <div className="relative">
          <p className="text-sm text-indigo-100">
            Namaste{name ? `, ${name}` : ""} 🙏
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {s.open === 0
              ? "All clear! Uncle is proud of you."
              : `You have ${s.open} pending task${s.open === 1 ? "" : "s"}`}
          </h1>
          <p className="mt-1 text-sm text-indigo-100">
            {s.overdue > 0
              ? `${s.overdue} overdue and ${s.today} due today — let's finish them.`
              : s.today > 0
                ? `${s.today} due today. You're on track.`
                : "Nothing due today. Plan ahead or relax."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => newTask()}
              className="bg-white text-indigo-700 hover:bg-indigo-50"
            >
              <Plus /> Add task
            </Button>
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <Link to="/tasks" search={{ view: "pending" }}>
                See all pending <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Pending"
          value={s.open}
          hint={`${s.inProgress} in progress`}
          icon={<Hourglass />}
          tone="pending"
          link={{ to: "/tasks", search: { view: "pending" } }}
        />
        <StatCard
          label="Overdue"
          value={s.overdue}
          hint="Past due date"
          icon={<AlertTriangle />}
          tone="overdue"
          link={{ to: "/tasks", search: { view: "overdue" } }}
        />
        <StatCard
          label="Due today"
          value={s.today}
          icon={<CalendarClock />}
          tone="progress"
          link={{ to: "/tasks", search: { view: "today" } }}
        />
        <StatCard
          label="Done this week"
          value={s.doneWeek}
          icon={<CheckCircle2 />}
          tone="done"
          link={{ to: "/tasks", search: { view: "done" } }}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            label="Pending payments"
            value={formatAmountShort(s.pendingAmount)}
            hint="Unpaid on open tasks"
            icon={<IndianRupee />}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {overdue.length > 0 && (
            <section>
              <SectionTitle
                title="Overdue"
                count={overdue.length}
                tone="text-overdue"
                to="overdue"
              />
              <TaskList tasks={overdue.slice(0, 6)} />
            </section>
          )}
          <section>
            <SectionTitle title="Due today" count={today.length} to="today" />
            <TaskList
              tasks={today}
              empty={
                <EmptyState
                  icon={<Sparkles className="size-6" />}
                  title="Nothing else due today"
                >
                  Enjoy the chai ☕ — or add something.
                </EmptyState>
              }
            />
          </section>
        </div>

        <div className="space-y-5">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">Events</h2>
              <Link
                to="/events"
                className="text-sm font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="grid gap-3">
              {events.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  tasks={tasks}
                  categories={categories}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">Recently completed</h2>
            <TaskList
              tasks={recent}
              empty={<EmptyState title="Nothing completed yet" />}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  count,
  tone,
  to,
}: {
  title: string;
  count: number;
  tone?: string;
  to: "overdue" | "today";
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className={`font-semibold ${tone ?? ""}`}>
        {title} <span className="text-muted-foreground">· {count}</span>
      </h2>
      <Link
        to="/tasks"
        search={{ view: to }}
        className="text-sm font-medium text-primary hover:underline"
      >
        See all
      </Link>
    </div>
  );
}
