import { useLocation } from "@/hooks/useLocation";
import { useNearbyRadius } from "@/hooks/useNearbyRadius";
import {
  aggregateNearbySpecies,
  countNearbySpecies,
  getNearbySpeciesRaw,
  isMapCenteredOnUser,
} from "@/lib/nearbySpecies";
import { useMapStore } from "@/stores/mapStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

// Parsing the grid cells for an area is expensive, so wait for the map to rest first.
const SETTLE_DELAY = 600;

type Area = { lat: number; lng: number; km: number };

/**
 * How many species the Nearby Species screen would list for the current map view.
 * Uses the same center, radius and query key as that screen, so opening it afterwards is
 * an instant cache hit and the two numbers agree. The previous count stays up while the
 * map settles and the new area loads; null when there's nothing to show yet.
 */
export function useNearbySpeciesCount(enabled: boolean): number | null {
  const mapCenter = useMapStore((s) => s.mapCenter);
  const { location: userLocation } = useLocation();
  const radius = useNearbyRadius();
  const selectedMonths = useSettingsStore((s) => s.targetMonths);

  const center = isMapCenteredOnUser(mapCenter, userLocation) ? userLocation : mapCenter;
  const lat = center?.lat;
  const lng = center?.lng;
  const km = radius.km;

  const [settled, setSettled] = useState<Area | null>(null);
  useEffect(() => {
    if (lat == null || lng == null) return;
    const handle = setTimeout(() => setSettled({ lat, lng, km }), SETTLE_DELAY);
    return () => clearTimeout(handle);
  }, [lat, lng, km]);

  const { data } = useQuery({
    queryKey: ["nearbySpecies", settled?.lat, settled?.lng, settled?.km],
    queryFn: ({ signal }) => getNearbySpeciesRaw(settled!.lat, settled!.lng, settled!.km, signal),
    enabled: enabled && !!settled,
    placeholderData: (prev) => prev,
  });

  return useMemo(() => {
    if (!enabled || !data) return null;
    return countNearbySpecies(aggregateNearbySpecies(data, selectedMonths.length > 0 ? selectedMonths : undefined));
  }, [enabled, data, selectedMonths]);
}
