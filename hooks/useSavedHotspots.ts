import { getSavedHotspots, isHotspotSaved, saveHotspot, unsaveHotspot } from "@/lib/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

type UseSavedHotspotsReturn = {
  isSaved: (hotspotId: string) => Promise<boolean>;
  saveHotspot: (hotspotId: string, notes?: string) => Promise<void>;
  unsaveHotspot: (hotspotId: string) => Promise<void>;
  toggleSave: (hotspotId: string, notes?: string) => Promise<boolean>;
  savedHotspotsSet: Set<string>;
  isLoading: boolean;
};

export function useSavedHotspots(): UseSavedHotspotsReturn {
  const queryClient = useQueryClient();

  const { data: savedHotspots = [], isLoading } = useQuery({
    queryKey: ["savedHotspots"],
    queryFn: getSavedHotspots,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const savedHotspotsSet = new Set(savedHotspots.map((s) => s.hotspot_id));

  const saveMutation = useMutation({
    mutationFn: ({ hotspotId, notes }: { hotspotId: string; notes?: string }) => saveHotspot(hotspotId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedHotspots"] });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (hotspotId: string) => unsaveHotspot(hotspotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedHotspots"] });
    },
  });

  const checkIsSaved = useCallback(async (hotspotId: string): Promise<boolean> => {
    try {
      return await isHotspotSaved(hotspotId);
    } catch (error) {
      console.error("Error checking if hotspot is saved:", error);
      return false;
    }
  }, []);

  const saveHotspotWithNotes = useCallback(
    async (hotspotId: string, notes?: string): Promise<void> => {
      try {
        await saveMutation.mutateAsync({ hotspotId, notes });
      } catch (error) {
        console.error("Error saving hotspot:", error);
        throw error;
      }
    },
    [saveMutation]
  );

  const unsaveHotspotById = useCallback(
    async (hotspotId: string): Promise<void> => {
      try {
        await unsaveMutation.mutateAsync(hotspotId);
      } catch (error) {
        console.error("Error unsaving hotspot:", error);
        throw error;
      }
    },
    [unsaveMutation]
  );

  const toggleSave = useCallback(
    async (hotspotId: string, notes?: string): Promise<boolean> => {
      try {
        const currentlySaved = await isHotspotSaved(hotspotId);
        if (currentlySaved) {
          await unsaveMutation.mutateAsync(hotspotId);
          return false;
        } else {
          await saveMutation.mutateAsync({ hotspotId, notes });
          return true;
        }
      } catch (error) {
        console.error("Error toggling hotspot save:", error);
        throw error;
      }
    },
    [saveMutation, unsaveMutation]
  );

  return {
    isSaved: checkIsSaved,
    saveHotspot: saveHotspotWithNotes,
    unsaveHotspot: unsaveHotspotById,
    toggleSave,
    savedHotspotsSet,
    isLoading,
  };
}
