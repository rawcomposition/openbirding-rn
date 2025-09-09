import React, { useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Mapbox from "@/components/Mapbox";
import FloatingMenuButton from "@/components/FloatingMenuButton";
import PacksBottomSheet from "@/components/PacksBottomSheet";
import tw from "twrnc";

export default function HomeScreen() {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const handleMapPress = (feature: any) => {
    console.log("Map pressed:", feature);
  };

  const handleMenuPress = () => {
    setIsBottomSheetOpen(true);
  };

  const handleCloseBottomSheet = () => {
    setIsBottomSheetOpen(false);
  };

  return (
    <GestureHandlerRootView style={tw`flex-1 bg-slate-800`}>
      <View style={tw`flex-1`}>
        <Mapbox onPress={handleMapPress} initialCenter={[-74.006, 40.7128]} initialZoom={12} />
        <FloatingMenuButton onPress={handleMenuPress} />
        <PacksBottomSheet isOpen={isBottomSheetOpen} onClose={handleCloseBottomSheet} />
      </View>
    </GestureHandlerRootView>
  );
}
