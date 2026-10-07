/** Thin wrapper over the Notification API, preferring the service worker
 * (needed for action buttons and on Android, where `new Notification` throws). */

export type Permission = NotificationPermission | "unsupported";

export const notificationsSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

export const permission = (): Permission =>
  notificationsSupported() ? Notification.permission : "unsupported";

export async function requestPermission(): Promise<Permission> {
  if (!notificationsSupported()) return "unsupported";
  return Notification.requestPermission();
}

export type NotifyOptions = {
  title: string;
  body: string;
  /** Same tag replaces the previous notification instead of stacking. */
  tag: string;
  taskId?: string;
  requireInteraction?: boolean;
};

export async function showNotification(o: NotifyOptions) {
  if (permission() !== "granted") return false;
  const options: NotificationOptions & {
    actions?: { action: string; title: string }[];
    renotify?: boolean;
  } = {
    body: o.body,
    tag: o.tag,
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    renotify: true,
    requireInteraction: o.requireInteraction,
    data: { taskId: o.taskId ?? null },
    actions: o.taskId
      ? [
          { action: "done", title: "✓ Mark done" },
          { action: "snooze", title: "Snooze 1h" },
        ]
      : undefined,
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(o.title, options);
      return true;
    }
    const { actions: _a, ...plain } = options;
    const n = new Notification(o.title, plain);
    n.onclick = () => {
      window.focus();
      if (o.taskId) window.location.assign(`/tasks?task=${o.taskId}`);
      n.close();
    };
    return true;
  } catch (e) {
    console.warn("Notification failed", e);
    return false;
  }
}
