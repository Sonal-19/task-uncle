import { createFileRoute, Link } from "@tanstack/react-router";
import { BellOff, BellRing, CheckCheck, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, PageLoader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import {
  useClearLog,
  useLog,
  useMarkLogRead,
  useTasks,
} from "@/hooks/use-data";
import { formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSheets } from "@/stores/sheet-store";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const logQ = useLog();
  const tasks = useTasks().data ?? [];
  const markRead = useMarkLogRead();
  const clear = useClearLog();
  const showTask = useSheets((s) => s.showTask);
  const log = logQ.data ?? [];
  const unread = log.filter((l) => !l.readAt).length;

  // Seen on open; give the eye a moment to spot the unread ones first.
  useEffect(() => {
    if (!unread) return;
    const t = setTimeout(() => markRead.mutate(), 2500);
    return () => clearTimeout(t);
  }, [unread, markRead.mutate]);

  if (logQ.isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Reminders Uncle has sent you."
        actions={
          log.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markRead.mutate()}
              >
                <CheckCheck /> Mark all read
              </Button>
              <Button variant="ghost" size="sm" onClick={() => clear.mutate()}>
                <Trash2 /> Clear
              </Button>
            </>
          )
        }
      />
      {log.length ? (
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          {log.map((l) => {
            const task = l.taskId ? tasks.find((t) => t.id === l.taskId) : null;
            const done = task?.status === "done";
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => task && showTask(task.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/60",
                  !l.readAt && "bg-accent/50",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
                    done
                      ? "bg-done/12 text-done"
                      : "bg-primary/12 text-primary",
                  )}
                >
                  <BellRing className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-medium",
                      done && "text-muted-foreground line-through",
                    )}
                  >
                    {l.title}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {l.body}
                  </p>
                  <p
                    className="mt-0.5 text-xs text-muted-foreground"
                    title={formatDateTime(l.sentAt)}
                  >
                    {timeAgo(l.sentAt)}
                    {done && " · now done ✓"}
                  </p>
                </div>
                {!l.readAt && (
                  <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<BellOff className="size-7" />}
          title="No notifications yet"
        >
          Reminders for pending tasks will appear here.{" "}
          <Link to="/settings" className="font-medium text-primary">
            Reminder settings
          </Link>
        </EmptyState>
      )}
    </div>
  );
}
