import { getPinnedTargets, pinTarget, unpinTarget } from "@/lib/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { Alert } from "react-native";

// Stable identity so consumers can safely use the result as a memo/effect dependency.
const NO_PINNED_TARGETS: string[] = [];

type UsePinnedTargetsReturn = {
  pinnedTargets: string[];
  /** No-op when there's no hotspot to pin against (e.g. Nearby Species). */
  togglePin: (speciesCode: string, isPinned: boolean) => Promise<void>;
};

export function usePinnedTargets(hotspotId: string | null | undefined): UsePinnedTargetsReturn {
  const queryClient = useQueryClient();
  const queryKey = ["pinnedTargets", hotspotId];

  const { data: pinnedTargets = NO_PINNED_TARGETS } = useQuery({
    queryKey,
    queryFn: () => getPinnedTargets(hotspotId!),
    enabled: !!hotspotId,
  });

  // Written optimistically so the pin badge and row reordering land immediately;
  // rolled back if the write fails.
  const togglePin = useCallback(
    async (speciesCode: string, isPinned: boolean) => {
      if (!hotspotId) return;
      const key = ["pinnedTargets", hotspotId];
      const previous = queryClient.getQueryData<string[]>(key) ?? [];
      const next = isPinned ? previous.filter((code) => code !== speciesCode) : [...previous, speciesCode];
      queryClient.setQueryData<string[]>(key, next);

      try {
        if (isPinned) {
          await unpinTarget(hotspotId, speciesCode);
        } else {
          await pinTarget(hotspotId, speciesCode);
        }
        await queryClient.invalidateQueries({ queryKey: key });
      } catch {
        queryClient.setQueryData<string[]>(key, previous);
        Alert.alert("Couldn't Update Pin", "Try again.");
      }
    },
    [hotspotId, queryClient]
  );

  return { pinnedTargets, togglePin };
}
