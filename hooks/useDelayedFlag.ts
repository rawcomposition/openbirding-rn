import { useEffect, useRef, useState } from "react";

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
