import { Clock } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/**
 * Time field with an hour / minute / AM-PM picker. `value` and `onChange` use
 * "HH:mm" ("" when empty), so it drops in wherever `<input type="time">` was.
 */
export function TimeInput({
  value,
  onChange,
  id,
  className,
  disabled,
  clearable = true,
  placeholder = "Pick time",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [h24, minute] = value
    ? value.split(":").map(Number)
    : [null as number | null, null as number | null];
  const hour = h24 == null ? null : h24 % 12 || 12;
  const pm = h24 != null && h24 >= 12;
  // Keep an odd minute (e.g. 10:07 from older data) selectable.
  const minutes =
    minute != null && !MINUTES.includes(minute)
      ? [...MINUTES, minute].sort((a, b) => a - b)
      : MINUTES;

  function set(next: { hour?: number; minute?: number; pm?: boolean }) {
    const hr = next.hour ?? hour ?? 9;
    const mi = next.minute ?? minute ?? 0;
    const p = next.pm ?? pm;
    onChange(`${pad((hr % 12) + (p ? 12 : 0))}:${pad(mi)}`);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:text-sm dark:bg-input/30",
            className,
          )}
        >
          <span
            className={cn(
              "tabular truncate",
              !value && "text-muted-foreground",
            )}
          >
            {value ? formatTime(value) : placeholder}
          </span>
          <Clock className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-[min(18rem,calc(100vw-1.5rem))] p-3"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="tabular text-lg font-semibold">
            {value ? formatTime(value) : "--:--"}
          </span>
          <div
            role="radiogroup"
            aria-label="AM or PM"
            className="flex rounded-lg bg-muted p-0.5"
          >
            {[false, true].map((p) => (
              <Cell
                key={String(p)}
                selected={h24 != null && p === pm}
                onClick={() => set({ pm: p })}
              >
                {p ? "PM" : "AM"}
              </Cell>
            ))}
          </div>
        </div>
        {/* Tap grids rather than scrolling wheels: a popover inside a phone
            drawer sits outside its scroll lock, so it can't scroll. */}
        <div className="grid grid-cols-2 gap-3">
          <Grid label="Hour">
            {HOURS.map((h) => (
              <Cell
                key={h}
                selected={h === hour}
                onClick={() => set({ hour: h })}
              >
                {h}
              </Cell>
            ))}
          </Grid>
          <Grid label="Minute">
            {minutes.map((m) => (
              <Cell
                key={m}
                selected={m === minute}
                onClick={() => set({ minute: m })}
              >
                {pad(m)}
              </Cell>
            ))}
          </Grid>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
          {clearable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!value}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Grid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-center text-xs text-muted-foreground">{label}</p>
      <div role="group" aria-label={label} className="grid grid-cols-3 gap-1">
        {children}
      </div>
    </div>
  );
}

function Cell({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "tabular h-10 min-w-0 rounded-md px-2.5 text-sm hover:bg-accent md:h-8",
        selected && "bg-primary text-primary-foreground hover:bg-primary",
      )}
    >
      {children}
    </button>
  );
}
