import React, { useRef, useMemo, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import MenuList from "./MenuList";
import MapLayerSwitcher from "./MapLayerSwitcher";
import { useMapStore } from "@/stores/mapStore";

type MenuBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MenuBottomSheet({ isOpen, onClose }: MenuBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const router = useRouter();
  const { currentLayer, setCurrentLayer } = useMapStore();

  const snapPoints = useMemo(() => ["45%", "90%"], []);

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const handleNavigateToPacks = () => {
    onClose();
    router.push("/packs?from=map");
  };

  const handleNavigateToSettings = () => {
    onClose();
    router.push("/settings");
  };

  const handleSheetChanges = (index: number) => {
    if (index === -1) {
      onClose();
    }
  };

  const handleMapLayerChange = (layer: "default" | "satellite") => {
    setCurrentLayer(layer);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={tw`bg-white`}
      handleIndicatorStyle={tw`bg-gray-300`}
    >
      <BottomSheetView style={tw`flex-1`}>
        <View style={tw`flex-row items-start justify-between p-4 pt-0 border-b border-gray-200`}>
          <View style={tw`px-4 pb-2`}>
            <Text style={tw`text-gray-900 text-xl font-bold text-center`}>Map Options</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={tw`w-8 h-8 items-center justify-center bg-slate-100 rounded-full shadow-sm`}
          >
            <Ionicons name="close" size={24} color={tw.color("gray-500")} />
          </TouchableOpacity>
        </View>
        <View style={tw`flex-1`}>
          <MapLayerSwitcher currentLayer={currentLayer} onLayerChange={handleMapLayerChange} />
          <MenuList onNavigateToPacks={handleNavigateToPacks} onNavigateToSettings={handleNavigateToSettings} />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
