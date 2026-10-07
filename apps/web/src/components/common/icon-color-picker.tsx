import { Check } from "lucide-react";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { COLORS, ICON_KEYS, iconFor } from "@/lib/icons";
import { cn } from "@/lib/utils";

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Colour ${c}`}
          onClick={() => onChange(c)}
          className="grid size-8 place-items-center rounded-full text-white transition-transform active:scale-90"
          style={{ backgroundColor: c }}
        >
          {value === c && <Check className="size-4" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

/**
 * Icon grid that shows two rows (7 columns on phones, 10 from `sm`) with a
 * "More" tile; the chosen icon always stays visible while collapsed.
 */
export function IconPicker({
  value,
  color,
  onChange,
}: {
  value: string;
  color: string;
  onChange: (k: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cols = useMediaQuery("(min-width: 640px)") ? 10 : 7;
  const fits = ICON_KEYS.length <= cols * 2;

  let keys = ICON_KEYS;
  if (!expanded && !fits) {
    // Two rows minus the slot taken by the "More" tile.
    keys = ICON_KEYS.slice(0, cols * 2 - 1);
    if (value && !keys.includes(value) && ICON_KEYS.includes(value))
      keys = [...keys.slice(0, -1), value];
  }

  return (
    <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
      {keys.map((k) => {
        const Icon = iconFor(k);
        const active = value === k;
        return (
          <button
            key={k}
            type="button"
            aria-label={k}
            aria-pressed={active}
            onClick={() => onChange(k)}
            className={cn(
              "grid aspect-square place-items-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted [&_svg]:size-4.5",
              active && "border-transparent",
            )}
            style={
              active
                ? {
                    color,
                    backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`,
                  }
                : undefined
            }
          >
            <Icon />
          </button>
        );
      })}
      {!fits && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={
            expanded
              ? "Show fewer icons"
              : `Show ${ICON_KEYS.length - keys.length} more icons`
          }
          onClick={() => setExpanded((e) => !e)}
          className="grid aspect-square place-items-center rounded-lg border border-dashed text-[11px] font-medium text-primary transition-colors hover:bg-muted"
        >
          {expanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}
