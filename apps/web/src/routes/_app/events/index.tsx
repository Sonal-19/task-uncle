import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban, Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Segmented } from "@/components/common/segmented";
import { EmptyState, PageLoader } from "@/components/common/states";
import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { useCategories, useEvents, useTasks } from "@/hooks/use-data";
import type { EventStatus } from "@/lib/types";
import { useSheets } from "@/stores/sheet-store";

export const Route = createFileRoute("/_app/events/")({
  component: EventsPage,
});

function EventsPage() {
  const eventsQ = useEvents();
  const tasks = useTasks().data ?? [];
  const categories = useCategories().data ?? [];
  const newEvent = useSheets((s) => s.newEvent);
  const [status, setStatus] = useState<EventStatus>("active");

  if (eventsQ.isLoading) return <PageLoader />;
  const all = eventsQ.data ?? [];
  const events = all.filter((e) => e.status === status);
  const archived = all.length - all.filter((e) => e.status === "active").length;

  return (
    <div>
      <PageHeader
        title="Events"
        description="Projects and areas of life. Each has categories, each category has tasks."
        actions={
          <Button onClick={newEvent}>
            <Plus /> New event
          </Button>
        }
      />
      {archived > 0 && (
        <Segmented
          className="mb-4"
          value={status}
          onChange={setStatus}
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: `Archived · ${archived}` },
          ]}
        />
      )}
      {events.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              tasks={tasks}
              categories={categories}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderKanban className="size-7" />}
          title={status === "active" ? "No events yet" : "No archived events"}
        >
          {status === "active" && (
            <Button className="mt-3" onClick={newEvent}>
              <Plus /> Create your first event
            </Button>
          )}
        </EmptyState>
      )}
    </div>
  );
}
