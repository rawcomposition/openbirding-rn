import { useState, useEffect } from "react";
import * as Location from "expo-location";

type UseCurrentLocationReturn = {
  location: { lat: number; lng: number } | null;
  error: string | null;
  isLoading: boolean;
};

export function useCurrentLocation(enabled: boolean = true): UseCurrentLocationReturn {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setError(null);
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

        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
        });
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

