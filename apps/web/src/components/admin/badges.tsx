import type { UserRole, UserStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RoleBadge({ role }: { role: UserRole }) {
  return role === "admin" ? (
    <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
      Admin
    </span>
  ) : null;
}

export function StatusPill({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        status === "active"
          ? "bg-done/12 text-done"
          : "bg-overdue/12 text-overdue",
      )}
    >
      {status === "active" ? "Active" : "Disabled"}
    </span>
  );
}
