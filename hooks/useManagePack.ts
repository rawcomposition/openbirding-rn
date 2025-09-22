import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { getDatabase } from "@/lib/database";
import { ApiHotspot, ApiPack } from "@/lib/types";
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
      const hotspots: ApiHotspot[] = await response.json();
      const db = getDatabase();

      queryClient.setQueryData(["installed-packs"], (oldData: Set<number> | undefined) => {
        const newSet = new Set(oldData || []);
        newSet.add(packId);
        return newSet;
      });

      await db.withTransactionAsync(async () => {
        await db.runAsync(`INSERT OR REPLACE INTO packs (id, name, hotspots, installed_at) VALUES (?, ?, ?, ?)`, [
          packId,
          pack.name,
          hotspots.length,
          new Date().toISOString(),
        ]);

        await db.runAsync(`DELETE FROM hotspots WHERE pack_id = ?`, [packId]);

        for (const hotspot of hotspots) {
          await db.runAsync(
            `INSERT INTO hotspots (id, name, species, lat, lng, open, notes, last_updated_by, pack_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              hotspot.id,
              hotspot.name,
              hotspot.species,
              hotspot.lat,
              hotspot.lng,
              hotspot.open,
              hotspot.notes,
              hotspot.lastUpdatedBy,
              packId,
              hotspot.updatedAt,
            ]
          );
        }
      });

      queryClient.invalidateQueries({ queryKey: ["hotspots"], refetchType: "active" });

      Toast.show({
        type: "success",
        text1: wasAlreadyInstalled ? "Pack Updated" : "Pack Installed",
      });
    } catch (error) {
      console.error("Failed to install pack:", error);

      queryClient.setQueryData(["installed-packs"], (oldData: Set<number> | undefined) => {
        const newSet = new Set(oldData || []);
        newSet.delete(packId);
        return newSet;
      });

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

      queryClient.setQueryData(["installed-packs"], (oldData: Set<number> | undefined) => {
        const newSet = new Set(oldData || []);
        newSet.delete(packId);
        return newSet;
      });

      const db = getDatabase();
      await db.runAsync(`DELETE FROM hotspots WHERE pack_id = ?`, [packId]);
      await db.runAsync(`DELETE FROM packs WHERE id = ?`, [packId]);

      queryClient.invalidateQueries({ queryKey: ["hotspots"], refetchType: "active" });

      Toast.show({
        type: "success",
        text1: "Pack Uninstalled",
      });
    } catch (error) {
      console.error("Failed to uninstall pack:", error);

      queryClient.setQueryData(["installed-packs"], (oldData: Set<number> | undefined) => {
        const newSet = new Set(oldData || []);
        newSet.add(packId);
        return newSet;
      });

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
