import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/common/badges";
import { Field } from "@/components/common/field";
import { ColorPicker, IconPicker } from "@/components/common/icon-color-picker";
import { ResponsiveSheet } from "@/components/common/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CategoryInput } from "@/hooks/use-data";
import {
  useCreateCategory,
  usePeople,
  useUpdateCategory,
} from "@/hooks/use-data";
import { COLORS } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useSheets } from "@/stores/sheet-store";

export function CategorySheet() {
  const { open, editing, eventId } = useSheets((s) => s.category);
  const close = useSheets((s) => s.closeCategory);
  const newPerson = useSheets((s) => s.newPerson);
  const people = usePeople().data ?? [];
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const [f, setF] = useState<CategoryInput>({
    eventId: "",
    name: "",
    icon: "star",
    color: COLORS[8]!,
    memberIds: [],
  });

  useEffect(() => {
    if (!open) return;
    setF(
      editing
        ? {
            eventId: editing.eventId,
            name: editing.name,
            icon: editing.icon,
            color: editing.color,
            memberIds: editing.memberIds,
          }
        : {
            eventId: eventId ?? "",
            name: "",
            icon: "star",
            color: COLORS[8]!,
            memberIds: [],
          },
    );
  }, [open, editing, eventId]);

  const set = <K extends keyof CategoryInput>(k: K, v: CategoryInput[K]) =>
    setF((p) => ({ ...p, [k]: v }));
  const toggleMember = (id: string) =>
    set(
      "memberIds",
      f.memberIds.includes(id)
        ? f.memberIds.filter((m) => m !== id)
        : [...f.memberIds, id],
    );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...f, name: f.name.trim() };
    if (editing)
      update.mutate({ id: editing.id, ...body }, { onSuccess: close });
    else create.mutate(body, { onSuccess: close });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title={editing ? "Edit category" : "New category"}
      description={
        editing
          ? undefined
          : "Group tasks inside the event — e.g. GST, CA, YouTube, Developer team."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" htmlFor="cat-name" required>
          <Input
            id="cat-name"
            required
            autoFocus={!editing}
            placeholder="e.g. Developer team"
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
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
        <Field
          label="Team members"
          hint="Optional — makes this a team group (e.g. developers on the project)."
        >
          <div className="flex flex-wrap gap-2">
            {people.map((p) => {
              const on = f.memberIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleMember(p.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors",
                    on
                      ? "border-primary bg-accent text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <Avatar name={p.name} className="size-6 text-[9px]" />
                  {p.name}
                  {on && <Check className="size-3.5" />}
                </button>
              );
            })}
            <button
              type="button"
              onClick={newPerson}
              className="rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground hover:bg-muted"
            >
              + New person
            </button>
          </div>
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
            {editing ? "Save" : "Create category"}
          </Button>
        </div>
      </form>
    </ResponsiveSheet>
  );
}
