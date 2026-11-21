import { getAutoRadiusOption, getRadiusOption, RadiusOption } from "@/lib/nearbySpecies";
import { useMapStore } from "@/stores/mapStore";
import { useSettingsStore } from "@/stores/settingsStore";

export type NearbyRadius = RadiusOption & {
  isAuto: boolean;
};

export function useNearbyRadius(): NearbyRadius {
  const distanceUnits = useSettingsStore((s) => s.distanceUnits);
  const isAuto = useSettingsStore((s) => s.nearbyRadiusAuto);
  const radiusIndex = useSettingsStore((s) => s.nearbyRadiusIndex);
  const viewRadiusKm = useMapStore((s) => s.viewRadiusKm);

  const option = isAuto ? getAutoRadiusOption(distanceUnits, viewRadiusKm) : getRadiusOption(distanceUnits, radiusIndex);
  return { km: option.km, label: option.label, isAuto };
}
