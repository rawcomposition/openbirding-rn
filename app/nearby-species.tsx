import { FloatingMenuHost, FloatingMenuProvider, useFloatingMenu } from "@/components/FloatingMenuProvider";
import SearchInput from "@/components/SearchInput";
import TargetsView, { buildTargetsMenuSections } from "@/components/TargetsView";
import { useLocation } from "@/hooks/useLocation";
import { getNearbySpeciesData, getRadiusOption, RADIUS_OPTIONS } from "@/lib/nearbySpecies";
import tw from "@/lib/tw";
import { calculateDistance, parsePackVersion } from "@/lib/utils";
import { useMapStore } from "@/stores/mapStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { PopoverMode, PopoverPlacement } from "react-native-popover-view";

// Nearby Species surfaces the long tail of what's around, down to rarely-reported species.
const NEARBY_MIN_PERCENTAGE = 0.1;

export default function NearbySpeciesPage() {
  return (
    <FloatingMenuProvider>
      <NearbySpeciesContent />
    </FloatingMenuProvider>
  );
}

function NearbySpeciesContent() {
  const navigation = useNavigation();
  const router = useRouter();
  const { openMenu } = useFloatingMenu();
  const menuAnchorRef = useRef<View>(null!);
  const radiusAnchorRef = useRef<View>(null!);
  const mapCenter = useMapStore((s) => s.mapCenter);
  // Poll while this screen is open so the re-center button reacts to movement within ~30s.
  const { location: userLocation } = useLocation(true, { refetchInterval: 30 * 1000 });
  const selectedMonths = useSettingsStore((s) => s.targetMonths);
  const lifelist = useSettingsStore((s) => s.lifelist);
  const distanceUnits = useSettingsStore((s) => s.distanceUnits);
  const nearbyRadiusIndex = useSettingsStore((s) => s.nearbyRadiusIndex);
  const setNearbyRadiusIndex = useSettingsStore((s) => s.setNearbyRadiusIndex);
  const displayMode = useSettingsStore((s) => s.nearbyDisplayMode);
  const radius = getRadiusOption(distanceUnits, nearbyRadiusIndex);
  const hasNoLifeList = !lifelist || lifelist.length === 0;
  const [aboutDataOpen, setAboutDataOpen] = useState(false);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Snap to the user's actual location when the map center is basically already there,
  // so the data and caption reflect "your location" rather than an arbitrary map point.
  const AUTO_SNAP_KM = 1;
  const nearUser =
    !!userLocation &&
    !!mapCenter &&
    calculateDistance(mapCenter.lat, mapCenter.lng, userLocation.lat, userLocation.lng) <= AUTO_SNAP_KM;
  const atUserLocation = !!userLocation && (useMyLocation || nearUser);
  const center = atUserLocation ? userLocation : mapCenter;
  const canRecenter = !!userLocation && !atUserLocation;

  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ["nearbySpecies", center?.lat, center?.lng, radius.km, selectedMonths],
    queryFn: () =>
      getNearbySpeciesData(center!.lat, center!.lng, radius.km, selectedMonths.length > 0 ? selectedMonths : undefined),
    enabled: !!center && !hasNoLifeList,
    placeholderData: (prev) => prev,
  });
  // Placeholder data is the previous radius/months result; show the skeleton instead of stale rows.
  const showSkeleton = isLoading || (isFetching && isPlaceholderData);

  const showMenu = !!data && data.targets.length > 0 && !hasNoLifeList;
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
    openMenu(
      [
        {
          items: RADIUS_OPTIONS[distanceUnits].map((option, index) => ({
            label: `Within ${option.label}`,
            icon:
              index === nearbyRadiusIndex ? (
                <Ionicons name="checkmark" size={18} color={tw.color("emerald-600")} />
              ) : (
                <View style={tw`w-5`} />
              ),
            onPress: () => setNearbyRadiusIndex(index),
          })),
        },
      ],
      radiusAnchorRef,
      { placementOverride: PopoverPlacement.BOTTOM }
    );
  }, [openMenu, distanceUnits, nearbyRadiusIndex, setNearbyRadiusIndex]);

  const handleRecenter = useCallback(() => setUseMyLocation(true), []);

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
  const speciesCount = data ? data.targets.filter((t) => t.percentage >= NEARBY_MIN_PERCENTAGE).length : 0;
  const captionText =
    speciesCount > 0
      ? `${speciesCount.toLocaleString()} species within ~${radius.label} of ${locationLabel}`
      : `Reported within ~${radius.label} of ${locationLabel}`;

  // The caption chip doubles as the radius picker.
  const caption =
    data && data.targets.length > 0 ? (
      <TouchableOpacity
        onPress={openRadiusMenu}
        activeOpacity={0.7}
        style={tw`self-start flex-row items-center bg-gray-100 rounded-full pl-2.5 pr-3 py-1.5`}
      >
        <View ref={radiusAnchorRef} style={tw`flex-row items-center`}>
          <Ionicons name="information-circle-outline" size={15} color={tw.color("gray-500")} style={tw`mr-1.5`} />
          <Text style={tw`text-xs font-medium text-gray-500`}>{captionText}</Text>
          <Ionicons name="chevron-down" size={12} color={tw.color("gray-400")} style={tw`ml-1`} />
        </View>
      </TouchableOpacity>
    ) : null;

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <ScrollView
        contentContainerStyle={tw`px-4 pt-2 pb-10`}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {!center ? (
          <View style={tw`mt-4 bg-gray-100 border border-gray-200/80 rounded-lg p-4 flex-row items-center`}>
            <Ionicons name="map-outline" size={20} color={tw.color("gray-400")} style={tw`mr-3`} />
            <Text style={tw`text-sm text-gray-600 flex-1`}>Pan the map to a location first, then reopen this screen.</Text>
          </View>
        ) : (
          <>
            {!hasNoLifeList && (
              <View style={tw`mt-1`}>
                <SearchInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search species..." />
              </View>
            )}
            <TargetsView
              data={data}
              isLoading={showSkeleton}
              lat={center.lat}
              lng={center.lng}
              hideRowMenus
              aboutDataOpen={aboutDataOpen}
              onAboutDataOpenChange={setAboutDataOpen}
              caption={caption}
              disableViewAllLimit
              minPercentage={NEARBY_MIN_PERCENTAGE}
              displayMode={displayMode}
              searchQuery={searchQuery}
              onSpeciesPress={(speciesCode) =>
                router.push({
                  pathname: "/species/[code]",
                  params: { code: speciesCode, lat: String(center.lat), lng: String(center.lng) },
                })
              }
            />
          </>
        )}
      </ScrollView>
      <FloatingMenuHost mode={PopoverMode.RN_MODAL} offset={12} />
    </View>
  );
}
