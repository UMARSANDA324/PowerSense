import { useEffect, useRef, useState } from "react";
import { createCountdown } from "../utils/countdownEngine";

/**
 * useCountdownEngine Hook
 *
 * Drives a countdown timer that ticks every second.
 *
 * Key design decisions:
 * - targetTime is coerced to a ms-timestamp (number) to produce a stable
 *   dependency — Date objects are new references every render and would
 *   re-fire the effect infinitely.
 * - onExpire is stored in a ref so it never appears in a dependency array.
 * - setCountdown uses a functional updater that bails out (returns prev)
 *   when nothing meaningful changed, preventing unnecessary re-renders.
 */
export const useCountdownEngine = (targetTime, mode = "unknown", onExpire) => {
  // Coerce targetTime to a stable primitive (number | null)
  const targetMs = targetTime instanceof Date
    ? targetTime.getTime()
    : (typeof targetTime === "number" ? targetTime : null);

  const [countdown, setCountdown] = useState(() =>
    createCountdown({ currentTime: Date.now(), targetTime: targetMs })
  );

  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  const intervalIdRef = useRef(null);

  // Keep the ref in sync without triggering effects
  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredRef.current = false;

    const tick = () => {
      const next = createCountdown({ currentTime: Date.now(), targetTime: targetMs });

      setCountdown((prev) => {
        // Bail out if nothing the UI cares about actually changed
        if (
          prev.remainingSeconds === next.remainingSeconds &&
          prev.valid === next.valid &&
          prev.isExpired === next.isExpired
        ) {
          return prev; // same reference → no re-render
        }
        return next;
      });

      if (next.valid && next.isExpired && !expiredRef.current) {
        expiredRef.current = true;
        if (typeof onExpireRef.current === "function") {
          onExpireRef.current();
        }
      }
    };

    // If there is no target, compute once (synchronously) and stop.
    if (targetMs == null) {
      tick();
      return;
    }

    tick();
    intervalIdRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [targetMs, mode]);

  return countdown;
};
