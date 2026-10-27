import { queryClient as qc } from "@/integrations/tanstack-query/root-provider";
import { api, call } from "@/lib/api";
import { keys } from "@/lib/query-keys";

/**
 * Web Push for this browser (VAPID, no Firebase). Once subscribed, the API's
 * scheduler sends reminders even when the app is closed; the service worker
 * (`src/sw.ts`) draws them. Same flow as myasta's `lib/push/web-push.ts`:
 * subscribe from a click, re-register on every load after login (a new
 * login is a new session), forget on logout.
 */

export type PushConfig = { publicKey: string | null; devices: number };

export type PushState =
  /** This browser can't do push (old browser, iOS Safari outside an
   * installed app, or no service worker). */
  | "unsupported"
  /** The server has no VAPID keys. */
  | "unconfigured"
  | "blocked"
  | "off"
  | "on";

export const pushSupported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const config = () =>
  qc.fetchQuery({
    queryKey: keys.push,
    queryFn: (): Promise<PushConfig> => call(api.push.config.get()),
    staleTime: 60_000,
  });

/** The service worker, if one is (or gets) registered within a few seconds. */
async function registration() {
  if (!("serviceWorker" in navigator)) return null;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((r) => setTimeout(() => r(null), 5_000)),
  ]);
}

const b64ToBytes = (b64: string) => {
  const s = atob(
    (b64 + "=".repeat((4 - (b64.length % 4)) % 4))
      .replace(/-/g, "+")
      .replace(/_/g, "/"),
  );
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await registration();
  if (!reg) return "unsupported";
  const sub = await reg.pushManager.getSubscription();
  return Notification.permission === "granted" && sub ? "on" : "off";
}

/** Subscribes this browser and registers it with the API. Permission must
 * already be granted (ask from a click first). */
async function subscribe() {
  const reg = await registration();
  if (!reg) throw new Error("The app's service worker isn't running");
  const { publicKey } = await config();
  if (!publicKey) return "unconfigured" as const;
  const key = b64ToBytes(publicKey);
  let sub = await reg.pushManager.getSubscription();
  // Keys changed on the server: the old subscription can't be used.
  const current = sub?.options.applicationServerKey;
  if (sub && current && !sameKey(new Uint8Array(current), key)) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  const json = sub.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  const res = await call(
    api.push.devices.post({ endpoint: json.endpoint, keys: json.keys }),
  );
  qc.setQueryData<PushConfig>(keys.push, { publicKey, devices: res.devices });
  return "on" as const;
}

const sameKey = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** From a click: asks for permission, then subscribes. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const perm =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  if (perm === "denied") return "blocked";
  if (perm !== "granted") return "off";
  return subscribe();
}

/** Turns push off for this browser (in-app reminders still work while open). */
export async function disablePush() {
  const sub = await (await registration())?.pushManager.getSubscription();
  if (!sub) return;
  await call(api.push.devices.remove.post({ endpoint: sub.endpoint })).catch(
    () => {},
  );
  await sub.unsubscribe();
  await qc.invalidateQueries({ queryKey: keys.push });
}

let syncedFor: number | null = null;

/** On every logged-in load. Never prompts: a browser that already allows
 * notifications is (re)registered to this session. */
export async function syncPush(userId: number, allowed = true) {
  if (syncedFor === userId || !pushSupported()) return;
  // Turned off by the admin: the server ignores this browser anyway.
  if (!allowed) return;
  if (Notification.permission !== "granted") {
    void config().catch(() => {});
    return;
  }
  syncedFor = userId;
  try {
    await subscribe();
    await registerBackgroundCheck();
  } catch (err) {
    syncedFor = null;
    console.warn("[Push] sync failed:", err);
  }
}

/** Logout: this browser stops receiving the account's reminders (the API
 * also drops it with the session). */
export async function resetPush() {
  syncedFor = null;
  try {
    // Never wait for a worker here: logout must be instant.
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {}
}

/**
 * Periodic Background Sync (Chrome, installed app): lets the service worker
 * wake up now and then with no network and remind from the cached tasks.
 * The browser decides how often (by how much the app is used, often a few
 * times a day at most); asking for every 15 minutes gets the most it allows.
 */
export async function registerBackgroundCheck() {
  const reg = (await registration()) as
    | (ServiceWorkerRegistration & {
        periodicSync?: {
          register: (tag: string, o: { minInterval: number }) => Promise<void>;
        };
      })
    | null;
  if (!reg?.periodicSync) return;
  try {
    const status = await navigator.permissions.query({
      name: "periodic-background-sync" as PermissionName,
    });
    if (status.state !== "granted") return;
    await reg.periodicSync.register("tu-reminders", {
      minInterval: 15 * 60_000,
    });
  } catch {}
}
