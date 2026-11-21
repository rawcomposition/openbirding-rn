import FilterSheet from "@/components/FilterSheet";
import FloatingButton from "@/components/FloatingButton";
import HomeSearchBar, { HOME_SEARCH_BAR_HEIGHT } from "@/components/HomeSearchBar";
import HotspotDialog from "@/components/HotspotDialog";
import HotspotList from "@/components/HotspotList";
import MapViewControls, { MAP_VIEW_CONTROLS_HEIGHT } from "@/components/MapViewControls";
import Mapbox, { MapboxMapRef } from "@/components/Mapbox";
import MenuBottomSheet from "@/components/MenuBottomSheet";
import PacksNotice from "@/components/PacksNotice";
import PlaceDialog from "@/components/PlaceDialog";
import SearchSheet from "@/components/SearchSheet";
import SunIndicator from "@/components/SunIndicator";
import { useActiveFilterCount } from "@/hooks/useActiveFilterCount";
import { useInstalledPacks } from "@/hooks/useInstalledPacks";
import { useNearbySpeciesCount } from "@/hooks/useNearbySpeciesCount";
import { usePackUpdates } from "@/hooks/usePackUpdates";
import { useSavedLocation } from "@/hooks/useSavedLocation";
import tw from "@/lib/tw";
import { useMapStore } from "@/stores/mapStore";
import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const router = useRouter();

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
  const hotspotCount = useMapStore((s) => s.displayedCount);
  const isZoomedTooFarOut = useMapStore((s) => s.isZoomedTooFarOut);
  const hasInstalledPacks = isLoadingInstalledPacks || installedPacks.size > 0;
  const speciesCount = useNearbySpeciesCount(installedPacks.size > 0 && !isZoomedTooFarOut);

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

  const handleOpenSpecies = () => {
    router.push("/nearby-species" as Href);
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

  const pendingMapFocus = useMapStore((s) => s.pendingMapFocus);
  const setPendingMapFocus = useMapStore((s) => s.setPendingMapFocus);
  useEffect(() => {
    if (!pendingMapFocus) return;
    setPendingMapFocus(null);
    handleSelectHotspotFromList(pendingMapFocus.hotspotId, pendingMapFocus.lat, pendingMapFocus.lng);
  }, [pendingMapFocus, setPendingMapFocus, handleSelectHotspotFromList]);

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

  const light = currentLayer === "satellite";
  const searchBarTop = insets.top > 16 ? insets.top + 4 : insets.top + 12;
  const belowSearchBar = searchBarTop + HOME_SEARCH_BAR_HEIGHT + 10;
  const controlsBottom = insets.bottom > 0 ? insets.bottom + 8 : 32;

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
          overlayTop={belowSearchBar}
        />
        <View style={[tw`absolute left-4 right-4`, { top: searchBarTop }]}>
          <HomeSearchBar
            onOpenMenu={handleMenuPress}
            onOpenSearch={handleOpenSearch}
            onOpenFilters={handleOpenFilters}
            menuBadgeCount={updateCount}
            filterCount={activeFilterCount}
            light={light}
          />
        </View>
        {!hasInstalledPacks && !isLoadingInstalledPacks ? (
          <View style={[tw`absolute left-0 right-0`, { top: belowSearchBar }]}>
            <PacksNotice variant="banner" />
          </View>
        ) : (
          <SunIndicator style={[tw`absolute`, { top: belowSearchBar, left: 16 }]} light={light} />
        )}
        <View style={[tw`absolute right-4`, { bottom: controlsBottom + MAP_VIEW_CONTROLS_HEIGHT + 16 }]}>
          <FloatingButton onPress={handleCenterOnUser} light={light}>
            <Ionicons name="locate" size={24} color={tw.color("gray-700")} />
          </FloatingButton>
        </View>
        <View style={[tw`absolute left-4 right-4`, { bottom: controlsBottom }]}>
          <MapViewControls
            onOpenList={handleOpenHotspotList}
            onOpenSpecies={handleOpenSpecies}
            hotspotCount={installedPacks.size > 0 ? hotspotCount : null}
            speciesCount={speciesCount}
            light={light}
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
