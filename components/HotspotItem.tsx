import tw from "@/lib/tw";
import { Hotspot } from "@/lib/types";
import { getMarkerColor } from "@/lib/utils";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Text, TouchableOpacity, View } from "react-native";

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

type HotspotItemProps = {
  item: Hotspot & { distance?: number };
  onSelect: (hotspot: Hotspot & { distance?: number }) => void;
};

const HotspotItem = React.memo(
  ({ item, onSelect }: HotspotItemProps) => {
    const handlePress = useCallback(() => {
      onSelect(item);
    }, [item, onSelect]);

    return (
      <TouchableOpacity
        onPress={handlePress}
        style={tw`flex-row items-center px-4 py-3 border-b border-gray-200/50`}
        activeOpacity={0.7}
      >
        <View style={tw`flex-1`}>
          <Text style={tw`text-gray-900 text-base font-medium`} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={tw`flex-row items-center mt-1`}>
            <View style={[tw`w-2.5 h-2.5 rounded-full mr-2`, { backgroundColor: getMarkerColor(item.species || 0) }]} />
            <Text style={tw`text-gray-600 text-sm`}>{item.species} species</Text>
          </View>
        </View>
        {item.distance !== undefined && (
          <Text style={tw`text-gray-500 text-sm ml-2`}>{formatDistance(item.distance, item.country)}</Text>
        )}
        <Ionicons name="chevron-forward" size={18} color={tw.color("gray-400")} style={tw`ml-2`} />
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item.lat === nextProps.item.lat &&
      prevProps.item.lng === nextProps.item.lng &&
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.species === nextProps.item.species &&
      prevProps.item.distance === nextProps.item.distance &&
      prevProps.item.country === nextProps.item.country &&
      prevProps.onSelect === nextProps.onSelect
    );
  }
);

HotspotItem.displayName = "HotspotItem";

export default HotspotItem;
