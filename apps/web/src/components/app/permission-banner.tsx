import { BellRing, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInstall } from "@/components/app/install-app";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-data";
import { usePermission } from "@/hooks/use-permission";
import { isIOS, isMobile, isStandalone, NOTIFY_DISMISSED } from "@/lib/pwa";
import { showNotification } from "@/lib/reminders/notify";

type BannerState = "default" | "denied" | "ios-install" | "insecure";

/** How to unblock notifications on this kind of device. */
function unblockSteps() {
  if (isIOS())
    return "Open iPhone Settings → Notifications → Task Uncle → Allow Notifications.";
  if (isMobile())
    return "Tap ⋮ → Settings → Site settings → Notifications and allow this site (installed app: long-press its icon → App info → Notifications).";
  return "Click the lock icon in the address bar → Notifications → Allow.";
}

const COPY: Record<BannerState, { title: string; text: () => string }> = {
  default: {
    title: "Allow notifications so Uncle can remind you",
    text: () =>
      "Pending tasks will keep reminding you until you mark them done — even when the app is closed.",
  },
  denied: { title: "Notifications are blocked", text: unblockSteps },
  "ios-install": {
    title: "Add Task Uncle to your Home Screen for reminders",
    text: () =>
      "On iPhone and iPad, notifications work only in the installed app. Install it, open it from the Home Screen, then allow notifications.",
  },
  insecure: {
    title: "Notifications need the secure (https) address",
    text: () =>
      "This page is open over plain http (like a local network address), where browsers block notifications. Open the https address of Task Uncle.",
  },
};

/** Asks for notification permission until granted or dismissed (on this
 * device). On phones it also covers the cases with no Allow button: iPhone
 * outside the installed app, and plain-http addresses. */
export function PermissionBanner() {
  const [perm, request] = usePermission();
  const settings = useSettings().data;
  const { install, help } = useInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(NOTIFY_DISMISSED) === "1";
    } catch {
      return false;
    }
  });

  if (!settings || settings.notifications === "off" || dismissed) return null;
  const state: BannerState | null = !window.isSecureContext
    ? "insecure"
    : perm === "unsupported"
      ? isIOS() && !isStandalone()
        ? "ios-install"
        : null
      : perm === "granted"
        ? null
        : perm;
  if (!state) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(NOTIFY_DISMISSED, "1");
    } catch {}
  };

  async function allow() {
    const next = await request();
    if (next === "granted") {
      toast.success("Notifications on — Uncle will remind you");
      showNotification({
        title: "Namaste! 🙏 Task Uncle is on duty",
        body: "You'll get reminders for pending work until it's done.",
        tag: "welcome",
      });
    } else if (next === "denied") {
      toast.error("Blocked", { description: unblockSteps() });
    }
  }

  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-primary/25 bg-accent p-4 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <BellRing className="size-5 animate-bell-ring" />
      </span>
      <div className="min-w-0 flex-1 pr-6">
        <p className="font-semibold text-accent-foreground">
          {COPY[state].title}
        </p>
        <p className="text-sm text-muted-foreground">{COPY[state].text()}</p>
      </div>
      {state === "default" && (
        <Button onClick={allow} className="w-full shrink-0 sm:w-auto">
          Allow notifications
        </Button>
      )}
      {state === "ios-install" && (
        <Button onClick={install} className="w-full shrink-0 sm:w-auto">
          How to install
        </Button>
      )}
      {help}
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        onClick={dismiss}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
