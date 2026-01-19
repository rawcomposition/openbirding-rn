import { useLocation } from "@/hooks/useLocation";
import { getAllHotspots, getNearbyHotspots, searchHotspots } from "@/lib/database";
import tw from "@/lib/tw";
import { calculateDistance, getBoundingBoxFromLocation, getMarkerColor } from "@/lib/utils";
import { useLocationPermissionStore } from "@/stores/locationPermissionStore";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import debounce from "lodash/debounce";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Hotspot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  species: number;
  country: string | null;
};

type HotspotListProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectHotspot: (hotspotId: string, lat: number, lng: number) => void;
};

const NEARBY_LIMIT = 200;
const ALL_HOTSPOTS_LIMIT = 1000;
const NEARBY_BUCKETS_KM = [50, 100, 200, 500];

const MILES_COUNTRIES = ["US", "GB", "MM", "LR", "PR", "VI", "GU", "MP", "AS", "KY", "TC", "VG", "AI", "MS", "FK"];

const formatDistance = (distanceKm: number, country: string | null) => {
  const useMiles = country && MILES_COUNTRIES.includes(country);
  if (useMiles) {
    const distanceMiles = distanceKm * 0.621371;
    const rounded = Math.round(distanceMiles);
    if (rounded >= 10) {
      return `${rounded} mi`;
    }
    return `${distanceMiles.toFixed(1)} mi`;
  }
  const rounded = Math.round(distanceKm);
  if (rounded >= 10) {
    return `${rounded} km`;
  }
  return `${distanceKm.toFixed(1)} km`;
};

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

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setDebouncedQuery("");
    }
  }, [isOpen]);

  const hasLocationAccess = permissionStatus === "granted" && location !== null;

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["hotspotSearch", debouncedQuery],
    queryFn: () => searchHotspots(debouncedQuery),
    enabled: isOpen && debouncedQuery.length > 0 && !isLoadingLocation,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: allHotspots = [], isLoading: isLoadingAll } = useQuery({
    queryKey: hasLocationAccess && location ? ["nearbyHotspots", location.lat, location.lng] : ["allHotspots"],
    queryFn: async () => {
      if (hasLocationAccess && location) {
        // Try the smallest buckets first to get a result quickly
        for (const radiusKm of NEARBY_BUCKETS_KM) {
          const bbox = getBoundingBoxFromLocation(location.lat, location.lng, radiusKm);
          const hotspots = await getNearbyHotspots(bbox);
          if (hotspots.length >= NEARBY_LIMIT) {
            return hotspots;
          }
        }
        // Fall back to the largest bucket if we didn't get enough results
        const largestBbox = getBoundingBoxFromLocation(location.lat, location.lng, NEARBY_BUCKETS_KM[NEARBY_BUCKETS_KM.length - 1]);
        return getNearbyHotspots(largestBbox);
      }
      return getAllHotspots(ALL_HOTSPOTS_LIMIT);
    },
    enabled: isOpen && debouncedQuery.length === 0 && !isLoadingLocation,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const displayedHotspots = useMemo(() => {
    const hotspots = debouncedQuery.length > 0 ? searchResults : allHotspots;

    if (hasLocationAccess && location) {
      const hotspotsWithDistance = hotspots.map((h) => ({
        ...h,
        distance: calculateDistance(location.lat, location.lng, h.lat, h.lng),
      }));
      hotspotsWithDistance.sort((a, b) => a.distance - b.distance);

      const limit = debouncedQuery.length > 0 ? hotspots.length : NEARBY_LIMIT;
      return hotspotsWithDistance.slice(0, limit);
    } else {
      const sorted = [...hotspots].sort((a, b) => a.name.localeCompare(b.name));
      const limit = debouncedQuery.length > 0 ? hotspots.length : ALL_HOTSPOTS_LIMIT;
      return sorted.slice(0, limit);
    }
  }, [debouncedQuery, searchResults, allHotspots, hasLocationAccess, location]);

  const handleSelectHotspot = useCallback(
    (hotspot: Hotspot & { distance?: number }) => {
      onSelectHotspot(hotspot.id, hotspot.lat, hotspot.lng);
    },
    [onSelectHotspot]
  );

  const renderHotspotItem = useCallback(
    ({ item }: { item: Hotspot & { distance?: number } }) => (
      <TouchableOpacity
        onPress={() => handleSelectHotspot(item)}
        style={tw`flex-row items-center px-4 py-3 border-b border-gray-200/70 bg-white`}
        activeOpacity={0.7}
      >
        <View style={tw`flex-1`}>
          <Text style={tw`text-gray-900 text-base font-medium`} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={tw`flex-row items-center mt-1`}>
            <View
              style={[tw`w-2.5 h-2.5 rounded-full mr-2`, { backgroundColor: getMarkerColor(item.species || 0) }]}
            />
            <Text style={tw`text-gray-600 text-sm`}>{item.species} species</Text>
          </View>
        </View>
        {item.distance !== undefined && (
          <Text style={tw`text-gray-500 text-sm ml-2`}>{formatDistance(item.distance, item.country)}</Text>
        )}
        <Ionicons name="chevron-forward" size={18} color={tw.color("gray-400")} style={tw`ml-2`} />
      </TouchableOpacity>
    ),
    [handleSelectHotspot]
  );

  const isLoading = isLoadingLocation || isSearching || isLoadingAll;

  const renderContent = () => {
    if (isLoadingLocation && permissionStatus === "granted") {
      return (
        <View style={tw`flex-1 items-center justify-center py-12`}>
          <ActivityIndicator size="large" color={tw.color("blue-500")} />
          <Text style={tw`text-gray-600 text-base mt-3`}>Getting current location...</Text>
        </View>
      );
    }

    if (displayedHotspots.length === 0 && !isLoading) {
      return (
        <View style={tw`flex-1 items-center justify-center py-12`}>
          <Text style={tw`text-gray-600 text-base`}>No hotspots found</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={displayedHotspots}
        renderItem={renderHotspotItem}
        keyExtractor={(item) => item.id}
        style={tw`flex-1`}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  const headerText = hasLocationAccess ? "Nearby Hotspots" : "Hotspots";

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

        {renderContent()}
      </View>
    </Modal>
  );
}
