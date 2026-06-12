import { useActiveFilterCount } from "@/hooks/useActiveFilterCount";
import { useLocation } from "@/hooks/useLocation";
import { useScrollRestore } from "@/hooks/useScrollRestore";
import { useTargetRichHotspots } from "@/hooks/useTargetRichHotspots";
import { getHotspotsWithinBounds, getSavedHotspots, getSavedPlaces } from "@/lib/database";
import tw from "@/lib/tw";
import { Bounds, Hotspot, SavedPlace } from "@/lib/types";
import { calculateDistance, isWithinBounds, padBoundsBySize } from "@/lib/utils";
import { useFiltersStore } from "@/stores/filtersStore";
import { useLocationPermissionStore } from "@/stores/locationPermissionStore";
import { useMapStore } from "@/stores/mapStore";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FilterSlidersIcon from "./icons/FilterSlidersIcon";
import BaseBottomSheet from "./BaseBottomSheet";
import FilterSheet from "./FilterSheet";
import HotspotItem from "./HotspotItem";
import IconButton from "./IconButton";
import IconButtonGroup from "./IconButtonGroup";
import PlaceItem from "./PlaceItem";

type HotspotListProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectHotspot: (hotspotId: string, lat: number, lng: number) => void;
  onSelectPlace: (placeId: string, lat: number, lng: number) => void;
};

type HotspotRow = Hotspot & { kind: "hotspot"; distance?: number };
type PlaceRow = SavedPlace & { kind: "place"; distance?: number };
type ListRow = HotspotRow | PlaceRow;

// Captured when the list opens so it reflects the map's viewport at that moment,
// rather than shifting if the map keeps reporting bounds during the animation.
type ListSnapshot = {
  bounds: Bounds | null;
  center: { lat: number; lng: number } | null;
  zoomedTooFarOut: boolean;
};

export default function HotspotList({ isOpen, onClose, onSelectHotspot, onSelectPlace }: HotspotListProps) {
  const insets = useSafeAreaInsets();
  const { status: permissionStatus } = useLocationPermissionStore();
  const { location, isLoading: isLoadingUserLocation } = useLocation(isOpen);
  const showSavedOnly = useFiltersStore((state) => state.showSavedOnly);
  const activeFilterCount = useActiveFilterCount();
  const dismissRef = useRef<(() => Promise<void>) | null>(null);

  const storeBounds = useMapStore((state) => state.bounds);
  const storeMapCenter = useMapStore((state) => state.mapCenter);
  const storeZoomedTooFarOut = useMapStore((state) => state.isZoomedTooFarOut);

  const [snapshot, setSnapshot] = useState<ListSnapshot | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const wasOpenRef = useRef(false);

  // Snapshot the current viewport on the closed -> open transition only.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setSnapshot({ bounds: storeBounds, center: storeMapCenter, zoomedTooFarOut: storeZoomedTooFarOut });
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, storeBounds, storeMapCenter, storeZoomedTooFarOut]);

  useEffect(() => {
    if (!isOpen) setIsFilterSheetOpen(false);
  }, [isOpen]);

  const snapshotBounds = snapshot?.bounds ?? null;
  const isZoomedOut = snapshot?.zoomedTooFarOut ?? false;

  const { data: hotspots = [], isFetching: isFetchingHotspots } = useQuery({
    // Same key + padding as Mapbox so we hit the same cached viewport query.
    queryKey: ["hotspots", snapshotBounds],
    queryFn: async () => {
      if (!snapshotBounds) return [];
      const padded = padBoundsBySize(snapshotBounds);
      return getHotspotsWithinBounds(padded.west, padded.south, padded.east, padded.north);
    },
    enabled: isOpen && snapshotBounds !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: savedHotspots = [] } = useQuery({
    queryKey: ["savedHotspots"],
    queryFn: getSavedHotspots,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: savedPlaces = [] } = useQuery({
    queryKey: ["savedPlaces"],
    queryFn: getSavedPlaces,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const savedHotspotsSet = useMemo(() => new Set(savedHotspots.map((s) => s.hotspot_id)), [savedHotspots]);
  const candidateHotspots = useMemo(
    () => hotspots.filter((hotspot) => !showSavedOnly || savedHotspotsSet.has(hotspot.id)),
    [hotspots, savedHotspotsSet, showSavedOnly]
  );

  const targetRichFilter = useTargetRichHotspots(candidateHotspots.map((hotspot) => hotspot.id), {
    enabled: isOpen && snapshotBounds !== null && !isFetchingHotspots,
    blockWhileDisabled: true,
  });
  const targetRichIds = useMemo(() => new Set(targetRichFilter.filteredIds), [targetRichFilter.filteredIds]);
  const isTargetRichLoading = targetRichFilter.isActive && (isFetchingHotspots || targetRichFilter.isLoading);

  const filteredHotspots = useMemo(() => {
    if (!targetRichFilter.isActive) return candidateHotspots;
    return candidateHotspots.filter((hotspot) => targetRichIds.has(hotspot.id));
  }, [candidateHotspots, targetRichFilter.isActive, targetRichIds]);

  // Saved places within the same viewport. Excluded from the list when the
  // target-rich filter is active, since they have no species data to qualify.
  const placesInView = useMemo(() => {
    if (!snapshotBounds) return [];
    const padded = padBoundsBySize(snapshotBounds);
    return savedPlaces.filter((place) => isWithinBounds(place.lat, place.lng, padded));
  }, [savedPlaces, snapshotBounds]);

  const hasUserLocation = location !== null;
  const originPoint = location ?? snapshot?.center ?? null;

  const rows = useMemo<ListRow[]>(() => {
    const placesForList = targetRichFilter.isActive ? [] : placesInView;
    const base: ListRow[] = [
      ...filteredHotspots.map((hotspot) => ({ ...hotspot, kind: "hotspot" as const })),
      ...placesForList.map((place) => ({ ...place, kind: "place" as const })),
    ];

    const withDistance = base.map((row) => ({
      row,
      sortDistance: originPoint ? calculateDistance(originPoint.lat, originPoint.lng, row.lat, row.lng) : 0,
    }));

    if (originPoint) {
      withDistance.sort((a, b) => a.sortDistance - b.sortDistance);
    } else {
      withDistance.sort((a, b) => a.row.name.localeCompare(b.row.name));
    }

    return withDistance.map(({ row, sortDistance }) => {
      const distance = hasUserLocation && originPoint ? sortDistance : undefined;
      if (row.kind === "hotspot") {
        return { ...row, distance };
      }
      return { ...row, distance };
    });
  }, [filteredHotspots, placesInView, targetRichFilter.isActive, originPoint, hasUserLocation]);

  const matchingCount = rows.length;

  const isLocationLoading = isLoadingUserLocation && permissionStatus === "granted" && location === null;

  const resetKey = useMemo(() => {
    if (!snapshotBounds) return 0;
    return Math.round((snapshotBounds.west + snapshotBounds.south + snapshotBounds.east + snapshotBounds.north) * 1000);
  }, [snapshotBounds]);
  const { listRef, onScroll } = useScrollRestore(isOpen, resetKey);

  const handleSelectHotspot = useCallback(
    async (hotspot: Hotspot & { distance?: number }) => {
      await dismissRef.current?.();
      onSelectHotspot(hotspot.id, hotspot.lat, hotspot.lng);
    },
    [onSelectHotspot]
  );

  const handleSelectPlace = useCallback(
    async (place: SavedPlace & { distance?: number }) => {
      await dismissRef.current?.();
      onSelectPlace(place.id, place.lat, place.lng);
    },
    [onSelectPlace]
  );

  const renderItem = useCallback(
    ({ item }: { item: ListRow }) =>
      item.kind === "hotspot" ? (
        <HotspotItem item={item} onSelect={handleSelectHotspot} />
      ) : (
        <PlaceItem item={item} onSelect={handleSelectPlace} />
      ),
    [handleSelectHotspot, handleSelectPlace]
  );

  const keyExtractor = useCallback((item: ListRow) => `${item.kind}:${item.id}`, []);

  const showEmptyState = isZoomedOut || isTargetRichLoading || isLocationLoading || rows.length === 0;

  const listEmptyComponent = (
    <View style={tw`flex-1 items-center justify-center py-12`}>
      {isZoomedOut ? (
        <Text style={tw`text-gray-600 text-base`}>Zoom in to list hotspots</Text>
      ) : isTargetRichLoading ? (
        <>
          <ActivityIndicator size="large" color={tw.color("blue-500")} />
          <Text style={tw`text-gray-600 text-base mt-3`}>Filtering hotspots...</Text>
        </>
      ) : isLocationLoading ? (
        <>
          <ActivityIndicator size="large" color={tw.color("blue-500")} />
          <Text style={tw`text-gray-600 text-base mt-3`}>Getting current location...</Text>
        </>
      ) : activeFilterCount > 0 ? (
        <Text style={tw`text-gray-600 text-base`}>No hotspots match your filters</Text>
      ) : (
        <Text style={tw`text-gray-600 text-base`}>No hotspots in view</Text>
      )}
    </View>
  );

  let headerTitle: string;
  if (isZoomedOut || snapshotBounds === null || isTargetRichLoading || isLocationLoading) {
    headerTitle = "Locations";
  } else {
    headerTitle = `${matchingCount} ${matchingCount === 1 ? "location" : "locations"}`;
  }

  const headerContent = (dismiss: () => Promise<void>) => {
    dismissRef.current = dismiss;

    return (
      <View style={tw`pr-5 pl-6 pb-3`}>
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-gray-900 text-xl font-bold`}>{headerTitle}</Text>
          </View>
          <IconButtonGroup>
            <View>
              <IconButton
                icon={<FilterSlidersIcon size={24} color={tw.color("gray-600")} />}
                onPress={() => setIsFilterSheetOpen(true)}
              />
              {activeFilterCount > 0 && (
                <View
                  style={tw`absolute -top-0.5 -left-0.5 min-w-4 h-4 bg-blue-500 rounded-full items-center justify-center px-1`}
                >
                  <Text style={tw`text-white text-xs font-semibold`}>{activeFilterCount}</Text>
                </View>
              )}
            </View>
            <IconButton icon="close" onPress={dismiss} />
          </IconButtonGroup>
        </View>
      </View>
    );
  };

  return (
    <>
      <BaseBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        detents={[0.92]}
        initialIndex={0}
        headerContent={headerContent}
        scrollable
        dimmed
      >
        <FlashList
          ref={listRef}
          data={showEmptyState ? [] : rows}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={tw`flex-1`}
          contentContainerStyle={
            (showEmptyState ? 0 : rows.length) === 0 ? tw`flex-1` : { paddingBottom: Math.max(insets.bottom, 16) }
          }
          showsVerticalScrollIndicator
          ListEmptyComponent={listEmptyComponent}
          onScroll={onScroll}
          keyboardShouldPersistTaps="handled"
        />
      </BaseBottomSheet>
      <FilterSheet isOpen={isFilterSheetOpen} onClose={() => setIsFilterSheetOpen(false)} />
    </>
  );
}
