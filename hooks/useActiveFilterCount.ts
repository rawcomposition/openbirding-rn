import { useFiltersStore } from "@/stores/filtersStore";
import { useSettingsStore } from "@/stores/settingsStore";

// The target-rich filter only counts as active once a life list is imported.
export function useActiveFilterCount() {
  const showSavedOnly = useFiltersStore((state) => state.showSavedOnly);
  const targetRichEnabled = useFiltersStore((state) => state.targetRichEnabled);
  const lifelist = useSettingsStore((state) => state.lifelist);
  const hasLifeList = (lifelist?.length ?? 0) > 0;

  return [showSavedOnly, targetRichEnabled && hasLifeList].filter(Boolean).length;
}
