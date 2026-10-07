import { useCallback, useEffect, useState } from "react";
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
    return next;
  }, []);
  return [state, request] as const;
}
