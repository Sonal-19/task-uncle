import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { IconTile, StatusBadge } from "@/components/common/badges";
import { ResponsiveSheet } from "@/components/common/responsive-sheet";
import { Input } from "@/components/ui/input";
import {
  useCategories,
  useEvents,
  useLookups,
  useTasks,
} from "@/hooks/use-data";
import { formatDue, isOverdue } from "@/lib/format";
import { useSheets } from "@/stores/sheet-store";

/** ⌘K / Ctrl+K search over tasks, events and categories. */
export function CommandSearch() {
  const open = useSheets((s) => s.search);
  const setOpen = useSheets((s) => s.setSearch);
  const showTask = useSheets((s) => s.showTask);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const tasks = useTasks().data ?? [];
  const events = useEvents().data ?? [];
  const categories = useCategories().data ?? [];
  const { eventById } = useLookups();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useSheets.getState().search);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const term = q.trim().toLowerCase();
  const hit = (s: string) => s.toLowerCase().includes(term);
  const foundEvents = term ? events.filter((e) => hit(e.name)).slice(0, 4) : [];
  const foundCats = term
    ? categories.filter((c) => hit(c.name)).slice(0, 5)
    : [];
  const foundTasks = (
    term
      ? tasks.filter((t) => hit(t.title) || hit(t.notes))
      : tasks.filter((t) => t.status !== "done" && isOverdue(t))
  ).slice(0, 8);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={setOpen}
      title="Search"
      className="sm:max-w-xl"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search tasks, events, categories…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {foundEvents.length > 0 && (
          <Group title="Events">
            {foundEvents.map((e) => (
              <Item
                key={e.id}
                onClick={() =>
                  go(() =>
                    navigate({
                      to: "/events/$eventId",
                      params: { eventId: e.id },
                    }),
                  )
                }
              >
                <IconTile icon={e.icon} color={e.color} className="size-8" />
                <span className="truncate font-medium">{e.name}</span>
              </Item>
            ))}
          </Group>
        )}
        {foundCats.length > 0 && (
          <Group title="Categories">
            {foundCats.map((c) => (
              <Item
                key={c.id}
                onClick={() =>
                  go(() =>
                    navigate({
                      to: "/events/$eventId/$categoryId",
                      params: { eventId: c.eventId, categoryId: c.id },
                    }),
                  )
                }
              >
                <IconTile icon={c.icon} color={c.color} className="size-8" />
                <span className="min-w-0 truncate">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {eventById.get(c.eventId)?.name}
                  </span>
                </span>
              </Item>
            ))}
          </Group>
        )}
        <Group title={term ? "Tasks" : "Overdue"}>
          {foundTasks.length ? (
            foundTasks.map((t) => (
              <Item key={t.id} onClick={() => go(() => showTask(t.id))}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {eventById.get(t.eventId)?.name} · {formatDue(t)}
                  </p>
                </div>
                <StatusBadge status={isOverdue(t) ? "overdue" : t.status} />
              </Item>
            ))
          ) : (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {term ? "No tasks match." : "Nothing overdue 🎉"}
            </p>
          )}
        </Group>
      </div>
    </ResponsiveSheet>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Item({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
    >
      {children}
    </button>
  );
}
