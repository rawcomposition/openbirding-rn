import FilterSlidersIcon from "@/components/icons/FilterSlidersIcon";
import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import React from "react";
import { Platform, Pressable, Text, TouchableOpacity, View } from "react-native";

export const HOME_SEARCH_BAR_HEIGHT = 48;

type HomeSearchBarProps = {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  onOpenFilters: () => void;
  menuBadgeCount: number;
  filterCount: number;
  light?: boolean;
};

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View
      style={tw`absolute top-1 right-0.5 min-w-4 h-4 bg-blue-500 rounded-full items-center justify-center px-1`}
      pointerEvents="none"
    >
      <Text style={tw`text-white text-[11px] font-bold`}>{count}</Text>
    </View>
  );
}

export default function HomeSearchBar({
  onOpenMenu,
  onOpenSearch,
  onOpenFilters,
  menuBadgeCount,
  filterCount,
  light,
}: HomeSearchBarProps) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const inner = (
    <View style={[tw`flex-row items-center px-1`, { height: HOME_SEARCH_BAR_HEIGHT }]}>
      <TouchableOpacity
        onPress={onOpenMenu}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        style={tw`w-11 h-11 items-center justify-center`}
      >
        <Ionicons name="menu" size={24} color={tw.color("gray-700")} />
        <Badge count={menuBadgeCount} />
      </TouchableOpacity>
      <Pressable
        onPress={onOpenSearch}
        accessibilityRole="search"
        accessibilityLabel="Search hotspots"
        style={tw`flex-1 h-11 justify-center px-1`}
      >
        <Text style={tw`text-base text-gray-600`} numberOfLines={1}>
          Search hotspots
        </Text>
      </Pressable>
      <View style={tw`w-px h-6 bg-gray-300`} />
      <TouchableOpacity
        onPress={onOpenFilters}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={filterCount > 0 ? `Filters, ${filterCount} active` : "Filters"}
        style={tw`w-11 h-11 items-center justify-center`}
      >
        <FilterSlidersIcon size={20} color={tw.color("gray-700")} />
        <Badge count={filterCount} />
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

  return <View style={tw`rounded-full bg-white shadow-lg`}>{inner}</View>;
}
