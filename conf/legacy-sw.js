// Served as /sw.js on the old address (tu.u4.lol), which now 301s to
// taskuncle.com. An installed app there keeps serving its cached shell and
// never sees the redirect, so this worker replaces it: it takes over at once,
// unregisters itself, drops the old caches and sends open windows to the same
// page on the new address.
const NEW_ORIGIN = "https://taskuncle.com";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.registration.unregister();
      for (const key of await caches.keys()) await caches.delete(key);
      const windows = await self.clients.matchAll({ type: "window" });
      for (const client of windows) {
        const url = new URL(client.url);
        client.navigate(NEW_ORIGIN + url.pathname + url.search).catch(() => {});
      }
    })(),
  );
});
