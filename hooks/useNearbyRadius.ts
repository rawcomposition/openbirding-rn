import { getAutoRadiusOption, getRadiusOption, RadiusOption } from "@/lib/nearbySpecies";
import { useMapStore } from "@/stores/mapStore";
import { useSettingsStore } from "@/stores/settingsStore";

export type NearbyRadius = RadiusOption & {
  /** True while the radius follows the map view rather than a radius the user picked. */
  isAuto: boolean;
};

/**
 * The Nearby Species search radius. By default it matches what the map is showing; once the
 * user picks a specific radius it stays fixed until they switch back to "Match map view".
 */
export function useNearbyRadius(): NearbyRadius {
  const distanceUnits = useSettingsStore((s) => s.distanceUnits);
  const isAuto = useSettingsStore((s) => s.nearbyRadiusAuto);
  const radiusIndex = useSettingsStore((s) => s.nearbyRadiusIndex);
  const viewRadiusKm = useMapStore((s) => s.viewRadiusKm);

  const option = isAuto ? getAutoRadiusOption(distanceUnits, viewRadiusKm) : getRadiusOption(distanceUnits, radiusIndex);
  return { km: option.km, label: option.label, isAuto };
}
