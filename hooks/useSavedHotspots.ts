import { isHotspotSaved, saveHotspot, unsaveHotspot } from "@/lib/database";
import { useCallback } from "react";

type UseSavedHotspotsReturn = {
  isSaved: (hotspotId: string) => Promise<boolean>;
  saveHotspot: (hotspotId: string, notes?: string) => Promise<void>;
  unsaveHotspot: (hotspotId: string) => Promise<void>;
  toggleSave: (hotspotId: string, notes?: string) => Promise<boolean>;
};

export function useSavedHotspots(): UseSavedHotspotsReturn {
  const checkIsSaved = useCallback(async (hotspotId: string): Promise<boolean> => {
    try {
      return await isHotspotSaved(hotspotId);
    } catch (error) {
      console.error("Error checking if hotspot is saved:", error);
      return false;
    }
  }, []);

  const saveHotspotWithNotes = useCallback(async (hotspotId: string, notes?: string): Promise<void> => {
    try {
      await saveHotspot(hotspotId, notes);
    } catch (error) {
      console.error("Error saving hotspot:", error);
      throw error;
    }
  }, []);

  const unsaveHotspotById = useCallback(async (hotspotId: string): Promise<void> => {
    try {
      await unsaveHotspot(hotspotId);
    } catch (error) {
      console.error("Error unsaving hotspot:", error);
      throw error;
    }
  }, []);

  const toggleSave = useCallback(async (hotspotId: string, notes?: string): Promise<boolean> => {
    try {
      const currentlySaved = await isHotspotSaved(hotspotId);
      if (currentlySaved) {
        await unsaveHotspot(hotspotId);
        return false;
      } else {
        await saveHotspot(hotspotId, notes);
        return true;
      }
    } catch (error) {
      console.error("Error toggling hotspot save:", error);
      throw error;
    }
  }, []);

  return {
    isSaved: checkIsSaved,
    saveHotspot: saveHotspotWithNotes,
    unsaveHotspot: unsaveHotspotById,
    toggleSave,
  };
}
