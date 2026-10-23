import { Download, EllipsisVertical, Share, SquarePlus, X } from "lucide-react";
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

export function useInstall() {
  const available = usePwa(canOfferInstall);
  const [help, setHelp] = useState(false);
  const install = async () => {
    // One tap when the browser offers it, else how to do it by hand.
    if (usePwa.getState().installEvent) await installApp();
    else setHelp(true);
  };
  const ios = isIOS();
  const steps = ios
    ? [
        {
          icon: Share,
          text: (
            <>
              Tap <b>Share</b> in Safari's toolbar (in Chrome, the share icon in
              the address bar).
            </>
          ),
        },
        {
          icon: SquarePlus,
          text: (
            <>
              Choose <b>Add to Home Screen</b>, then <b>Add</b>.
            </>
          ),
        },
      ]
    : [
        {
          icon: EllipsisVertical,
          text: (
            <>
              Open the browser menu (<b>⋮</b> at the top right, or <b>≡</b> at
              the bottom in Samsung Internet).
            </>
          ),
        },
        {
          icon: SquarePlus,
          text: (
            <>
              Tap <b>Install app</b> or <b>Add to Home screen</b>, then{" "}
              <b>Install</b>.
            </>
          ),
        },
      ];
  const helpSheet = (
    <ResponsiveSheet
      open={help}
      onOpenChange={setHelp}
      title={ios ? "Add to Home Screen" : "Install Task Uncle"}
      description={
        ios
          ? "iPhone and iPad install apps from the Share menu. Once installed, Task Uncle can also send you notifications."
          : "Your browser installs apps from its menu."
      }
    >
      <ol className="space-y-3 text-sm">
        {steps.map((st, i) => (
          <li key={i} className="flex items-center gap-3">
            <st.icon className="size-5 shrink-0 text-primary" />
            <span>{st.text}</span>
          </li>
        ))}
      </ol>
      {!window.isSecureContext && (
        <p className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          This page is open over plain http, so the browser can only add a
          shortcut. Open the https address to install the full app (offline and
          notifications).
        </p>
      )}
      <Button className="mt-5 w-full" onClick={() => setHelp(false)}>
        Got it
      </Button>
    </ResponsiveSheet>
  );
  return { available, install, help: helpSheet };
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
