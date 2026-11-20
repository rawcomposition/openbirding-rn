import { FloatingMenuHost, FloatingMenuProvider, useFloatingMenu } from "@/components/FloatingMenuProvider";
import { PackUpdateNotice } from "@/components/PackCoverageNotice";
import SpinnerPill from "@/components/SpinnerPill";
import TargetsView, { buildTargetsMenuSections } from "@/components/TargetsView";
import { useLocation } from "@/hooks/useLocation";
import { useNearbyRadius } from "@/hooks/useNearbyRadius";
import { useTargetsOnlySeenCodes } from "@/hooks/useTargetsOnlySeenCodes";
import {
  aggregateNearbySpecies,
  countNearbySpecies,
  formatNearbySpeciesCount,
  getNearbySpeciesRaw,
  hasOutdatedNearbySpeciesPacks,
  isMapCenteredOnUser,
  NEARBY_MIN_PERCENTAGE,
  RADIUS_OPTIONS,
} from "@/lib/nearbySpecies";
import tw from "@/lib/tw";
import { parsePackVersion } from "@/lib/utils";
import { useMapStore } from "@/stores/mapStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { PopoverMode, PopoverPlacement } from "react-native-popover-view";

const NEARBY_INITIAL_LIMIT = 100;

export default function NearbySpeciesPage() {
  return (
    <FloatingMenuProvider>
      <NearbySpeciesContent />
    </FloatingMenuProvider>
  );
}

function NearbySpeciesContent() {
  const navigation = useNavigation();

  const { openMenu } = useFloatingMenu();
  const menuAnchorRef = useRef<View>(null!);
  const radiusAnchorRef = useRef<View>(null!);
  const mapCenter = useMapStore((s) => s.mapCenter);
  // Poll while this screen is open so the re-center button reacts to movement within ~5 min.
  const { location: userLocation } = useLocation(true, { refetchInterval: 5 * 60 * 1000 });
  const selectedMonths = useSettingsStore((s) => s.targetMonths);
  const seenCodes = useTargetsOnlySeenCodes();
  const distanceUnits = useSettingsStore((s) => s.distanceUnits);
  const nearbyRadiusIndex = useSettingsStore((s) => s.nearbyRadiusIndex);
  const setNearbyRadiusIndex = useSettingsStore((s) => s.setNearbyRadiusIndex);
  const setNearbyRadiusAuto = useSettingsStore((s) => s.setNearbyRadiusAuto);
  const displayMode = useSettingsStore((s) => s.nearbyDisplayMode);
  // Matches the map view unless the user has picked a specific radius.
  const radius = useNearbyRadius();
  const [aboutDataOpen, setAboutDataOpen] = useState(false);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const nearUser = isMapCenteredOnUser(mapCenter, userLocation);
  const atUserLocation = !!userLocation && (useMyLocation || nearUser);
  const center = atUserLocation ? userLocation : mapCenter;
  const canRecenter = !!userLocation && !atUserLocation;

  // The query fetches/merges raw counts once per (center, radius); month filtering is a
  // synchronous aggregation below, so toggling months never refetches.
  const { data: rawData, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ["nearbySpecies", center?.lat, center?.lng, radius.km],
    queryFn: ({ signal }) => getNearbySpeciesRaw(center!.lat, center!.lng, radius.km, signal),
    enabled: !!center,
    placeholderData: (prev) => prev,
  });
  const { data: hasOutdatedPacks } = useQuery({
    queryKey: ["nearbyOutdatedPacks"],
    queryFn: hasOutdatedNearbySpeciesPacks,
  });
  // Deferring the month selection lets a toggle paint immediately (strip + spinner) while
  // the aggregation and the 100-row re-render happen in a lower-priority render pass.
  const deferredMonths = useDeferredValue(selectedMonths);
  const data = useMemo(
    () => (rawData ? aggregateNearbySpecies(rawData, deferredMonths.length > 0 ? deferredMonths : undefined) : undefined),
    [rawData, deferredMonths]
  );
  const deferredSearch = useDeferredValue(searchQuery);
  const isRecalculating = deferredMonths !== selectedMonths;
  // Placeholder data is the previous radius/location's result; keep stale rows visible but
  // dimmed under a spinner rather than swapping to a skeleton.
  const isUpdating = (isFetching && isPlaceholderData) || isRecalculating;

  const showMenu = !!data && data.targets.length > 0;
  const hasVersion = !!(data?.version && parsePackVersion(data.version));

  const openNearbyMenu = useCallback(() => {
    const { showAllSpecies, setShowAllSpecies, nearbyDisplayMode, setNearbyDisplayMode } = useSettingsStore.getState();
    openMenu(
      buildTargetsMenuSections({
        showAllSpecies,
        onToggleShowAll: () => setShowAllSpecies(!showAllSpecies),
        displayMode: nearbyDisplayMode,
        onToggleDisplayMode: () => setNearbyDisplayMode(nearbyDisplayMode === "chart" ? "percent" : "chart"),
        hasVersion,
        onOpenAbout: () => setAboutDataOpen(true),
      }),
      menuAnchorRef,
      { placementOverride: PopoverPlacement.BOTTOM }
    );
  }, [openMenu, hasVersion]);

  const openRadiusMenu = useCallback(() => {
    const check = (checked: boolean) =>
      checked ? <Ionicons name="checkmark" size={18} color={tw.color("emerald-600")} /> : <View style={tw`w-5`} />;
    openMenu(
      [
        { items: [{ label: "Match map view", icon: check(radius.isAuto), onPress: () => setNearbyRadiusAuto(true) }] },
        {
          items: RADIUS_OPTIONS[distanceUnits].map((option, index) => ({
            label: option.label,
            icon: check(!radius.isAuto && index === nearbyRadiusIndex),
            onPress: () => setNearbyRadiusIndex(index),
          })),
        },
      ],
      radiusAnchorRef,
      { placementOverride: PopoverPlacement.BOTTOM }
    );
  }, [openMenu, distanceUnits, nearbyRadiusIndex, radius.isAuto, setNearbyRadiusIndex, setNearbyRadiusAuto]);

  const handleRecenter = useCallback(() => setUseMyLocation(true), []);

  // Native header search bar, stacked under the title. hideWhenScrolling is the intended
  // native collapse behavior; it currently doesn't engage on iOS 26 (react-native-screens
  // issue), but it's harmless and will start working if that gets fixed upstream.
  useEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: "Search species",
        placement: "stacked",
        hideWhenScrolling: true,
        onChangeText: (event: { nativeEvent: { text: string } }) => setSearchQuery(event.nativeEvent.text),
      },
    });
  }, [navigation]);

  useEffect(() => {
    navigation.setOptions({
      headerRight:
        canRecenter || showMenu
          ? () => (
              <View style={tw`flex-row items-center`}>
                {canRecenter ? (
                  <TouchableOpacity onPress={handleRecenter} activeOpacity={0.7} style={tw`px-2 py-1`}>
                    <Ionicons name="navigate-outline" size={22} color={tw.color("gray-800")} />
                  </TouchableOpacity>
                ) : null}
                {showMenu ? (
                  <TouchableOpacity onPress={openNearbyMenu} activeOpacity={0.7} style={tw`px-2 py-1`}>
                    <View ref={menuAnchorRef}>
                      <Ionicons name="ellipsis-horizontal" size={22} color={tw.color("gray-800")} />
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>
            )
          : undefined,
    });
  }, [navigation, showMenu, openNearbyMenu, canRecenter, handleRecenter]);

  const locationLabel = atUserLocation ? "your location" : "map center";
  const speciesCount = data ? countNearbySpecies(data, seenCodes) : null;

  // Shown even when the area comes up empty, so a wider radius is always one tap away. The
  // pill is outlined while the radius follows the map and filled once it's a fixed choice.
  const caption = data ? (
    <View style={tw`flex-row items-center justify-between`}>
      <Text style={tw`flex-1 mr-3 text-sm text-gray-700`} numberOfLines={1}>
        {speciesCount && speciesCount.total > 0 ? (
          <>
            <Text style={tw`font-semibold text-gray-900`}>{formatNearbySpeciesCount(speciesCount)}</Text> near{" "}
            {locationLabel}
          </>
        ) : (
          `Near ${locationLabel}`
        )}
      </Text>
      <TouchableOpacity
        onPress={openRadiusMenu}
        activeOpacity={0.7}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={
          radius.isAuto ? `Radius: ${radius.label}, matching the map view` : `Radius: fixed at ${radius.label}`
        }
        style={[
          tw`rounded-full border pl-3.5 pr-2.5 py-1.5`,
          radius.isAuto ? tw`bg-white border-gray-300` : tw`bg-emerald-600 border-emerald-600`,
        ]}
      >
        <View ref={radiusAnchorRef} style={tw`flex-row items-center`}>
          <Text style={tw`text-sm font-semibold ${radius.isAuto ? "text-gray-800" : "text-white"}`}>{radius.label}</Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={radius.isAuto ? tw.color("gray-600") : "white"}
            style={tw`ml-1`}
          />
        </View>
      </TouchableOpacity>
    </View>
  ) : null;

  const updateNotice = hasOutdatedPacks ? <PackUpdateNotice /> : null;

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <ScrollView
        contentContainerStyle={tw`px-4 pb-10`}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        {!center ? (
          <View style={tw`mt-4 bg-gray-100 border border-gray-200/80 rounded-lg p-4 flex-row items-center`}>
            <Ionicons name="map-outline" size={20} color={tw.color("gray-400")} style={tw`mr-3`} />
            <Text style={tw`text-sm text-gray-600 flex-1`}>Pan the map to a location first, then reopen this screen.</Text>
          </View>
        ) : (
          // Negative margin trims the slack the collapsed header search bar leaves above
          // the month strip.
          <View style={tw`-mt-2`}>
          {/* When the list is empty the update notice renders as the empty state instead */}
          {showMenu && updateNotice ? <View style={tw`mt-3 mb-2`}>{updateNotice}</View> : null}
          <TargetsView
            data={data}
            isLoading={isLoading}
            isUpdating={isUpdating}
            lat={center.lat}
            lng={center.lng}
            origin={atUserLocation ? "user" : "map"}
            aboutDataOpen={aboutDataOpen}
            onAboutDataOpenChange={setAboutDataOpen}
            caption={caption}
            initialLimit={NEARBY_INITIAL_LIMIT}
            minPercentage={NEARBY_MIN_PERCENTAGE}
            displayMode={displayMode}
            searchQuery={deferredSearch}
            chartMonths={deferredMonths}
            emptyNotice={updateNotice}
            hideLoadingIndicator
            prominentRows
          />
          </View>
        )}
      </ScrollView>

      {(isLoading || isUpdating) && (
        <View style={tw`absolute inset-0 items-center justify-center`} pointerEvents="none">
          <SpinnerPill />
        </View>
      )}

      <FloatingMenuHost mode={PopoverMode.RN_MODAL} offset={12} />
    </View>
  );
}
