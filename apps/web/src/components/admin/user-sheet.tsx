import { useEffect, useState } from "react";
import { Field } from "@/components/common/field";
import { PasswordInput } from "@/components/common/password-input";
import { ResponsiveSheet } from "@/components/common/responsive-sheet";
import { SelectField } from "@/components/common/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  type AdminUserRow,
  useCreateUser,
  useUpdateUser,
} from "@/hooks/use-admin";
import type { UserRole } from "@/lib/types";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

/**
 * Create a user, edit one, or (`mode="password"`) set a new password.
 * The account's own data (tasks, events…) is never touched from here.
 */
export function UserSheet({
  open,
  onOpenChange,
  user,
  mode = "details",
  isSelf = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create. */
  user: Pick<
    AdminUserRow,
    "id" | "name" | "email" | "role" | "notifyPermission"
  > | null;
  mode?: "details" | "password";
  isSelf?: boolean;
}) {
  const create = useCreateUser();
  const update = useUpdateUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [notify, setNotify] = useState(true);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setRole(user?.role ?? "user");
    setNotify((user?.notifyPermission ?? "on") === "on");
    setPassword("");
  }, [open]);

  const close = () => onOpenChange(false);
  const busy = create.isPending || update.isPending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "password" && user) {
      update.mutate({ id: user.id, password }, { onSuccess: close });
      return;
    }
    const body = {
      name: name.trim(),
      email: email.trim(),
      role,
      notifyPermission: notify ? ("on" as const) : ("off" as const),
    };
    if (user) update.mutate({ id: user.id, ...body }, { onSuccess: close });
    else create.mutate({ ...body, password }, { onSuccess: close });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        mode === "password"
          ? "Set a new password"
          : user
            ? "Edit user"
            : "New user"
      }
      description={
        mode === "password"
          ? `${user?.name} is logged out on every device and signs in with the new password.`
          : user
            ? undefined
            : "They can log in straight away with this email and password."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {mode === "details" && (
          <>
            <Field label="Name" htmlFor="u-name" required>
              <Input
                id="u-name"
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="u-email" required>
              <Input
                id="u-email"
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field
              label="Role"
              htmlFor="u-role"
              hint={
                isSelf
                  ? "You can't remove your own admin role."
                  : "Admins open the admin panel and manage users."
              }
            >
              <SelectField<UserRole>
                id="u-role"
                value={role}
                options={ROLES}
                onChange={setRole}
                disabled={isSelf}
              />
            </Field>
            <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Off = no reminders at all for this account (push or in-app).
                </p>
              </div>
              <Switch
                checked={notify}
                onCheckedChange={setNotify}
                aria-label="Notifications allowed"
              />
            </div>
          </>
        )}
        {(mode === "password" || !user) && (
          <Field
            label={user ? "New password" : "Password"}
            htmlFor="u-pw"
            hint="At least 6 characters. Share it with them privately."
            required
          >
            <PasswordInput
              id="u-pw"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {mode === "password"
              ? "Set password"
              : user
                ? "Save"
                : "Create user"}
          </Button>
        </div>
      </form>
    </ResponsiveSheet>
  );
}
