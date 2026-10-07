import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSettings, useUpdateSettings } from "@/hooks/use-data";
import { usePermission } from "@/hooks/use-permission";
import { showNotification } from "@/lib/reminders/notify";

/** Asks for notification permission until granted or dismissed. */
export function PermissionBanner() {
  const [perm, request] = usePermission();
  const settings = useSettings().data;
  const update = useUpdateSettings();

  if (!settings || settings.notifications === "off") return null;
  if (perm === "granted" || perm === "unsupported") return null;
  if (perm === "default" && settings.permissionPromptDismissedAt) return null;

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
      toast.error(
        "Blocked. Allow notifications from the browser's site settings.",
      );
    }
  }

  return (
    <div className="relative mb-5 flex flex-col gap-3 overflow-hidden rounded-2xl border border-primary/25 bg-accent p-4 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <BellRing className="size-5 animate-bell-ring" />
      </span>
      <div className="min-w-0 flex-1 pr-6">
        <p className="font-semibold text-accent-foreground">
          {perm === "denied"
            ? "Notifications are blocked"
            : "Allow notifications so Uncle can remind you"}
        </p>
        <p className="text-sm text-muted-foreground">
          {perm === "denied"
            ? "Click the lock icon in the address bar → Notifications → Allow."
            : "Pending tasks will keep reminding you until you mark them done."}
        </p>
      </div>
      {perm === "default" && (
        <Button onClick={allow} className="shrink-0">
          Allow notifications
        </Button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        onClick={() =>
          update.mutate({
            permissionPromptDismissedAt: new Date().toISOString(),
          })
        }
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
