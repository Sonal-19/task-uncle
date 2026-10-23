import { useEffect, useState } from "react";
import { Field } from "@/components/common/field";
import { ResponsiveSheet } from "@/components/common/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PersonInput } from "@/hooks/use-data";
import { useCreatePerson, useUpdatePerson } from "@/hooks/use-data";
import { useSheets } from "@/stores/sheet-store";

const blank: PersonInput = { name: "", role: "", phone: "", note: "" };

export function PersonSheet() {
  const { open, editing } = useSheets((s) => s.person);
  const close = useSheets((s) => s.closePerson);
  const create = useCreatePerson();
  const update = useUpdatePerson();
  const [f, setF] = useState<PersonInput>(blank);

  useEffect(() => {
    if (!open) return;
    setF(
      editing
        ? {
            name: editing.name,
            role: editing.role,
            phone: editing.phone,
            note: editing.note,
          }
        : blank,
    );
  }, [open, editing]);

  const set = <K extends keyof PersonInput>(k: K, v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: f.name.trim(),
      role: f.role.trim(),
      phone: f.phone.trim(),
      note: f.note.trim(),
    };
    if (editing)
      update.mutate({ id: editing.id, ...body }, { onSuccess: close });
    else create.mutate(body, { onSuccess: close });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title={editing ? "Edit person" : "New person"}
      description={
        editing
          ? undefined
          : "Developers, CA, raagi — anyone you assign work to."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" htmlFor="p-name" required>
          <Input
            id="p-name"
            required
            autoFocus={!editing}
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role" htmlFor="p-role">
            <Input
              id="p-role"
              placeholder="e.g. Developer"
              value={f.role}
              onChange={(e) => set("role", e.target.value)}
            />
          </Field>
          <Field label="Phone" htmlFor="p-phone">
            <Input
              id="p-phone"
              type="tel"
              inputMode="tel"
              value={f.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Note" htmlFor="p-note">
          <Textarea
            id="p-note"
            rows={2}
            value={f.note}
            onChange={(e) => set("note", e.target.value)}
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
            {editing ? "Save" : "Add person"}
          </Button>
        </div>
      </form>
    </ResponsiveSheet>
  );
}
