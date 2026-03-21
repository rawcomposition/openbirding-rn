import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore duplicate calls during Fast Refresh.
});

export function useManagedSplashScreen(isReady: boolean, minDurationMs: number = 500) {
  const splashHiddenRef = useRef(false);
  const splashShownAtRef = useRef(Date.now());

  useEffect(() => {
    if (!isReady || splashHiddenRef.current) return;

    const remainingDelay = Math.max(minDurationMs - (Date.now() - splashShownAtRef.current), 0);
    splashHiddenRef.current = true;

    const timeout = setTimeout(() => {
      SplashScreen.hideAsync().catch((error) => {
        console.warn("Failed to hide splash screen:", error);
      });
    }, remainingDelay);

    return () => {
      clearTimeout(timeout);
      splashHiddenRef.current = false;
    };
  }, [isReady, minDurationMs]);
}
