import { useEffect, useRef, useState } from "react";

/**
 * Delays surfacing a transient `true` flag so brief flickers never render.
 *
 * The returned value only becomes `true` after `source` has stayed `true`
 * continuously for `delayMs`. It clears immediately when `source` goes `false`,
 * so quick on/off cycles (e.g. a loading badge during incremental map pans)
 * never appear. Use to suppress loading indicators for work that usually
 * resolves faster than the delay.
 */
export function useDelayedFlag(source: boolean, delayMs: number): boolean {
  const [delayed, setDelayed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!source) {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setDelayed(false);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setDelayed(true);
    }, delayMs);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [source, delayMs]);

  return delayed;
}
