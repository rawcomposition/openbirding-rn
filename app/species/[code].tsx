import HotspotDialog from "@/components/HotspotDialog";
import MonthlyBarChart from "@/components/MonthlyBarChart";
import { useLocation } from "@/hooks/useLocation";
import { useTaxonomy } from "@/hooks/useTaxonomy";
import { getBestHotspotsForSpecies, getNearbySpeciesData, getRadiusOption, SpeciesHotspot } from "@/lib/nearbySpecies";
import { getSpeciesImage } from "@/lib/species";
import tw from "@/lib/tw";
import { calculateDistance, formatDistance, getMarkerColor } from "@/lib/utils";
import { useMapStore } from "@/stores/mapStore";
import { SpeciesHotspotSort, useSettingsStore } from "@/stores/settingsStore";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

const MAX_HOTSPOTS = 25;

// Only show distances measured from the user when they're reasonably close to the
// search area; when browsing a remote spot, distances from the search center are
// more meaningful than "4,200 mi from home".
const REASONABLE_DISTANCE_KM = { imperial: 1609.34, metric: 1000 } as const;

export default function SpeciesDetailPage() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ code: string; lat: string; lng: string }>();
  const code = params.code;
  const lat = Number(params.lat);
  const lng = Number(params.lng);

  const selectedMonths = useSettingsStore((s) => s.targetMonths);
  const distanceUnits = useSettingsStore((s) => s.distanceUnits);
  const nearbyRadiusIndex = useSettingsStore((s) => s.nearbyRadiusIndex);
  const sort = useSettingsStore((s) => s.speciesHotspotSort);
  const setSort = useSettingsStore((s) => s.setSpeciesHotspotSort);
  const radius = getRadiusOption(distanceUnits, nearbyRadiusIndex);
  const useMiles = distanceUnits === "imperial";

  const [hotspotId, setHotspotId] = useState<string | null>(null);
  const { location: userLocation } = useLocation();
  const { data: taxonomy } = useTaxonomy();
  const taxon = taxonomy?.find((entry) => entry.code === code);
  const image = getSpeciesImage(code, 480);

  useEffect(() => {
    navigation.setOptions({ title: taxon?.name ?? "" });
  }, [navigation, taxon?.name]);

  // Same query key as the Nearby Species list, so this is usually an instant cache hit.
  const { data: nearbyData } = useQuery({
    queryKey: ["nearbySpecies", lat, lng, radius.km, selectedMonths],
    queryFn: () => getNearbySpeciesData(lat, lng, radius.km, selectedMonths.length > 0 ? selectedMonths : undefined),
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    placeholderData: (prev) => prev,
  });
  const target = nearbyData?.targets.find((t) => t.speciesCode === code);

  const { data: hotspots, isLoading: isLoadingHotspots } = useQuery({
    queryKey: ["speciesHotspots", code, lat, lng, radius.km, selectedMonths],
    queryFn: () =>
      getBestHotspotsForSpecies(lat, lng, radius.km, code, selectedMonths.length > 0 ? selectedMonths : undefined),
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    placeholderData: (prev) => prev,
  });

  // Measure distances from the user when they're near the search area, otherwise
  // from the search center itself.
  const userIsNearby =
    !!userLocation && calculateDistance(userLocation.lat, userLocation.lng, lat, lng) <= REASONABLE_DISTANCE_KM[distanceUnits];
  const distanceOrigin = userIsNearby && userLocation ? userLocation : { lat, lng };

  const sortedHotspots = useMemo(() => {
    if (!hotspots) return [];
    const withDistance = hotspots.map((hotspot) => ({
      ...hotspot,
      distanceKm: calculateDistance(distanceOrigin.lat, distanceOrigin.lng, hotspot.lat, hotspot.lng),
    }));
    return withDistance
      .sort((a, b) => (sort === "distance" ? a.distanceKm - b.distanceKm : b.percentage - a.percentage))
      .slice(0, MAX_HOTSPOTS);
  }, [hotspots, sort, distanceOrigin.lat, distanceOrigin.lng]);

  const openMerlin = () => {
    Linking.openURL(`merlinbirdid://species/${code}`).catch(() => {
      Alert.alert("Cannot Open Merlin", "Make sure the Merlin Bird ID app is installed.");
    });
  };

  const openEbirdMap = () => {
    const delta = 0.05;
    const url = `https://ebird.org/map/${code}?gp=true&yr=all&env.minX=${(lng - delta).toFixed(3)}&env.minY=${(lat - delta).toFixed(3)}&env.maxX=${(lng + delta).toFixed(3)}&env.maxY=${(lat + delta).toFixed(3)}`;
    Linking.openURL(url);
  };

  // Hand the hotspot off to the map screen and unwind the stack down to it. The dialog has
  // already dismissed its sheet by the time this runs; navigate first so the map screen is
  // focused when it consumes the pending focus request.
  const handleShowOnMap = (hotspot: { id: string; lat: number; lng: number }) => {
    setHotspotId(null);
    router.dismissTo("/");
    useMapStore.getState().setPendingMapFocus({ hotspotId: hotspot.id, lat: hotspot.lat, lng: hotspot.lng });
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <ScrollView contentContainerStyle={tw`px-4 pt-2 pb-12`} showsVerticalScrollIndicator={false}>
        {image && (
          <View>
            <Image source={{ uri: image.url }} style={[tw`w-full rounded-2xl bg-gray-200`, { aspectRatio: 4 / 3 }]} />
            <Text style={tw`text-xs text-gray-400 mt-1.5 text-right`}>
              Photo © {image.by}
              {image.license ? ` · ${image.license}` : ""}
            </Text>
          </View>
        )}

        <View style={tw`mt-2`}>
          <Text style={tw`text-2xl font-bold text-gray-900`}>{taxon?.name ?? code}</Text>
          {taxon?.sciName ? <Text style={tw`text-base italic text-gray-500 mt-0.5`}>{taxon.sciName}</Text> : null}
        </View>

        <LifeListStatus code={code} speciesName={taxon?.name ?? code} />

        <View style={tw`flex-row mt-4 gap-2`}>
          <ExternalLinkButton icon="sparkles-outline" label="Merlin" onPress={openMerlin} />
          <ExternalLinkButton icon="map-outline" label="eBird Map" onPress={openEbirdMap} />
        </View>

        <View style={tw`mt-6`}>
          <Text style={tw`text-base font-semibold text-gray-900`}>Seasonality</Text>
          <Text style={tw`text-sm text-gray-500 mt-1`}>
            Share of checklists reporting this species within ~{radius.label}
          </Text>
          {target ? (
            <View style={tw`bg-white border border-gray-200/80 rounded-2xl px-4 pt-3 pb-4 mt-3`}>
              <MonthlyBarChart monthly={target.monthly} selectedMonths={selectedMonths} />
            </View>
          ) : (
            <View style={tw`mt-3 bg-gray-100 border border-gray-200/80 rounded-lg p-4 flex-row items-center`}>
              <Ionicons name="alert-circle" size={20} color={tw.color("gray-400")} style={tw`mr-3`} />
              <Text style={tw`text-sm text-gray-600 flex-1`}>No frequency data for this species here.</Text>
            </View>
          )}
        </View>

        <View style={tw`mt-6`}>
          <View style={tw`flex-row items-center justify-between`}>
            <Text style={tw`text-base font-semibold text-gray-900`}>Best Hotspots</Text>
            {sortedHotspots.length > 1 && <SortToggle sort={sort} onChange={setSort} />}
          </View>
          <Text style={tw`text-sm text-gray-500 mt-1`}>
            Where this species is reported most often within ~{radius.label}
          </Text>

          {sortedHotspots.length > 0 ? (
            <View style={tw`bg-white border border-gray-200/80 rounded-2xl mt-3 overflow-hidden`}>
              {sortedHotspots.map((hotspot, idx) => (
                <View key={hotspot.id}>
                  {idx > 0 && <View style={tw`h-px bg-gray-100 ml-4`} />}
                  <SpeciesHotspotRow
                    hotspot={hotspot}
                    useMiles={useMiles}
                    onPress={() => setHotspotId(hotspot.id)}
                  />
                </View>
              ))}
            </View>
          ) : isLoadingHotspots ? null : (
            <View style={tw`mt-3 bg-gray-100 border border-gray-200/80 rounded-lg p-4 flex-row items-center`}>
              <Ionicons name="alert-circle" size={20} color={tw.color("gray-400")} style={tw`mr-3`} />
              <Text style={tw`text-sm text-gray-600 flex-1`}>
                No hotspots have reported this species within ~{radius.label}.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Presented on top of this screen, so dismissing it returns right here. */}
      <HotspotDialog
        isOpen={hotspotId !== null}
        hotspotId={hotspotId}
        onClose={() => setHotspotId(null)}
        dimmed
        onShowOnMap={handleShowOnMap}
      />
    </View>
  );
}

function LifeListStatus({ code, speciesName }: { code: string; speciesName: string }) {
  const lifelist = useSettingsStore((s) => s.lifelist);
  const setLifelist = useSettingsStore((s) => s.setLifelist);
  const lifelistExclusions = useSettingsStore((s) => s.lifelistExclusions);
  const setLifelistExclusions = useSettingsStore((s) => s.setLifelistExclusions);

  const entry = lifelist?.find((e) => e.code === code);
  const isExcluded = lifelistExclusions?.includes(code) ?? false;

  const handleAdd = () => {
    const newEntry = {
      code,
      date: new Date().toISOString().split("T")[0],
      location: "N/A",
      checklistId: null,
      isManual: true,
    };
    setLifelist([...(lifelist || []), newEntry]);
    Toast.show({ type: "success", text1: `Added ${speciesName} to life list` });
  };

  const handleRemove = () => {
    setLifelist((lifelist || []).filter((e) => e.code !== code));
  };

  const handleRemoveExclusion = () => {
    setLifelistExclusions((lifelistExclusions || []).filter((c) => c !== code));
  };

  if (isExcluded) {
    return (
      <View style={tw`mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex-row items-center`}>
        <Ionicons name="eye-off-outline" size={20} color={tw.color("amber-600")} style={tw`mr-2.5`} />
        <Text style={tw`text-sm text-amber-800 flex-1`}>Excluded from your life list, so it still shows as a target.</Text>
        <TouchableOpacity onPress={handleRemoveExclusion} activeOpacity={0.7} hitSlop={8}>
          <Text style={tw`text-sm font-semibold text-amber-700 ml-2`}>Undo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (entry) {
    const seenLabel = entry.isManual
      ? "On your life list"
      : `Seen ${dayjs(entry.date).isValid() ? dayjs(entry.date).format("MMM D, YYYY") : entry.date}`;
    return (
      <View style={tw`mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex-row items-center`}>
        <Ionicons name="checkmark-circle" size={20} color={tw.color("emerald-600")} style={tw`mr-2.5`} />
        <View style={tw`flex-1`}>
          <Text style={tw`text-sm font-medium text-emerald-800`}>{seenLabel}</Text>
          {!entry.isManual && entry.location && entry.location !== "N/A" ? (
            <Text style={tw`text-xs text-emerald-700 mt-0.5`} numberOfLines={1}>
              {entry.location}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={handleRemove} activeOpacity={0.7} hitSlop={8}>
          <Text style={tw`text-sm font-semibold text-emerald-700 ml-2`}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handleAdd}
      activeOpacity={0.8}
      style={tw`mt-4 bg-emerald-600 rounded-full h-11 flex-row items-center justify-center`}
    >
      <Ionicons name="add-circle-outline" size={19} color="white" style={tw`mr-2`} />
      <Text style={tw`text-white text-base font-semibold`}>Add to Life List</Text>
    </TouchableOpacity>
  );
}

function ExternalLinkButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={tw`flex-1 flex-row items-center justify-center bg-gray-100 rounded-full h-11`}
    >
      <Ionicons name={icon} size={17} color={tw.color("gray-700")} style={tw`mr-2`} />
      <Text style={tw`text-gray-700 text-sm font-medium`}>{label}</Text>
    </TouchableOpacity>
  );
}

function SortToggle({ sort, onChange }: { sort: SpeciesHotspotSort; onChange: (sort: SpeciesHotspotSort) => void }) {
  return (
    <View style={tw`flex-row bg-gray-200/70 rounded-full p-0.5`}>
      {(
        [
          { value: "frequency", label: "Frequency" },
          { value: "distance", label: "Distance" },
        ] as const
      ).map((option) => (
        <TouchableOpacity
          key={option.value}
          onPress={() => onChange(option.value)}
          activeOpacity={0.7}
          style={tw.style("px-2.5 py-1 rounded-full", sort === option.value && "bg-white shadow-sm")}
        >
          <Text style={tw.style("text-xs font-medium", sort === option.value ? "text-gray-900" : "text-gray-500")}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SpeciesHotspotRow({
  hotspot,
  useMiles,
  onPress,
}: {
  hotspot: SpeciesHotspot;
  useMiles: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [tw`px-4 py-3 flex-row items-center`, pressed && tw`bg-gray-50`]}>
      <View style={tw`flex-1`}>
        <Text style={tw`text-gray-900 text-base font-medium`} numberOfLines={1}>
          {hotspot.name}
        </Text>
        <View style={tw`flex-row items-center mt-1`}>
          <View style={[tw`w-2.5 h-2.5 rounded-full mr-2`, { backgroundColor: getMarkerColor(hotspot.speciesCount) }]} />
          <Text style={tw`text-sm text-gray-600`}>
            <Text style={tw`font-semibold text-emerald-700`}>
              {hotspot.percentage < 1 ? hotspot.percentage.toFixed(1) : hotspot.percentage.toFixed(0)}%
            </Text>
            {`  ·  ${hotspot.samples.toLocaleString()} checklist${hotspot.samples === 1 ? "" : "s"}`}
          </Text>
        </View>
      </View>
      <Text style={tw`text-gray-500 text-sm ml-2`}>{formatDistance(hotspot.distanceKm, useMiles)}</Text>
      <Ionicons name="chevron-forward" size={18} color={tw.color("gray-400")} style={tw`ml-2`} />
    </Pressable>
  );
}
