import React, { useState, useRef } from "react";
import { View, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import Mapbox, { MapboxMapRef } from "@/components/Mapbox";
import FloatingButton from "@/components/FloatingButton";
import MenuBottomSheet from "@/components/MenuBottomSheet";
import tw from "twrnc";
import HotspotDetails from "@/components/HotspotDetails";
import { useSavedLocation } from "@/hooks/useSavedLocation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMapStore } from "@/stores/mapStore";

export default function HomeScreen() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hotspotId, setHotspotId] = useState<string | null>(null);
  const mapRef = useRef<MapboxMapRef>(null);
  const insets = useSafeAreaInsets();

  const { isLoadingLocation, savedLocation, updateLocation, hadSavedLocationOnInit } = useSavedLocation();
  const { currentLayer } = useMapStore();

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

  const handleCenterOnUser = () => {
    mapRef.current?.centerOnUser();
  };

  if (isLoadingLocation) return null;

  const initialCenter = savedLocation?.center ?? [-98.5, 39.5];
  const initialZoom = savedLocation?.zoom ?? 2;

  return (
    <GestureHandlerRootView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-1`}>
        <Mapbox
          ref={mapRef}
          onPress={handleMapPress}
          onHotspotSelect={setHotspotId}
          hotspotId={hotspotId}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          hasSavedLocation={hadSavedLocationOnInit}
          onLocationSave={updateLocation}
        />
        <View
          style={[
            tw`absolute right-6 gap-5`,
            {
              bottom: insets.bottom + 24,
            },
          ]}
        >
          <FloatingButton onPress={handleCenterOnUser}>
            <Ionicons name="locate" size={24} color={tw.color("gray-700")} />
          </FloatingButton>
          <FloatingButton onPress={handleMenuPress}>
            <Ionicons name="menu" size={24} color={tw.color("gray-700")} />
          </FloatingButton>
        </View>
        {isMenuOpen && (
          <TouchableOpacity
            style={tw`absolute inset-0 bg-transparent`}
            onPress={handleCloseBottomSheet}
            activeOpacity={1}
          />
        )}
        <MenuBottomSheet isOpen={isMenuOpen} onClose={handleCloseBottomSheet} />
        <HotspotDetails isOpen={hotspotId !== null} hotspotId={hotspotId} onClose={() => setHotspotId(null)} />
      </View>
    </GestureHandlerRootView>
  );
}
