import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import tw from "twrnc";
import BaseBottomSheet from "./BaseBottomSheet";
import MenuList from "./MenuList";
import MapLayerSwitcher from "./MapLayerSwitcher";
import { useMapStore } from "@/stores/mapStore";

type MenuBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MenuBottomSheet({ isOpen, onClose }: MenuBottomSheetProps) {
  const router = useRouter();
  const { currentLayer, setCurrentLayer } = useMapStore();

  const handleNavigateToPacks = () => {
    onClose();
    router.push("/packs?from=map");
  };

  const handleNavigateToSettings = () => {
    onClose();
    router.push("/settings");
  };

  const handleMapLayerChange = (layer: "default" | "satellite") => {
    setCurrentLayer(layer);
  };

  return (
    <BaseBottomSheet isOpen={isOpen} onClose={onClose} title="Map Options" snapPoints={["45%", "90%"]}>
      <View style={tw`flex-1`}>
        <MapLayerSwitcher currentLayer={currentLayer} onLayerChange={handleMapLayerChange} />
        <MenuList onNavigateToPacks={handleNavigateToPacks} onNavigateToSettings={handleNavigateToSettings} />
      </View>
    </BaseBottomSheet>
  );
}
