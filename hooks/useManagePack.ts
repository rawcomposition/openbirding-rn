import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { getDatabase } from "@/lib/database";
import { ApiPack, ApiPackResponse } from "@/lib/types";
import { API_URL } from "@/lib/utils";

export function useManagePack(packId: number) {
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [isUninstalling, setIsUninstalling] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const install = async (pack: ApiPack) => {
    if (isInstalling || isUninstalling) {
      Toast.show({
        type: "info",
        text1: "Operation in Progress",
      });
      return;
    }

    try {
      setIsInstalling(true);

      const wasAlreadyInstalled = queryClient.getQueryData<Set<number>>(["installed-packs"])?.has(packId) ?? false;

      const response = await fetch(`${API_URL}/packs/${packId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch pack data: ${response.status}`);
      }
      const { hotspots }: ApiPackResponse = await response.json();
      const db = getDatabase();

      await db.runAsync(`DELETE FROM hotspots WHERE pack_id = ?`, [packId]);

      await db.runAsync(`INSERT OR REPLACE INTO packs (id, name, hotspots, installed_at) VALUES (?, ?, ?, ?)`, [
        packId,
        pack.name,
        hotspots.length,
        new Date().toISOString(),
      ]);

      for (const hotspot of hotspots) {
        await db.runAsync(`INSERT INTO hotspots (id, name, species, lat, lng, pack_id) VALUES (?, ?, ?, ?, ?, ?)`, [
          hotspot.id,
          hotspot.name,
          hotspot.species,
          hotspot.lat,
          hotspot.lng,
          packId,
        ]);
      }

      queryClient.invalidateQueries({ queryKey: ["installed-packs"] });
      queryClient.invalidateQueries({ queryKey: ["hotspots"], refetchType: "active" });

      Toast.show({
        type: "success",
        text1: wasAlreadyInstalled ? "Pack Updated" : "Pack Installed",
      });
    } catch (error) {
      console.error("Failed to install pack:", error);

      Toast.show({
        type: "error",
        text1: "Installation Failed",
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const uninstall = async () => {
    if (isInstalling || isUninstalling) {
      Toast.show({
        type: "info",
        text1: "Operation in Progress",
      });
      return;
    }

    try {
      setIsUninstalling(true);

      const db = getDatabase();
      await db.runAsync(`DELETE FROM hotspots WHERE pack_id = ?`, [packId]);
      await db.runAsync(`DELETE FROM packs WHERE id = ?`, [packId]);

      queryClient.invalidateQueries({ queryKey: ["installed-packs"] });
      queryClient.invalidateQueries({ queryKey: ["hotspots"], refetchType: "active" });

      Toast.show({
        type: "success",
        text1: "Pack Uninstalled",
      });
    } catch (error) {
      console.error("Failed to uninstall pack:", error);

      Toast.show({
        type: "error",
        text1: "Uninstall Failed",
      });
    } finally {
      setIsUninstalling(false);
    }
  };

  return {
    install,
    uninstall,
    isInstalling,
    isUninstalling,
  };
}
