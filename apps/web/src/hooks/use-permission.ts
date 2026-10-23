import { useCallback, useEffect, useState } from "react";
import { enablePush } from "@/lib/push";
import {
  type Permission,
  permission,
  requestPermission,
} from "@/lib/reminders/notify";

/** Live notification permission (re-read when the tab regains focus,
 * since it can be changed from the browser's site settings). */
export function usePermission() {
  const [state, setState] = useState<Permission>(permission);
  useEffect(() => {
    const sync = () => setState(permission());
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  const request = useCallback(async () => {
    const next = await requestPermission();
    setState(next);
    // Allowed: also register this browser for server reminders (Web Push),
    // so they arrive with the app closed.
    if (next === "granted")
      void enablePush().catch((e) => console.warn("[Push] enable failed", e));
    return next;
  }, []);
  return [state, request] as const;
}
