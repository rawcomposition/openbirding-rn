import { useLocation } from "@/hooks/useLocation";
import { getSavedHotspots, getSavedPlaces, searchHotspots } from "@/lib/database";
import tw from "@/lib/tw";
import { Hotspot, SavedPlace } from "@/lib/types";
import { calculateDistance } from "@/lib/utils";
import { useMapStore } from "@/stores/mapStore";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import BaseBottomSheet from "./BaseBottomSheet";
import HotspotItem from "./HotspotItem";
import IconButton from "./IconButton";
import PlaceItem from "./PlaceItem";
import SearchInput from "./SearchInput";

type SearchSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectHotspot: (hotspotId: string, lat: number, lng: number) => void;
  onSelectPlace: (placeId: string, lat: number, lng: number) => void;
};

// Nothing is searched until the query is meaningful — a 1-char `LIKE %x%`
// against the full table matches almost everything.
const MIN_QUERY = 2;
const HOTSPOT_LIMIT = 30;

type PlaceWithDistance = SavedPlace & { distance?: number };
type HotspotWithDistance = Hotspot & { distance?: number };

type SearchRow =
  | { type: "section"; key: string; title: string }
  | { type: "place"; key: string; place: PlaceWithDistance }
  | { type: "hotspot"; key: string; hotspot: HotspotWithDistance };

export default function SearchSheet({ isOpen, onClose, onSelectHotspot, onSelectPlace }: SearchSheetProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const dismissRef = useRef<(() => Promise<void>) | null>(null);
  const { location } = useLocation(isOpen);
  const mapCenter = useMapStore((state) => state.mapCenter);

  // Sort origin falls back to map center so duplicate-named saved places (e.g.
  // two "Airport"s) still order nearest-first without GPS. The displayed
  // distance label stays gated on real location only — see `withDistance`.
  const originPoint = location ?? mapCenter ?? null;

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [isOpen]);

  // Debounce the hotspot SQL search; place filtering stays live off `query`.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(handle);
  }, [query]);

  const { data: savedPlaces = [] } = useQuery({
    queryKey: ["savedPlaces"],
    queryFn: getSavedPlaces,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: savedHotspots = [] } = useQuery({
    queryKey: ["savedHotspots"],
    queryFn: getSavedHotspots,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const savedHotspotsSet = useMemo(() => new Set(savedHotspots.map((s) => s.hotspot_id)), [savedHotspots]);

  const hotspotQueryEnabled = isOpen && debouncedQuery.length >= MIN_QUERY;
  const { data: hotspotResults = [] } = useQuery({
    queryKey: ["searchHotspots", debouncedQuery],
    queryFn: () => searchHotspots(debouncedQuery, HOTSPOT_LIMIT),
    enabled: hotspotQueryEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const withDistance = useCallback(
    <T extends { lat: number; lng: number }>(item: T): T & { distance?: number } => {
      if (!location) return item;
      return { ...item, distance: calculateDistance(location.lat, location.lng, item.lat, item.lng) };
    },
    [location]
  );

  const matchingPlaces = useMemo<PlaceWithDistance[]>(() => {
    const trimmed = query.trim().toLowerCase();
    const matched = trimmed.length >= MIN_QUERY
      ? savedPlaces.filter((place) => place.name.toLowerCase().includes(trimmed))
      : [];
    const decorated = matched.map((place) => ({
      place: withDistance(place),
      sortDistance: originPoint ? calculateDistance(originPoint.lat, originPoint.lng, place.lat, place.lng) : null,
    }));
    decorated.sort((a, b) => {
      if (a.sortDistance !== null && b.sortDistance !== null) return a.sortDistance - b.sortDistance;
      return a.place.name.localeCompare(b.place.name);
    });
    return decorated.map((d) => d.place);
  }, [savedPlaces, query, withDistance, originPoint]);

  // Hotspots come back alphabetical from SQL; surface prefix matches first so
  // the most likely target sits at the top.
  const rankedHotspots = useMemo<HotspotWithDistance[]>(() => {
    if (!hotspotQueryEnabled) return [];
    const trimmed = debouncedQuery.toLowerCase();
    const decorated = hotspotResults.map(withDistance);
    decorated.sort((a, b) => {
      const aPrefix = a.name.toLowerCase().startsWith(trimmed) ? 0 : 1;
      const bPrefix = b.name.toLowerCase().startsWith(trimmed) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return a.name.localeCompare(b.name);
    });
    return decorated;
  }, [hotspotResults, debouncedQuery, hotspotQueryEnabled, withDistance]);

  const rows = useMemo<SearchRow[]>(() => {
    const result: SearchRow[] = [];
    if (matchingPlaces.length > 0) {
      result.push({ type: "section", key: "section:saved", title: "Saved locations" });
      for (const place of matchingPlaces) {
        result.push({ type: "place", key: `place:${place.id}`, place });
      }
    }
    if (rankedHotspots.length > 0) {
      result.push({ type: "section", key: "section:hotspots", title: "Hotspots" });
      for (const hotspot of rankedHotspots) {
        result.push({ type: "hotspot", key: `hotspot:${hotspot.id}`, hotspot });
      }
    }
    return result;
  }, [matchingPlaces, rankedHotspots]);

  const handleSelectHotspot = useCallback(
    async (hotspot: HotspotWithDistance) => {
      await dismissRef.current?.();
      onSelectHotspot(hotspot.id, hotspot.lat, hotspot.lng);
    },
    [onSelectHotspot]
  );

  const handleSelectPlace = useCallback(
    async (place: PlaceWithDistance) => {
      await dismissRef.current?.();
      onSelectPlace(place.id, place.lat, place.lng);
    },
    [onSelectPlace]
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchRow }) => {
      if (item.type === "section") {
        return (
          <Text style={tw`px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500`}>
            {item.title}
          </Text>
        );
      }
      if (item.type === "place") {
        return <PlaceItem item={item.place} onSelect={handleSelectPlace} />;
      }
      return <HotspotItem item={item.hotspot} onSelect={handleSelectHotspot} isSaved={savedHotspotsSet.has(item.hotspot.id)} />;
    },
    [handleSelectHotspot, handleSelectPlace, savedHotspotsSet]
  );

  const keyExtractor = useCallback((item: SearchRow) => item.key, []);

  // Distinguish empty-because-nothing-typed from empty-because-no-matches.
  const isSearching = query.trim().length >= MIN_QUERY;
  const emptyMessage = isSearching ? "No matches" : "Search for hotspots or saved locations";

  const headerContent = (dismiss: () => Promise<void>) => {
    dismissRef.current = dismiss;
    return (
      <View style={tw`flex-row items-center pl-5 pr-4 pb-2 gap-2`}>
        <View style={tw`flex-1`}>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            autoFocus
            clearable={false}
            returnKeyType="done"
          />
        </View>
        <IconButton icon="close" onPress={dismiss} />
      </View>
    );
  };

  return (
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
        data={rows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={tw`flex-1`}
        contentContainerStyle={rows.length === 0 ? undefined : tw`pb-6`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <View style={tw`items-center justify-center py-16 px-8`}>
            <Text style={tw`text-gray-500 text-base text-center`}>{emptyMessage}</Text>
          </View>
        }
      />
    </BaseBottomSheet>
  );
}
