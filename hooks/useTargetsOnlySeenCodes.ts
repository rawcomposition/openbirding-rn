import { useSettingsStore } from "@/stores/settingsStore";
import { useMemo } from "react";

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
