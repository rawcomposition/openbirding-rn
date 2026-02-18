import { usePackUpdates } from "@/hooks/usePackUpdates";
import tw from "@/lib/tw";
import { useMapStore } from "@/stores/mapStore";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import BaseBottomSheet from "./BaseBottomSheet";
import FilterSection from "./FilterSection";
import MapLayerSwitcher from "./MapLayerSwitcher";
import MenuList from "./MenuList";

type MenuBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MenuBottomSheet({ isOpen, onClose }: MenuBottomSheetProps) {
  const router = useRouter();
  const { currentLayer, setCurrentLayer } = useMapStore();
  const { updateCount } = usePackUpdates();

  const handleNavigateToPacks = () => {
    onClose();
    router.push("/packs?tab=installed");
  };

  const handleNavigateToSettings = () => {
    onClose();
    router.push("/settings");
  };

  const handleMapLayerChange = (layer: "default" | "satellite") => {
    setCurrentLayer(layer);
  };

  return (
    <BaseBottomSheet isOpen={isOpen} onClose={onClose} title="Map Options" dimmed>
      <View>
        <MapLayerSwitcher currentLayer={currentLayer} onLayerChange={handleMapLayerChange} />
        <FilterSection />
        <MenuList onNavigateToPacks={handleNavigateToPacks} onNavigateToSettings={handleNavigateToSettings} packUpdateCount={updateCount} />
      </View>
    </BaseBottomSheet>
  );
}
