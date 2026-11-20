import BirdIcon from "@/components/icons/BirdIcon";
import { formatNearbySpeciesCount, NearbySpeciesCount } from "@/lib/nearbySpecies";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

export const MAP_VIEW_CONTROLS_HEIGHT = 56;

type MapViewControlsProps = {
  onOpenList: () => void;
  onOpenSpecies: () => void;
  /** Hotspots in the visible map; null when unknown (e.g. zoomed too far out). */
  hotspotCount: number | null;
  /** Species (or targets) reported around the visible map; null when unknown. */
  speciesCount: NearbySpeciesCount | null;
  light?: boolean;
};

function hotspotLabel(count: number | null) {
  if (count === null) return "Hotspots";
  return `${count.toLocaleString()} ${count === 1 ? "hotspot" : "hotspots"}`;
}

function speciesLabel(count: NearbySpeciesCount | null) {
  // No species at all usually means the area has no data rather than no birds, so don't
  // claim a zero. "0 targets" where there is data is real, though: they've seen them all.
  if (!count || count.total === 0) return "Species";
  return formatNearbySpeciesCount(count);
}

/** The map's bottom bar: what's in this map area, as a hotspot list and a species list. */
export default function MapViewControls({
  onOpenList,
  onOpenSpecies,
  hotspotCount,
  speciesCount,
  light,
}: MapViewControlsProps) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const inner = (
    <View style={[tw`flex-row items-center`, { height: MAP_VIEW_CONTROLS_HEIGHT }]}>
      <TouchableOpacity
        onPress={onOpenList}
        activeOpacity={0.7}
        accessibilityRole="button"
        style={tw`flex-1 h-full flex-row items-center justify-center gap-2 px-3`}
      >
        <Ionicons name="location-outline" size={20} color={tw.color("gray-700")} />
        <Text style={tw`text-base font-semibold text-gray-800`} numberOfLines={1}>
          {hotspotLabel(hotspotCount)}
        </Text>
      </TouchableOpacity>
      <View style={tw`w-px h-7 bg-gray-300`} />
      <TouchableOpacity
        onPress={onOpenSpecies}
        activeOpacity={0.7}
        accessibilityRole="button"
        style={tw`flex-1 h-full flex-row items-center justify-center gap-2 px-3`}
      >
        <BirdIcon size={20} color={tw.color("gray-700")} />
        <Text style={tw`text-base font-semibold text-gray-800`} numberOfLines={1}>
          {speciesLabel(speciesCount)}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (useGlass) {
    return (
      <View style={tw`rounded-full overflow-hidden`}>
        <GlassView
          style={tw`rounded-full overflow-hidden`}
          glassEffectStyle="regular"
          tintColor={light ? "rgba(255, 255, 255, 0.8)" : undefined}
        >
          {inner}
        </GlassView>
      </View>
    );
  }

  return <View style={tw`rounded-full overflow-hidden bg-white shadow-lg`}>{inner}</View>;
}
