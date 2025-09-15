import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { getDatabase } from "@/lib/database";
import { ApiHotspot, Pack } from "@/lib/types";
import { API_URL } from "@/lib/utils";

export function useInstallPack() {
  const [installingId, setInstallingId] = useState<number | null>(null);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [operationType, setOperationType] = useState<"install" | "uninstall" | null>(null);
  const queryClient = useQueryClient();

  const installPack = async (pack: Pack) => {
    if (installingId !== null) {
      Toast.show({
        type: "info",
        text1: "Installation in Progress",
        text2: "Please wait for the current installation to complete.",
      });
      return;
    }

    try {
      setInstallingId(pack.id);
      setOperationType("install");

      queryClient.setQueryData(["installed-packs"], (oldData: Set<number> | undefined) => {
        const newSet = new Set(oldData || []);
        newSet.add(pack.id);
        return newSet;
      });

      const response = await fetch(`${API_URL}/packs/${pack.id}`);
      const hotspots: ApiHotspot[] = await response.json();
      const db = getDatabase();

      setIsInstalling(true);

      await db.withTransactionAsync(async () => {
        await db.runAsync(`INSERT OR REPLACE INTO packs (id, name, hotspots, last_synced) VALUES (?, ?, ?, ?)`, [
          pack.id,
          pack.name,
          hotspots.length,
          new Date().toISOString(),
        ]);

        await db.runAsync(`DELETE FROM hotspots WHERE pack_id = ?`, [pack.id]);

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
              pack.id,
              hotspot.updatedAt,
            ]
          );
        }
      });

      Toast.show({
        type: "success",
        text1: "Pack Installed",
        text2: `Installed ${pack.name} with ${hotspots.length} hotspots`,
      });
    } catch (error) {
      console.error("Failed to install pack:", error);

      queryClient.setQueryData(["installed-packs"], (oldData: Set<number> | undefined) => {
        const newSet = new Set(oldData || []);
        newSet.delete(pack.id);
        return newSet;
      });

      Toast.show({
        type: "error",
        text1: "Installation Failed",
        text2: `Failed to install ${pack.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setInstallingId(null);
      setIsInstalling(false);
      setOperationType(null);
    }
  };

  const uninstallPack = async (pack: Pack) => {
    if (installingId !== null) {
      Toast.show({
        type: "info",
        text1: "Operation in Progress",
        text2: "Please wait for the current operation to complete.",
      });
      return;
    }

    try {
      setInstallingId(pack.id);
      setOperationType("uninstall");

      queryClient.setQueryData(["installed-packs"], (oldData: Set<number> | undefined) => {
        const newSet = new Set(oldData || []);
        newSet.delete(pack.id);
        return newSet;
      });

      const db = getDatabase();
      await db.runAsync(`DELETE FROM packs WHERE id = ?`, [pack.id]);

      Toast.show({
        type: "success",
        text1: "Pack Uninstalled",
        text2: `Uninstalled ${pack.name}`,
      });
    } catch (error) {
      console.error("Failed to uninstall pack:", error);

      queryClient.setQueryData(["installed-packs"], (oldData: Set<number> | undefined) => {
        const newSet = new Set(oldData || []);
        newSet.add(pack.id);
        return newSet;
      });

      Toast.show({
        type: "error",
        text1: "Uninstall Failed",
        text2: `Failed to uninstall ${pack.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setInstallingId(null);
      setIsInstalling(false);
      setOperationType(null);
    }
  };

  return {
    installPack,
    uninstallPack,
    installingId,
    isInstalling,
    operationType,
  };
}
