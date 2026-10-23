import { type ReactNode, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  CUSTOM_MINUTES_MAX,
  CUSTOM_MINUTES_MIN,
  everyLabel,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/** Inside the limits every reminder repeat must keep (5 min – 7 days). */
export const validRepeat = (minutes: number) =>
  Number.isInteger(minutes) &&
  minutes >= CUSTOM_MINUTES_MIN &&
  minutes <= CUSTOM_MINUTES_MAX;

/**
 * A repeat as hours + minutes, with quick picks ("1 h", "2 h"…). Used for
 * the custom reminder in Settings and on each task. `action` sits next to
 * the inputs (e.g. Settings' Save button); `hint` is shown when valid.
 */
export function DurationPicker({
  value,
  onChange,
  quick = [30, 60, 120, 180, 360, 720],
  hint,
  action,
  label = "Repeat",
}: {
  value: number;
  onChange: (minutes: number) => void;
  quick?: number[];
  hint?: (minutes: number) => string;
  action?: ReactNode;
  label?: string;
}) {
  // Text drafts, so a field can be cleared while typing.
  const [hours, setHours] = useState(String(Math.floor(value / 60)));
  const [mins, setMins] = useState(String(value % 60));
  const total = (h: string, m: string) =>
    (Number(h) || 0) * 60 + (Number(m) || 0);
  const now = total(hours, mins);
  const ok = validRepeat(now);

  const setH = (h: string) => {
    setHours(h);
    onChange(total(h, mins));
  };
  const setM = (m: string) => {
    setMins(m);
    onChange(total(hours, m));
  };
  const pick = (m: number) => {
    setHours(String(Math.floor(m / 60)));
    setMins(String(m % 60));
    onChange(m);
  };

  return (
    <div className="space-y-3 rounded-xl border bg-muted/40 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Hours
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={168}
            value={hours}
            onChange={(e) => setH(e.target.value)}
            className="w-20"
            aria-label={`${label} hours`}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Minutes
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            step={5}
            value={mins}
            onChange={(e) => setM(e.target.value)}
            className="w-20"
            aria-label={`${label} minutes`}
          />
        </label>
        {action}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {quick.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pick(m)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium",
              now === m
                ? "border-primary bg-accent text-accent-foreground"
                : "bg-background hover:bg-muted",
            )}
          >
            {everyLabel(m).replace("Every ", "")}
          </button>
        ))}
      </div>
      <p
        className={cn(
          "text-xs",
          ok ? "text-muted-foreground" : "text-destructive",
        )}
      >
        {ok
          ? (hint?.(now) ?? everyLabel(now))
          : `Choose between ${CUSTOM_MINUTES_MIN} minutes and 7 days.`}
      </p>
    </div>
  );
}
