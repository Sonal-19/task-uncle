import { Link, type LinkProps } from "@tanstack/react-router";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  hint,
  link,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: "primary" | "pending" | "overdue" | "done" | "progress";
  hint?: string;
  link?: LinkProps;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">
          {label}
        </p>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-full [&_svg]:size-4",
            tone === "primary" && "bg-accent text-accent-foreground",
            tone === "pending" && "bg-pending/12 text-pending",
            tone === "overdue" && "bg-overdue/12 text-overdue",
            tone === "done" && "bg-done/12 text-done",
            tone === "progress" && "bg-progress/12 text-progress",
          )}
        >
          {icon}
        </span>
      </div>
      <p className="tabular mt-2 truncate text-2xl font-bold">{value}</p>
      {hint && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
      )}
    </>
  );
  const cls =
    "block rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md";
  return link ? (
    <Link {...link} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
