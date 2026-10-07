import { useEffect, useState } from "react";
import { DateInput } from "@/components/common/date-input";
import { Field } from "@/components/common/field";
import { ColorPicker, IconPicker } from "@/components/common/icon-color-picker";
import { ResponsiveSheet } from "@/components/common/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateEvent, useUpdateEvent } from "@/hooks/use-data";
import { COLORS } from "@/lib/icons";
import type { EventInput } from "@/lib/mock-api";
import { useSheets } from "@/stores/sheet-store";

const blank = (): EventInput => ({
  name: "",
  description: "",
  color: COLORS[0]!,
  icon: "briefcase",
  dueDate: null,
});

export function EventSheet() {
  const { open, editing } = useSheets((s) => s.event);
  const close = useSheets((s) => s.closeEvent);
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const [f, setF] = useState<EventInput>(blank());

  useEffect(() => {
    if (!open) return;
    setF(
      editing
        ? {
            name: editing.name,
            description: editing.description,
            color: editing.color,
            icon: editing.icon,
            dueDate: editing.dueDate,
          }
        : blank(),
    );
  }, [open, editing]);

  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      ...f,
      name: f.name.trim(),
      description: f.description.trim(),
    };
    if (editing)
      update.mutate({ id: editing.id, ...body }, { onSuccess: close });
    else create.mutate(body, { onSuccess: close });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title={editing ? "Edit event" : "New event"}
      description={
        editing
          ? undefined
          : "A project or area of life — e.g. Shimlawale CRM, Khalsa Virasat, Personal."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" htmlFor="ev-name" required>
          <Input
            id="ev-name"
            required
            autoFocus={!editing}
            placeholder="e.g. Shimlawale CRM"
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="Description" htmlFor="ev-desc">
          <Textarea
            id="ev-desc"
            rows={2}
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field label="Target date" htmlFor="ev-date" hint="Optional">
          <DateInput
            id="ev-date"
            value={f.dueDate ?? ""}
            onChange={(v) => set("dueDate", v || null)}
          />
        </Field>
        <Field label="Colour">
          <ColorPicker value={f.color} onChange={(c) => set("color", c)} />
        </Field>
        <Field label="Icon">
          <IconPicker
            value={f.icon}
            color={f.color}
            onChange={(k) => set("icon", k)}
          />
        </Field>
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={close}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={!f.name.trim() || create.isPending || update.isPending}
          >
            {editing ? "Save" : "Create event"}
          </Button>
        </div>
      </form>
    </ResponsiveSheet>
  );
}
