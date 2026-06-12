import { useFiltersStore } from "@/stores/filtersStore";
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * Number of hotspot filters currently active. Drives the badge on both the
 * Nearby Hotspots map button and the filter toggle inside the hotspot list.
 * The personalized filter only counts when a life list is actually imported.
 */
export function useActiveFilterCount() {
  const showSavedOnly = useFiltersStore((state) => state.showSavedOnly);
  const personalizedFilterEnabled = useFiltersStore((state) => state.personalizedFilterEnabled);
  const lifelist = useSettingsStore((state) => state.lifelist);
  const hasLifeList = (lifelist?.length ?? 0) > 0;

  return [showSavedOnly, personalizedFilterEnabled && hasLifeList].filter(Boolean).length;
}
