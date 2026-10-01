import { useLocationPermissionStore } from "@/stores/locationPermissionStore";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";

type UseLocationReturn = {
  location: { lat: number; lng: number } | null;
  error: string | null;
  isLoading: boolean;
};

type UseLocationOptions = {
  /** Poll for a fresh fix on this interval (ms) while mounted. Off by default to save battery. */
  refetchInterval?: number;
};

export function useLocation(enabled: boolean = true, options?: UseLocationOptions): UseLocationReturn {
  const { status: permissionStatus } = useLocationPermissionStore();

  const { data, error, isLoading } = useQuery({
    queryKey: ["userLocation"],
    queryFn: async () => {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      return {
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
      };
    },
    enabled: enabled && permissionStatus === "granted",
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
    refetchInterval: options?.refetchInterval,
  });

  const errorMessage =
    permissionStatus === "denied"
      ? "Location permission denied"
      : error instanceof Error
      ? error.message
      : error
      ? "Failed to get location"
      : null;

  return {
    location: data ?? null,
    error: errorMessage,
    isLoading,
  };
}
