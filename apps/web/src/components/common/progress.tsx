import { cn } from "@/lib/utils";

export function Progress({
  value,
  max,
  className,
  color,
}: {
  value: number;
  max: number;
  className?: string;
  color?: string;
}) {
  const ratio = max > 0 ? value / max : 0;
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-done transition-all duration-500"
        style={{
          width: `${Math.min(100, ratio * 100)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
