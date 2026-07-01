import CountBadge from "@/components/CountBadge";
import FilterSheet from "@/components/FilterSheet";
import FloatingButton from "@/components/FloatingButton";
import HotspotDialog from "@/components/HotspotDialog";
import HotspotList from "@/components/HotspotList";
import MapViewControls from "@/components/MapViewControls";
import Mapbox, { MapboxMapRef } from "@/components/Mapbox";
import MenuBottomSheet from "@/components/MenuBottomSheet";
import PacksNotice from "@/components/PacksNotice";
import PlaceDialog from "@/components/PlaceDialog";
import SearchSheet from "@/components/SearchSheet";
import SunIndicator from "@/components/SunIndicator";
import { useActiveFilterCount } from "@/hooks/useActiveFilterCount";
import { useInstalledPacks } from "@/hooks/useInstalledPacks";
import { usePackUpdates } from "@/hooks/usePackUpdates";
import { useSavedLocation } from "@/hooks/useSavedLocation";
import tw from "@/lib/tw";
import { useMapStore } from "@/stores/mapStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const mapRef = useRef<MapboxMapRef>(null);
  const isMapTouchActiveRef = useRef(false);
  const insets = useSafeAreaInsets();
  const activeFilterCount = useActiveFilterCount();

  const { isLoadingLocation, savedLocation, updateLocation, hadSavedLocationOnInit } = useSavedLocation();
  const {
    currentLayer,
    hotspotId,
    setHotspotId,
    placeId,
    setPlaceId,
    customPinCoordinates,
    setCustomPinCoordinates,
    isHotspotListOpen,
    setIsHotspotListOpen,
    isMapAttributionOpen,
    setIsMapAttributionOpen,
  } = useMapStore();
  const { data: installedPacks, isLoading: isLoadingInstalledPacks } = useInstalledPacks();
  const { updateCount } = usePackUpdates();

  const handleMapPress = (_event: any) => {
    if (isMenuOpen) handleCloseBottomSheet();
    if (hotspotId) setHotspotId(null);
    if (placeId) setPlaceId(null);
    if (customPinCoordinates) setCustomPinCoordinates(null);
    if (isMapAttributionOpen) setIsMapAttributionOpen(false);
  };

  const handleHotspotSelect = (id: string) => {
    setCustomPinCoordinates(null);
    setPlaceId(null);
    setHotspotId(id);
  };

  const handlePlaceSelect = (id: string) => {
    setCustomPinCoordinates(null);
    setHotspotId(null);
    setPlaceId(id);
  };

  const handleMapLongPress = (coords: { latitude: number; longitude: number }) => {
    if (isMenuOpen) handleCloseBottomSheet();
    if (hotspotId) setHotspotId(null);
    if (placeId) setPlaceId(null);
    setCustomPinCoordinates(coords);
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

  const handleOpenHotspotList = () => {
    setIsHotspotListOpen(true);
  };

  const handleOpenFilters = () => {
    setIsFilterSheetOpen(true);
  };

  const handleCloseFilters = () => {
    setIsFilterSheetOpen(false);
  };

  const handleCloseHotspotList = () => {
    setIsHotspotListOpen(false);
  };

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
  };

  const handleMapTouchActiveChange = useCallback((isActive: boolean) => {
    isMapTouchActiveRef.current = isActive;
  }, []);

  const handleHotspotDialogClose = useCallback(() => {
    if (isMapTouchActiveRef.current) {
      return false;
    }

    setHotspotId(null);
  }, [setHotspotId]);

  const handlePlaceDialogClose = useCallback(() => {
    if (isMapTouchActiveRef.current) {
      return false;
    }

    setCustomPinCoordinates(null);
    setPlaceId(null);
  }, [setCustomPinCoordinates, setPlaceId]);

  const handleSelectHotspotFromList = useCallback(
    (selectedHotspotId: string, lat: number, lng: number) => {
      setCustomPinCoordinates(null);
      setPlaceId(null);
      setHotspotId(selectedHotspotId);
      setTimeout(() => {
        mapRef.current?.centerOnCoordinates(lng, lat, 200);
      }, 500);
    },
    [setCustomPinCoordinates, setPlaceId, setHotspotId]
  );

  const handleSelectPlaceFromList = useCallback(
    (selectedPlaceId: string, lat: number, lng: number) => {
      setCustomPinCoordinates(null);
      setHotspotId(null);
      setPlaceId(selectedPlaceId);
      setTimeout(() => {
        mapRef.current?.centerOnCoordinates(lng, lat, 200);
      }, 500);
    },
    [setCustomPinCoordinates, setHotspotId, setPlaceId]
  );

  if (isLoadingLocation) return null;

  const initialCenter = savedLocation?.center ?? [-98.5, 39.5];
  const initialZoom = savedLocation?.zoom ?? 2;

  const hasInstalledPacks = isLoadingInstalledPacks || installedPacks.size > 0;

  return (
    <GestureHandlerRootView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-1`}>
        <Mapbox
          ref={mapRef}
          onPress={handleMapPress}
          onHotspotSelect={handleHotspotSelect}
          onPlaceSelect={handlePlaceSelect}
          hotspotId={hotspotId}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          hasSavedLocation={hadSavedLocationOnInit}
          onLocationSave={updateLocation}
          hasInstalledPacks={hasInstalledPacks}
          onLongPressCoordinates={handleMapLongPress}
          placeCoordinates={customPinCoordinates}
          onTouchActiveChange={handleMapTouchActiveChange}
        />
        {!hasInstalledPacks && !isLoadingInstalledPacks ? (
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
        ) : (
          <SunIndicator style={[tw`absolute`, { top: insets.top > 16 ? insets.top + 4 : insets.top + 16, left: 16 }]} />
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
          <FloatingButton onPress={handleOpenSearch} light={currentLayer === "satellite"}>
            <Ionicons name="search" size={24} color={tw.color("gray-700")} />
          </FloatingButton>
          <View style={tw`relative`}>
            <FloatingButton onPress={handleMenuPress} light={currentLayer === "satellite"}>
              <Ionicons name="menu" size={24} color={tw.color("gray-700")} />
            </FloatingButton>
            <CountBadge count={updateCount} />
          </View>
        </View>
        <View
          style={[tw`absolute left-0 right-0 items-center`, { bottom: insets.bottom + 24 }]}
          pointerEvents="box-none"
        >
          <MapViewControls
            onOpenFilters={handleOpenFilters}
            onOpenList={handleOpenHotspotList}
            filterCount={activeFilterCount}
          />
        </View>
        <MenuBottomSheet isOpen={isMenuOpen} onClose={handleCloseBottomSheet} />
        <FilterSheet isOpen={isFilterSheetOpen} onClose={handleCloseFilters} />
        <SearchSheet
          isOpen={isSearchOpen}
          onClose={handleCloseSearch}
          onSelectHotspot={handleSelectHotspotFromList}
          onSelectPlace={handleSelectPlaceFromList}
        />
        <HotspotDialog isOpen={hotspotId !== null} hotspotId={hotspotId} onClose={handleHotspotDialogClose} />
        <PlaceDialog
          isOpen={customPinCoordinates !== null || placeId !== null}
          placeId={placeId}
          lat={customPinCoordinates?.latitude ?? null}
          lng={customPinCoordinates?.longitude ?? null}
          onClose={handlePlaceDialogClose}
        />
        <HotspotList
          isOpen={isHotspotListOpen}
          onClose={handleCloseHotspotList}
          onSelectHotspot={handleSelectHotspotFromList}
          onSelectPlace={handleSelectPlaceFromList}
        />
      </View>
    </GestureHandlerRootView>
  );
}
