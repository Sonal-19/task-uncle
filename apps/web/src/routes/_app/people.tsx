import { createFileRoute } from "@tanstack/react-router";
import { MoreVertical, Pencil, Phone, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/common/badges";
import { confirm } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, PageLoader } from "@/components/common/states";
import { TaskList } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeletePerson, usePeople, useTasks } from "@/hooks/use-data";
import { formatAmount } from "@/lib/format";
import { sortTasks } from "@/lib/task-utils";
import { cn } from "@/lib/utils";
import { useSheets } from "@/stores/sheet-store";

export const Route = createFileRoute("/_app/people")({
  component: PeoplePage,
});

function PeoplePage() {
  const peopleQ = usePeople();
  const tasks = useTasks().data ?? [];
  const { newPerson, editPerson, newTask } = useSheets();
  const del = useDeletePerson();
  const [openId, setOpenId] = useState<string | null>(null);

  if (peopleQ.isLoading) return <PageLoader />;
  const people = peopleQ.data ?? [];

  return (
    <div>
      <PageHeader
        title="People"
        description="Developers, CA, raagi — anyone you hand work to."
        actions={
          <Button onClick={newPerson}>
            <Plus /> Add person
          </Button>
        }
      />
      {people.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {people.map((p) => {
            const theirs = tasks.filter((t) => t.assigneeId === p.id);
            const open = sortTasks(theirs.filter((t) => t.status !== "done"));
            const owed = open.reduce((s, t) => s + (t.amount ?? 0), 0);
            const expanded = openId === p.id;
            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-2xl border bg-card",
                  expanded && "md:col-span-2",
                )}
              >
                <div className="flex items-center gap-3 p-4">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => setOpenId(expanded ? null : p.id)}
                  >
                    <Avatar name={p.name} className="size-11 text-sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.role || "—"} · {open.length} pending
                        {owed > 0 && (
                          <span className="font-semibold text-pending">
                            {" "}
                            · {formatAmount(owed)} to pay
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                  {p.phone && (
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={`tel:${p.phone.replace(/\s/g, "")}`}
                        aria-label={`Call ${p.name}`}
                      >
                        <Phone />
                      </a>
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Actions">
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => newTask({ assigneeId: p.id })}
                      >
                        <Plus /> Assign a task
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => editPerson(p)}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={async () => {
                          if (
                            await confirm({
                              title: `Remove ${p.name}?`,
                              description: `Their ${theirs.length} tasks stay, unassigned.`,
                              confirmText: "Remove",
                              destructive: true,
                            })
                          )
                            del.mutate(p.id);
                        }}
                      >
                        <Trash2 /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {expanded && (
                  <div className="border-t p-3">
                    {p.note && (
                      <p className="mb-3 rounded-lg bg-muted p-3 text-sm">
                        {p.note}
                      </p>
                    )}
                    <TaskList
                      tasks={open}
                      empty={
                        <p className="p-2 text-sm text-muted-foreground">
                          No pending work assigned.
                        </p>
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Users className="size-7" />} title="No people yet" />
      )}
    </div>
  );
}
