import { getPlaceIconImage } from "@/lib/placeIconImages";
import tw from "@/lib/tw";
import { SavedPlace } from "@/lib/types";
import { formatDistance } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Image, Pressable, Text, View } from "react-native";

type PlaceItemProps = {
  item: SavedPlace & { distance?: number };
  onSelect: (place: SavedPlace & { distance?: number }) => void;
};

const PlaceItem = React.memo(
  ({ item, onSelect }: PlaceItemProps) => {
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
            <Image source={getPlaceIconImage(item.icon)} style={tw`w-3.5 h-3.5 mr-2`} resizeMode="contain" />
            <Text style={tw`text-gray-600 text-sm`}>{item.notes ? item.notes : "Saved Pin"}</Text>
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
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.lat === nextProps.item.lat &&
      prevProps.item.lng === nextProps.item.lng &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.icon === nextProps.item.icon &&
      prevProps.item.notes === nextProps.item.notes &&
      prevProps.item.distance === nextProps.item.distance &&
      prevProps.onSelect === nextProps.onSelect
    );
  }
);

PlaceItem.displayName = "PlaceItem";

export default PlaceItem;
