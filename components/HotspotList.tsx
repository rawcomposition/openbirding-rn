import { useLocation } from "@/hooks/useLocation";
import { useScrollRestore } from "@/hooks/useScrollRestore";
import { getAllHotspots, getNearbyHotspots, searchHotspots } from "@/lib/database";
import tw from "@/lib/tw";
import { Hotspot } from "@/lib/types";
import { calculateDistance, getBoundingBoxFromLocation } from "@/lib/utils";
import { useFiltersStore } from "@/stores/filtersStore";
import { useLocationPermissionStore } from "@/stores/locationPermissionStore";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import debounce from "lodash/debounce";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BaseBottomSheet from "./BaseBottomSheet";
import HotspotItem from "./HotspotItem";
import IconButton from "./IconButton";
import IconButtonGroup from "./IconButtonGroup";
import SearchInput from "./SearchInput";

type HotspotListProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectHotspot: (hotspotId: string, lat: number, lng: number) => void;
};

const NEARBY_LIMIT = 200;
const SEARCH_LIMIT = 100;
const ALL_HOTSPOTS_LIMIT = 1000;
const NEARBY_BUCKETS_KM = [50, 100, 200, 500];

export default function HotspotList({ isOpen, onClose, onSelectHotspot }: HotspotListProps) {
  const insets = useSafeAreaInsets();
  const { status: permissionStatus, isLoading: isLoadingPermission } = useLocationPermissionStore();
  const { location, isLoading: isLoadingUserLocation } = useLocation(isOpen);
  const isLoadingLocation = isLoadingPermission || isLoadingUserLocation;
  const { showSavedOnly, setShowSavedOnly } = useFiltersStore();
  const activeFilterCount = [showSavedOnly].filter(Boolean).length;
  const dismissRef = useRef<(() => Promise<void>) | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const debouncedSetQuery = useMemo(() => debounce(setDebouncedQuery, 150), []);

  useEffect(() => {
    debouncedSetQuery(searchQuery);
    return () => debouncedSetQuery.cancel();
  }, [searchQuery, debouncedSetQuery]);

  useEffect(() => {
    if (!isOpen) {
      setIsFilterPanelOpen(false);
    }
  }, [isOpen]);

  const hasLocationAccess = permissionStatus === "granted" && location !== null;

  const { data: searchResults = [], dataUpdatedAt: searchUpdatedAt } = useQuery({
    queryKey: ["hotspotSearch", debouncedQuery, showSavedOnly],
    queryFn: () => searchHotspots(debouncedQuery, SEARCH_LIMIT, showSavedOnly),
    enabled: isOpen && debouncedQuery.length >= 2 && !isLoadingLocation,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: allHotspots = [] } = useQuery({
    queryKey:
      hasLocationAccess && location
        ? ["nearbyHotspots", location.lat, location.lng, showSavedOnly]
        : ["allHotspots", showSavedOnly],
    queryFn: async () => {
      if (hasLocationAccess && location) {
        // Try the smallest buckets first to get a result quickly
        let hotspots: Hotspot[] = [];
        for (const radiusKm of NEARBY_BUCKETS_KM) {
          const bbox = getBoundingBoxFromLocation(location.lat, location.lng, radiusKm);
          hotspots = await getNearbyHotspots(bbox, showSavedOnly);
          if (hotspots.length >= NEARBY_LIMIT) {
            return hotspots;
          }
        }
        return hotspots;
      }
      return getAllHotspots(ALL_HOTSPOTS_LIMIT, showSavedOnly);
    },
    enabled: isOpen && debouncedQuery.length < 2 && !isLoadingLocation,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const displayedHotspots = useMemo(() => {
    const hotspots = debouncedQuery.length >= 2 ? searchResults : allHotspots;

    if (hasLocationAccess && location) {
      const hotspotsWithDistance = hotspots.map((h) => ({
        ...h,
        distance: calculateDistance(location.lat, location.lng, h.lat, h.lng),
      }));
      hotspotsWithDistance.sort((a, b) => a.distance - b.distance);
      return hotspotsWithDistance.slice(0, debouncedQuery.length >= 2 ? hotspots.length : NEARBY_LIMIT);
    } else {
      const sorted = [...hotspots].sort((a, b) => a.name.localeCompare(b.name));
      return sorted.slice(0, debouncedQuery.length >= 2 ? hotspots.length : ALL_HOTSPOTS_LIMIT);
    }
  }, [debouncedQuery, searchResults, allHotspots, hasLocationAccess, location]);

  const { listRef, onScroll } = useScrollRestore(isOpen, searchUpdatedAt);

  const handleSelectHotspot = useCallback(
    async (hotspot: Hotspot & { distance?: number }) => {
      await dismissRef.current?.();
      onSelectHotspot(hotspot.id, hotspot.lat, hotspot.lng);
    },
    [onSelectHotspot]
  );

  const renderHotspotItem = useCallback(
    ({ item }: { item: Hotspot & { distance?: number } }) => <HotspotItem item={item} onSelect={handleSelectHotspot} />,
    [handleSelectHotspot]
  );

  const listEmptyComponent = (
    <View style={tw`flex-1 items-center justify-center py-12`}>
      {isLoadingLocation && permissionStatus === "granted" ? (
        <>
          <ActivityIndicator size="large" color={tw.color("blue-500")} />
          <Text style={tw`text-gray-600 text-base mt-3`}>Getting current location...</Text>
        </>
      ) : (
        <Text style={tw`text-gray-600 text-base`}>No hotspots found</Text>
      )}
    </View>
  );

  const headerText = hasLocationAccess ? "Nearby Hotspots" : "Hotspots";

  const keyExtractor = useCallback((item: Hotspot & { distance?: number }) => item.id, []);

  const headerContent = (dismiss: () => Promise<void>) => {
    dismissRef.current = dismiss;

    return (
      <View style={tw`pr-5 pl-6`}>
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-gray-900 text-xl font-bold`}>{headerText}</Text>
          </View>
          <IconButtonGroup>
            <View>
              <IconButton icon="filter-outline" onPress={() => setIsFilterPanelOpen((open) => !open)} />
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

        <View style={tw`gap-3 py-3`}>
          {isFilterPanelOpen && (
            <View style={tw`bg-gray-50 rounded-2xl px-4 py-3`}>
              <View style={tw`flex-row items-center justify-between`}>
                <Text style={tw`text-base text-gray-900`}>Show saved only</Text>
                <Switch value={showSavedOnly} onValueChange={setShowSavedOnly} />
              </View>
            </View>
          )}
          <SearchInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search" />
        </View>
      </View>
    );
  };

  return (
    <>
      <BaseBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        detents={[0.92, 0.98]}
        initialIndex={1}
        headerContent={headerContent}
        scrollable
        dimmed
      >
        <FlashList
          ref={listRef}
          data={displayedHotspots}
          renderItem={renderHotspotItem}
          keyExtractor={keyExtractor}
          style={tw`flex-1`}
          contentContainerStyle={
            displayedHotspots.length === 0 ? tw`flex-1` : { paddingBottom: Math.max(insets.bottom, 16) }
          }
          showsVerticalScrollIndicator
          ListEmptyComponent={listEmptyComponent}
          onScroll={onScroll}
          keyboardShouldPersistTaps="handled"
        />
      </BaseBottomSheet>
    </>
  );
}
