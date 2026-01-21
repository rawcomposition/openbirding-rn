import { useLocation } from "@/hooks/useLocation";
import { useScrollRestore } from "@/hooks/useScrollRestore";
import { getAllHotspots, getNearbyHotspots, searchHotspots } from "@/lib/database";
import tw from "@/lib/tw";
import { Hotspot } from "@/lib/types";
import { calculateDistance, getBoundingBoxFromLocation } from "@/lib/utils";
import { useLocationPermissionStore } from "@/stores/locationPermissionStore";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import debounce from "lodash/debounce";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HotspotItem from "./HotspotItem";

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

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const debouncedSetQuery = useMemo(() => debounce(setDebouncedQuery, 150), []);

  useEffect(() => {
    debouncedSetQuery(searchQuery);
    return () => debouncedSetQuery.cancel();
  }, [searchQuery, debouncedSetQuery]);

  const hasLocationAccess = permissionStatus === "granted" && location !== null;

  const { data: searchResults = [], dataUpdatedAt: searchUpdatedAt } = useQuery({
    queryKey: ["hotspotSearch", debouncedQuery],
    queryFn: () => searchHotspots(debouncedQuery, SEARCH_LIMIT),
    enabled: isOpen && debouncedQuery.length >= 2 && !isLoadingLocation,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: allHotspots = [] } = useQuery({
    queryKey: hasLocationAccess && location ? ["nearbyHotspots", location.lat, location.lng] : ["allHotspots"],
    queryFn: async () => {
      if (hasLocationAccess && location) {
        // Try the smallest buckets first to get a result quickly
        let hotspots: Hotspot[] = [];
        for (const radiusKm of NEARBY_BUCKETS_KM) {
          const bbox = getBoundingBoxFromLocation(location.lat, location.lng, radiusKm);
          hotspots = await getNearbyHotspots(bbox);
          if (hotspots.length >= NEARBY_LIMIT) {
            return hotspots;
          }
        }
        return hotspots;
      }
      return getAllHotspots(ALL_HOTSPOTS_LIMIT);
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

      const limit = debouncedQuery.length >= 2 ? hotspots.length : NEARBY_LIMIT;
      return hotspotsWithDistance.slice(0, limit);
    } else {
      const sorted = [...hotspots].sort((a, b) => a.name.localeCompare(b.name));
      const limit = debouncedQuery.length >= 2 ? hotspots.length : ALL_HOTSPOTS_LIMIT;
      return sorted.slice(0, limit);
    }
  }, [debouncedQuery, searchResults, allHotspots, hasLocationAccess, location]);

  const { listRef, onScroll } = useScrollRestore(isOpen, searchUpdatedAt);

  const handleSelectHotspot = useCallback(
    (hotspot: Hotspot & { distance?: number }) => {
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

  const keyExtractor = useCallback((item: Hotspot & { distance?: number }, i: number) => `${i}-${item.id}`, []);

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[tw`flex-1 bg-white`, Platform.OS === "android" && { paddingTop: insets.top }]}>
        <View style={tw`flex-row items-center justify-between px-4 pl-6 py-3 pt-5 border-b border-gray-200`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-gray-900 text-xl font-bold`}>{headerText}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={tw`w-10 h-10 items-center justify-center bg-slate-100 rounded-full`}
          >
            <Ionicons name="close" size={26} color={tw.color("gray-500")} />
          </TouchableOpacity>
        </View>

        <View style={tw`px-4 py-3 bg-white border-b border-gray-200`}>
          <TextInput
            style={tw`bg-gray-100 rounded-lg px-3 py-2 text-base leading-5`}
            placeholder="Search all hotspots..."
            placeholderTextColor={tw.color("gray-400")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            returnKeyType="search"
          />
        </View>

        <FlashList
          ref={listRef}
          data={displayedHotspots}
          renderItem={renderHotspotItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={displayedHotspots.length === 0 ? tw`flex-1` : { paddingBottom: insets.bottom }}
          showsVerticalScrollIndicator
          ListEmptyComponent={listEmptyComponent}
          onScroll={onScroll}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Modal>
  );
}
