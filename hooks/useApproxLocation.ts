import { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";

type UseApproxLocationReturn = {
  location: { lat: number; lng: number } | null;
  error: string | null;
  isLoading: boolean;
};

const LOCATION_CACHE_DURATION = 300000;

export function useApproxLocation(enabled: boolean = true): UseApproxLocationReturn {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchTime = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setError(null);
      return;
    }

    const now = Date.now();
    const hasRecentLocation =
      location && lastFetchTime.current && now - lastFetchTime.current < LOCATION_CACHE_DURATION;

    if (hasRecentLocation) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission denied");
          setIsLoading(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const locationData = {
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
        };
        setLocation(locationData);
        lastFetchTime.current = now;
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get location");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [enabled]);

  return { location, error, isLoading };
}
