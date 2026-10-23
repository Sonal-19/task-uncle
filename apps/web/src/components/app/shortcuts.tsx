import { Fragment } from "react";
import { ResponsiveSheet } from "@/components/common/responsive-sheet";
import { bindingKeys } from "@/hooks/use-shortcuts";
import { SHORTCUT_ACTIONS, SHORTCUT_GROUPS } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-grid h-6 min-w-6 place-items-center rounded-md border border-b-2 bg-muted px-1.5 font-sans text-[11px] font-semibold text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** A binding drawn as keycaps: "g d" → G then D. `compact` draws smaller
 * keys without the "then", for buttons and menus. */
export function ShortcutKeys({
  binding,
  className,
  compact,
}: {
  binding: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        compact &&
          "gap-0.5 [&_kbd]:h-4.5 [&_kbd]:min-w-4.5 [&_kbd]:rounded [&_kbd]:px-1 [&_kbd]:text-[10px]",
        className,
      )}
    >
      {bindingKeys(binding).map((keys, i) => (
        <Fragment key={i}>
          {i > 0 && !compact && (
            <span className="text-[11px] text-muted-foreground">then</span>
          )}
          {keys.map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}
        </Fragment>
      ))}
    </span>
  );
}

/** Cheat sheet opened with "?" (or from Settings). */
export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={setOpen}
      title="Keyboard shortcuts"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group}>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {group}
            </p>
            <ul className="space-y-1.5">
              {SHORTCUT_ACTIONS.filter((a) => a.group === group).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate">{a.label}</span>
                  <ShortcutKeys binding={a.key} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        Letter shortcuts are paused while you type in a field or a sheet is
        open. <ShortcutKeys binding="mod+k" compact /> also opens search.
      </p>
    </ResponsiveSheet>
  );
}
