import { cleanupPartialInstall, installPackWithTargets, uninstallPack } from "@/lib/database";
import { downloadWithProgress } from "@/lib/download";
import { StaticPack, StaticPackResponse } from "@/lib/types";
import { useDownloadStore } from "@/stores/downloadStore";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Toast from "react-native-toast-message";

export function useManagePack(packId: number) {
  const [isUninstalling, setIsUninstalling] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { phase, packId: downloadingPackId } = useDownloadStore();

  const isDownloading = phase === "downloading" && downloadingPackId === packId;
  const isInstalling = phase === "installing" && downloadingPackId === packId;

  const install = async (pack: StaticPack) => {
    if (phase !== "idle") {
      Toast.show({
        type: "info",
        text1: "Operation in Progress",
      });
      return;
    }

    const downloadStore = useDownloadStore.getState();
    const controller = downloadStore.startDownload(packId, pack.name);

    try {
      const packData = await downloadWithProgress<StaticPackResponse>({
        url: pack.url,
        expectedSize: pack.size,
        signal: controller.signal,
        onProgress: (progress) => {
          downloadStore.setProgress(progress);
        },
        onDownloadComplete: () => {
          // Switch to installing phase before heavy file processing
          downloadStore.setPhase("installing");
          downloadStore.setProgress(100);
        },
      });

      await installPackWithTargets(packId, pack.name, pack.v, pack.updatedAt, packData.hotspots, packData.targets);

      downloadStore.setProgress(100);

      await queryClient.invalidateQueries({ queryKey: ["installed-packs"] });
      queryClient.invalidateQueries({ queryKey: ["hotspots"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["hotspotSearch"] });
      queryClient.invalidateQueries({ queryKey: ["nearbyHotspots"] });
      queryClient.invalidateQueries({ queryKey: ["allHotspots"] });

      Toast.show({
        type: "success",
        text1: "Pack Installed",
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // User cancelled - clean up partial data
        await cleanupPartialInstall(packId);
        Toast.show({
          type: "info",
          text1: "Download Cancelled",
        });
      } else {
        console.error("Failed to install pack:", error);
        Toast.show({
          type: "error",
          text1: "Installation Failed",
        });
      }
    } finally {
      downloadStore.reset();
    }
  };

  const uninstall = async () => {
    if (isUninstalling || phase !== "idle") {
      Toast.show({
        type: "info",
        text1: "Operation in Progress",
      });
      return;
    }

    try {
      setIsUninstalling(true);

      await uninstallPack(packId);

      queryClient.invalidateQueries({ queryKey: ["installed-packs"] });
      queryClient.invalidateQueries({ queryKey: ["hotspots"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["hotspotSearch"] });
      queryClient.invalidateQueries({ queryKey: ["nearbyHotspots"] });
      queryClient.invalidateQueries({ queryKey: ["allHotspots"] });

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
    isDownloading,
    isInstalling,
    isUninstalling,
  };
}
