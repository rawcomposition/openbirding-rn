import { checkIsPackInstalling, getPackById, installPack, uninstallPack } from "@/lib/database";
import { ApiPack, ApiPackResponse } from "@/lib/types";
import { API_URL } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useState } from "react";
import { Alert, Platform } from "react-native";
import Toast from "react-native-toast-message";

export function useManagePack(packId: number) {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [isUninstalling, setIsUninstalling] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const install = async (apiPack: ApiPack, downloadMethod: "auto" | "manual") => {
    if (isInstalling || isUninstalling || isDownloading) {
      Toast.show({
        type: "info",
        text1: "Operation in Progress",
      });
      return;
    }

    if (checkIsPackInstalling()) {
      Alert.alert("Installation in Progress", "Please wait for the current pack to finish installing");
      return;
    }

    try {
      setIsDownloading(true);

      const currentPack = await getPackById(packId);

      const channel = Updates.channel || (__DEV__ ? "development" : "unknown");

      const response = await fetch(`${API_URL}/packs/${packId}`, {
        headers: {
          "App-Version": Constants.expoConfig?.version || "Unknown",
          "App-Build": Constants.nativeBuildVersion || "Unknown",
          "App-Platform": Platform.OS,
          "App-Environment": channel,
          "Download-Method": downloadMethod,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch pack data: ${response.status}`);
      }
      const { hotspots }: ApiPackResponse = await response.json();

      setIsDownloading(false);
      setIsInstalling(true);

      await installPack(packId, apiPack.name, hotspots);

      await queryClient.invalidateQueries({ queryKey: ["installed-packs"] });
      queryClient.invalidateQueries({ queryKey: ["hotspots"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["hotspotSearch"] });
      queryClient.invalidateQueries({ queryKey: ["nearbyHotspots"] });
      queryClient.invalidateQueries({ queryKey: ["allHotspots"] });

      Toast.show({
        type: "success",
        text1: currentPack ? "Pack Updated" : "Pack Installed",
      });
    } catch (error) {
      console.error("Failed to install pack:", error);

      Toast.show({
        type: "error",
        text1: "Installation Failed",
      });
    } finally {
      setIsDownloading(false);
      setIsInstalling(false);
    }
  };

  const uninstall = async () => {
    if (isInstalling || isUninstalling || isDownloading) {
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
