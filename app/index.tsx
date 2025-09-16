import React, { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Mapbox from "@/components/Mapbox";
import FloatingMenuButton from "@/components/FloatingMenuButton";
import PacksBottomSheet from "@/components/PacksBottomSheet";
import tw from "twrnc";
import HotspotDetails from "@/components/HotspotDetails";

export default function HomeScreen() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hotspotId, setHotspotId] = useState<string | null>(null);

  const handleMapPress = (feature: any) => {
    if (isMenuOpen) {
      handleCloseBottomSheet();
    }
  };

  const handleMenuPress = () => {
    setIsMenuOpen(true);
  };

  const handleCloseBottomSheet = () => {
    setIsMenuOpen(false);
  };

  return (
    <GestureHandlerRootView style={tw`flex-1 bg-slate-800`}>
      <View style={tw`flex-1`}>
        <Mapbox
          onPress={handleMapPress}
          onHotspotSelect={setHotspotId}
          hotspotId={hotspotId}
          initialCenter={[-74.006, 40.7128]}
          initialZoom={12}
        />
        <FloatingMenuButton onPress={handleMenuPress} />
        {isMenuOpen && (
          <TouchableOpacity
            style={tw`absolute inset-0 bg-transparent`}
            onPress={handleCloseBottomSheet}
            activeOpacity={1}
          />
        )}
        <PacksBottomSheet isOpen={isMenuOpen} onClose={handleCloseBottomSheet} />
        <HotspotDetails isOpen={hotspotId !== null} hotspotId={hotspotId} onClose={() => setHotspotId(null)} />
      </View>
    </GestureHandlerRootView>
  );
}
