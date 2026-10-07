/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA: serve index.html for app routes (not /api).
try {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL("/index.html"), {
      denylist: [/^\/api/],
    }),
  );
} catch {
  // index.html is not precached in dev.
}

/**
 * Reminder taps. "done" / "snooze" are handled by an open tab without
 * focusing it; a plain tap focuses the app on the task. With no tab open,
 * the app is opened with the action in the URL and applies it on load.
 */
self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const taskId = (n.data as { taskId?: string | null } | null)?.taskId ?? null;
  const action = event.action || "";
  n.close();

  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const win = wins[0];
      if (win) {
        if (taskId) win.postMessage({ type: "task-action", taskId, action });
        if (!action) await (win as WindowClient).focus();
        if (!taskId && !action) (win as WindowClient).navigate("/dashboard");
        return;
      }
      const url = taskId
        ? `/tasks?task=${taskId}${action ? `&action=${action}` : ""}`
        : "/dashboard";
      await self.clients.openWindow(url);
    })(),
  );
});
