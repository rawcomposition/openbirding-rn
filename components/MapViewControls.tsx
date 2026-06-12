import FilterSlidersIcon from "@/components/icons/FilterSlidersIcon";
import tw from "@/lib/tw";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

type MapViewControlsProps = {
  onOpenFilters: () => void;
  onOpenList: () => void;
  filterCount: number;
};

/**
 * Bottom-center segmented control pairing the two actions that act on the
 * current view: open the filter sheet (with an active-filter badge) and open
 * the viewport-scoped list. Connected with a hairline divider.
 */
export default function MapViewControls({ onOpenFilters, onOpenList, filterCount }: MapViewControlsProps) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const inner = (
    <View style={tw`flex-row items-center`}>
      <TouchableOpacity onPress={onOpenFilters} activeOpacity={0.7} style={tw`flex-row items-center pl-5 pr-4 py-3`}>
        <FilterSlidersIcon size={20} color={tw.color("gray-700")} />
        {filterCount > 0 && (
          <View style={tw`ml-2 px-2 py-0.5 rounded-full bg-blue-500`}>
            <Text style={tw`text-white text-xs font-bold`}>{filterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={tw`w-px h-6 bg-gray-300`} />
      <TouchableOpacity onPress={onOpenList} activeOpacity={0.7} style={tw`flex-row items-center pl-4 pr-5 py-3`}>
        <Text style={tw`text-base font-semibold text-gray-800`}>List</Text>
      </TouchableOpacity>
    </View>
  );

  if (useGlass) {
    return (
      <View style={tw`rounded-full overflow-hidden`}>
        <GlassView style={tw`rounded-full overflow-hidden`} glassEffectStyle="regular">
          {inner}
        </GlassView>
      </View>
    );
  }

  return <View style={tw`rounded-full overflow-hidden bg-white shadow-lg`}>{inner}</View>;
}
