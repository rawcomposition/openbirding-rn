import { useInstalledPacks } from "@/hooks/useInstalledPacks";
import { STATIC_PACKS_URL } from "@/lib/config";
import { fetchJson } from "@/lib/download";
import { StaticPack, StaticPacksIndex } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function usePackUpdates() {
  const { data: remotePacks, isLoading: isLoadingRemote } = useQuery<StaticPack[]>({
    queryKey: ["packs"],
    queryFn: async () => {
      const response = await fetchJson<StaticPacksIndex>(STATIC_PACKS_URL);
      return response.packs;
    },
  });

  const { data: installedPacks, isLoading: isLoadingInstalled } = useInstalledPacks();

  const updateCount = useMemo(() => {
    if (!remotePacks || installedPacks.size === 0) return 0;

    let count = 0;
    for (const [packId, installedPack] of installedPacks) {
      const remotePack = remotePacks.find((p) => p.id === packId);
      if (remotePack && installedPack.version !== remotePack.v) {
        count++;
      }
    }
    return count;
  }, [remotePacks, installedPacks]);

  return {
    updateCount,
    hasUpdates: updateCount > 0,
    isLoading: isLoadingRemote || isLoadingInstalled,
  };
}
