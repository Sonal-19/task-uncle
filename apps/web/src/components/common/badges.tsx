import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Flag,
  Loader,
} from "lucide-react";
import type * as React from "react";
import { initials } from "@/lib/format";
import { iconFor } from "@/lib/icons";
import type { Priority, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<
  TaskStatus | "overdue",
  { label: string; className: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pending",
    className: "bg-pending/12 text-pending",
    icon: Circle,
  },
  in_progress: {
    label: "In progress",
    className: "bg-progress/12 text-progress",
    icon: Loader,
  },
  done: {
    label: "Done",
    className: "bg-done/12 text-done",
    icon: CheckCircle2,
  },
  overdue: {
    label: "Overdue",
    className: "bg-overdue/12 text-overdue",
    icon: AlertTriangle,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus | "overdue";
  className?: string;
}) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        s.className,
        className,
      )}
    >
      <s.icon className="size-3" />
      {s.label}
    </span>
  );
}

const PRIORITY_STYLE: Record<Priority, string> = {
  low: "text-muted-foreground",
  medium: "text-progress",
  high: "text-pending",
  urgent: "text-overdue",
};

export function PriorityFlag({
  priority,
  withLabel,
  className,
}: {
  priority: Priority;
  withLabel?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold capitalize",
        PRIORITY_STYLE[priority],
        className,
      )}
      title={`${priority} priority`}
    >
      <Flag
        className="size-3.5"
        fill={
          priority === "urgent" || priority === "high" ? "currentColor" : "none"
        }
      />
      {withLabel && priority}
    </span>
  );
}

/** Coloured rounded tile with the event/category icon. */
export function IconTile({
  icon,
  color,
  className,
}: {
  icon: string;
  color: string;
  className?: string;
}) {
  const Icon = iconFor(icon);
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`,
        color,
      }}
    >
      <Icon />
    </span>
  );
}

const AVATAR_COLORS = [
  "#4f46e5",
  "#db2777",
  "#0d9488",
  "#d97706",
  "#7c3aed",
  "#0284c7",
];

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const hue =
    AVATAR_COLORS[
      [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length
    ];
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white",
        className,
      )}
      style={{ backgroundColor: hue }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
