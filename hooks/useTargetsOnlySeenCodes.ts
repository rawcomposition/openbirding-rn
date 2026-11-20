import { useSettingsStore } from "@/stores/settingsStore";
import { useMemo } from "react";

/**
 * The species to leave out when species lists are showing targets only: everything on the
 * life list, minus exclusions (which count as unseen). Null when lists show all species,
 * i.e. there's no life list or "Show All Species" is on.
 */
export function useTargetsOnlySeenCodes(): Set<string> | null {
  const lifelist = useSettingsStore((s) => s.lifelist);
  const lifelistExclusions = useSettingsStore((s) => s.lifelistExclusions);
  const showAllSpecies = useSettingsStore((s) => s.showAllSpecies);

  return useMemo(() => {
    if (showAllSpecies || !lifelist || lifelist.length === 0) return null;
    const excluded = new Set(lifelistExclusions ?? []);
    return new Set(lifelist.map((e) => e.code).filter((code) => !excluded.has(code)));
  }, [lifelist, lifelistExclusions, showAllSpecies]);
}
