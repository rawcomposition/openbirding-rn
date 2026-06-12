import MapListIcon from "@/components/icons/MapListIcon";
import tw from "@/lib/tw";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

type MapListTogglePillProps = {
  onPress: () => void;
};

/**
 * Bottom-center pill that opens the hotspot list scoped to the map's view.
 */
export default function MapListTogglePill({ onPress }: MapListTogglePillProps) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const content = (
    <View style={tw`flex-row items-center px-5 py-3`}>
      <MapListIcon size={20} color={tw.color("gray-700")} />
      <Text style={tw`text-base font-semibold text-gray-800 ml-2`}>List</Text>
    </View>
  );

  if (useGlass) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={tw`rounded-full overflow-hidden`}>
        <GlassView style={tw`rounded-full overflow-hidden`} glassEffectStyle="regular">
          {content}
        </GlassView>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={tw`rounded-full overflow-hidden bg-white shadow-lg`}>
      {content}
    </TouchableOpacity>
  );
}
