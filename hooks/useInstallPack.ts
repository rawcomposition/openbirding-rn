import { useState } from "react";
import { Alert } from "react-native";
import axios from "axios";
import { getDatabase } from "@/lib/database";
import { ApiHotspot, Pack } from "@/lib/types";
import { API_URL } from "@/lib/utils";

export function useInstallPack() {
  const [installingId, setInstallingId] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  const installPack = async (pack: Pack) => {
    if (installingId !== null) {
      Alert.alert("Installation in Progress", "Please wait for the current installation to complete.");
      return;
    }

    try {
      setInstallingId(pack.id);
      setProgress(0);

      const response = await axios.get(`${API_URL}/packs/${pack.id}`, {
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progressPercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(progressPercent);
          }
        },
      });

      const hotspots: ApiHotspot[] = response.data;
      const db = getDatabase();

      setIsInstalling(true);
      setProgress(100);

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

      Alert.alert("Success", `Installed ${pack.name} with ${hotspots.length} hotspots`);
    } catch (error) {
      console.error("Failed to install pack:", error);
      Alert.alert(
        "Error",
        `Failed to install ${pack.name}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setInstallingId(null);
      setProgress(0);
      setIsInstalling(false);
    }
  };

  return {
    installPack,
    installingId,
    progress,
    isInstalling,
  };
}
