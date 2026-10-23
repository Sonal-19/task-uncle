import { useCallback, useEffect, useState } from "react";
import { disablePush, enablePush, type PushState, pushState } from "@/lib/push";

/** This browser's Web Push state, re-read when the tab regains focus. */
export function usePush() {
  const [state, setState] = useState<PushState | null>(null);
  const reload = useCallback(
    () =>
      void pushState()
        .then(setState)
        .catch(() => setState("unsupported")),
    [],
  );
  useEffect(() => {
    reload();
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);
  const enable = useCallback(async () => {
    const next = await enablePush();
    setState(next);
    return next;
  }, []);
  const disable = useCallback(async () => {
    await disablePush();
    setState("off");
  }, []);
  return { state, enable, disable };
}
