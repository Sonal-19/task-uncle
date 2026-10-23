import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

/** A small per-day bar chart (last 14 days). */
export function DayBars({
  data,
  className,
  barClassName = "bg-primary",
}: {
  data: { day: string; count: number }[];
  className?: string;
  barClassName?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className={className}>
      <p className="mb-3 text-2xl font-bold tabular-nums">
        {total}
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          in {data.length} days
        </span>
      </p>
      <div
        className="flex h-28 items-end gap-1"
        role="img"
        aria-label="Per day"
      >
        {data.map((d) => (
          <div
            key={d.day}
            className="group relative flex h-full flex-1 items-end"
            title={`${format(parseISO(d.day), "d MMM")}: ${d.count}`}
          >
            <div
              className={cn(
                "w-full rounded-t-sm transition-opacity group-hover:opacity-80",
                d.count ? barClassName : "bg-muted",
              )}
              style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0] && format(parseISO(data[0].day), "d MMM")}</span>
        <span>Today</span>
      </div>
    </div>
  );
}
