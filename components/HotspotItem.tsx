import tw from "@/lib/tw";
import { Hotspot } from "@/lib/types";
import { getSavedHotspotIconImage } from "@/lib/hotspotIconImages";
import { formatDistance, getMarkerColor } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Image, Pressable, Text, View } from "react-native";

type HotspotItemProps = {
  item: Hotspot & { distance?: number };
  onSelect: (hotspot: Hotspot & { distance?: number }) => void;
  isSaved?: boolean;
};

const HotspotItem = React.memo(
  ({ item, onSelect, isSaved = false }: HotspotItemProps) => {
    const useMiles = useSettingsStore((state) => state.distanceUnits === "imperial");
    const handlePress = useCallback(() => {
      onSelect(item);
    }, [item, onSelect]);

    return (
      // Prevent the parent list from canceling row presses after the list is reopened.
      <Pressable
        onPress={handlePress}
        cancelable={false}
        style={({ pressed }) => [tw`flex-row items-center px-4 py-3 border-b border-gray-200/50`, pressed && tw`opacity-70`]}
      >
        <View style={tw`flex-1`}>
          <Text style={tw`text-gray-900 text-base font-medium`} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={tw`flex-row items-center mt-1`}>
            {isSaved ? (
              <Image
                source={getSavedHotspotIconImage(item.species || 0)}
                style={tw`w-3.5 h-3.5 mr-2`}
                resizeMode="contain"
              />
            ) : (
              <View style={[tw`w-2.5 h-2.5 rounded-full mr-2`, { backgroundColor: getMarkerColor(item.species || 0) }]} />
            )}
            <Text style={tw`text-gray-600 text-sm`}>{item.species} species</Text>
          </View>
        </View>
        {item.distance !== undefined && (
          <Text style={tw`text-gray-500 text-sm ml-2`}>{formatDistance(item.distance, useMiles)}</Text>
        )}
        <Ionicons name="chevron-forward" size={18} color={tw.color("gray-400")} style={tw`ml-2`} />
      </Pressable>
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
      prevProps.isSaved === nextProps.isSaved &&
      prevProps.onSelect === nextProps.onSelect
    );
  }
);

HotspotItem.displayName = "HotspotItem";

export default HotspotItem;
