import React, { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import Mapbox from "@/components/Mapbox";
import FloatingButton from "@/components/FloatingButton";
import PacksBottomSheet from "@/components/PacksBottomSheet";
import tw from "twrnc";
import HotspotDetails from "@/components/HotspotDetails";
import { useSavedLocation } from "@/hooks/useSavedLocation";

export default function HomeScreen() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hotspotId, setHotspotId] = useState<string | null>(null);

  const { isLoadingLocation, savedLocation, updateLocation } = useSavedLocation();

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

  if (isLoadingLocation) return null;

  const initialCenter = savedLocation?.center ?? [-98.5, 39.5];
  const initialZoom = savedLocation?.zoom ?? 2;
  const hasSavedLocation = savedLocation !== null;

  return (
    <GestureHandlerRootView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-1`}>
        <Mapbox
          onPress={handleMapPress}
          onHotspotSelect={setHotspotId}
          hotspotId={hotspotId}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          hasSavedLocation={hasSavedLocation}
          onLocationSave={updateLocation}
        />
        <FloatingButton onPress={handleMenuPress}>
          <Ionicons name="menu" size={24} color="#1f2937" />
        </FloatingButton>
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
