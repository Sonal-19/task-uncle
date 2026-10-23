import { Download, Share, SquarePlus, X } from "lucide-react";
import { useState } from "react";
import { ResponsiveSheet } from "@/components/common/responsive-sheet";
import { Button } from "@/components/ui/button";
import {
  canOfferInstall,
  INSTALL_DISMISSED,
  installApp,
  isIOS,
  isStandalone,
  usePwa,
} from "@/lib/pwa";
import { cn } from "@/lib/utils";

function useInstall() {
  const available = usePwa(canOfferInstall);
  const [iosHelp, setIosHelp] = useState(false);
  const install = async () => {
    if (isIOS() && !usePwa.getState().installEvent) setIosHelp(true);
    else await installApp();
  };
  const help = (
    <ResponsiveSheet
      open={iosHelp}
      onOpenChange={setIosHelp}
      title="Add to Home Screen"
      description="Safari on iPhone and iPad installs apps from the Share menu."
    >
      <ol className="space-y-3 text-sm">
        <li className="flex items-center gap-3">
          <Share className="size-5 shrink-0 text-primary" />
          Tap <b>Share</b> in Safari's toolbar.
        </li>
        <li className="flex items-center gap-3">
          <SquarePlus className="size-5 shrink-0 text-primary" />
          Choose <b>Add to Home Screen</b>, then <b>Add</b>.
        </li>
      </ol>
      <Button className="mt-5 w-full" onClick={() => setIosHelp(false)}>
        Got it
      </Button>
    </ResponsiveSheet>
  );
  return { available, install, help };
}

/** "Install app" in one click (sidebar, settings). Hidden once installed,
 * or replaced by `fallback` text. */
export function InstallButton({
  compact,
  className,
  fallback,
}: {
  compact?: boolean;
  className?: string;
  fallback?: string;
}) {
  const { available, install, help } = useInstall();
  if (!available)
    return fallback ? (
      <span className="shrink-0 text-sm text-muted-foreground">
        {isStandalone() ? fallback : "Use your browser's install option"}
      </span>
    ) : null;
  return (
    <>
      <Button
        variant="outline"
        size={compact ? "icon" : "sm"}
        className={cn(!compact && "w-full", className)}
        onClick={install}
        aria-label="Install app"
        title="Install app"
      >
        <Download />
        {!compact && "Install app"}
      </Button>
      {help}
    </>
  );
}

/** Card on top of the dashboard offering the install, shown after each
 * login until installed ("Not now" hides it until the next login). */
export function InstallCard() {
  const { available, install, help } = useInstall();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(INSTALL_DISMISSED) === "1";
    } catch {
      return false;
    }
  });
  if (!available || hidden) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(INSTALL_DISMISSED, "1");
    } catch {}
  };
  return (
    <div className="flex animate-in items-center gap-3 rounded-2xl border bg-accent/50 p-3 pr-2 shadow-sm duration-500 fade-in slide-in-from-top-4">
      <img src="/pwa-192.png" alt="" className="size-10 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install Task Uncle</p>
        <p className="text-xs text-muted-foreground">
          Opens like an app, reminds you and works offline.
        </p>
      </div>
      <Button size="sm" onClick={install}>
        <Download /> Install
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Not now"
        onClick={dismiss}
      >
        <X />
      </Button>
      {help}
    </div>
  );
}
