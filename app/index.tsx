import React, { useState, useRef } from "react";
import { View, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import Mapbox, { MapboxMapRef } from "@/components/Mapbox";
import FloatingButton from "@/components/FloatingButton";
import MenuBottomSheet from "@/components/MenuBottomSheet";
import PacksNotice from "@/components/PacksNotice";
import tw from "twrnc";
import HotspotDialog from "@/components/HotspotDialog";
import PlaceDialog from "@/components/PlaceDialog";
import { useSavedLocation } from "@/hooks/useSavedLocation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMapStore } from "@/stores/mapStore";
import { useInstalledPacks } from "@/hooks/useInstalledPacks";

export default function HomeScreen() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hotspotId, setHotspotId] = useState<string | null>(null);
  const [placeCoordinates, setPlaceCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapboxMapRef>(null);
  const insets = useSafeAreaInsets();

  const { isLoadingLocation, savedLocation, updateLocation, hadSavedLocationOnInit } = useSavedLocation();
  const { currentLayer } = useMapStore();
  const installedPacks = useInstalledPacks();

  const handleMapPress = (_event: any) => {
    if (isMenuOpen) handleCloseBottomSheet();
    if (hotspotId) setHotspotId(null);
    if (placeCoordinates) setPlaceCoordinates(null);
  };

  const handleHotspotSelect = (id: string) => {
    setPlaceCoordinates(null);
    setHotspotId(id);
  };

  const handleMapLongPress = (coords: { latitude: number; longitude: number }) => {
    if (isMenuOpen) handleCloseBottomSheet();
    if (hotspotId) setHotspotId(null);
    setPlaceCoordinates(coords);
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

  const hasInstalledPacks = installedPacks && installedPacks.size > 0;

  return (
    <GestureHandlerRootView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-1`}>
        <Mapbox
          ref={mapRef}
          onPress={handleMapPress}
          onHotspotSelect={handleHotspotSelect}
          hotspotId={hotspotId}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          hasSavedLocation={hadSavedLocationOnInit}
          onLocationSave={updateLocation}
          hasInstalledPacks={hasInstalledPacks}
          onLongPressCoordinates={handleMapLongPress}
        />
        {!hasInstalledPacks && (
          <View
            style={[
              tw`absolute left-0 right-0`,
              {
                top: insets.top + 16,
              },
            ]}
          >
            <PacksNotice variant="banner" />
          </View>
        )}
        <View
          style={[
            tw`absolute right-6 gap-5`,
            {
              bottom: insets.bottom + 24,
            },
          ]}
        >
          <FloatingButton onPress={handleCenterOnUser} light={currentLayer === "satellite"}>
            <Ionicons name="locate" size={24} color={tw.color("gray-700")} />
          </FloatingButton>
          <FloatingButton onPress={handleMenuPress} light={currentLayer === "satellite"}>
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
        <HotspotDialog isOpen={hotspotId !== null} hotspotId={hotspotId} onClose={() => setHotspotId(null)} />
        <PlaceDialog
          isOpen={placeCoordinates !== null}
          lat={placeCoordinates?.latitude ?? null}
          lng={placeCoordinates?.longitude ?? null}
          onClose={() => setPlaceCoordinates(null)}
        />
      </View>
    </GestureHandlerRootView>
  );
}
