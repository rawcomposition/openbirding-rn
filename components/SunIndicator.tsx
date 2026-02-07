import { useSunTimes } from "@/hooks/useSunTimes";
import tw from "@/lib/tw";
import dayjs from "dayjs";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import React, { useState } from "react";
import { Platform, StyleProp, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import InfoModal from "./InfoModal";
import SunriseIcon from "./icons/SunriseIcon";
import SunsetIcon from "./icons/SunsetIcon";

type SunIndicatorProps = {
  style?: StyleProp<ViewStyle>;
  light?: boolean;
};

export default function SunIndicator({ style, light }: SunIndicatorProps) {
  const [showModal, setShowModal] = useState(false);
  const { sunrise, sunset, nextEvent, nextEventTime, timeUntilNextEvent, isLoading } = useSunTimes();

  // Don't render if no data available
  if (!nextEvent || !nextEventTime || isLoading) return null;

  const formattedTime = dayjs(nextEventTime).format("h:mm A");
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const IconComponent = nextEvent === "sunrise" ? SunriseIcon : SunsetIcon;

  const pillContent = (
    <View style={tw`flex-row items-center px-3 py-2 gap-2`}>
      <IconComponent size={17} sunColor={tw.color("orange-500")!} color={tw.color("gray-600")!} />
      <Text style={tw`text-[14px] font-medium text-gray-700`}>{formattedTime}</Text>
    </View>
  );

  const baseStyle = tw`rounded-full overflow-hidden`;
  const fallbackStyle = [baseStyle, tw`bg-white/90 shadow-md`, style];

  const modalContent = (
    <View>
      <Text style={tw`text-base text-center text-gray-700 mb-1.5`}>
        {nextEvent === "sunrise" ? "Sunrise" : "Sunset"} in {timeUntilNextEvent}
      </Text>
      <Text style={tw`text-center text-gray-600 text-xs mb-4`}>Based on your current location</Text>
      <View style={tw`gap-3`}>
        <View style={tw`flex-row items-center`}>
          <SunriseIcon size={24} sunColor={tw.color("orange-500")!} color={tw.color("gray-600")!} />
          <Text style={tw`ml-3 text-base text-gray-800`}>
            Sunrise: {sunrise ? dayjs(sunrise).format("h:mm A") : "—"}
          </Text>
        </View>
        <View style={tw`flex-row items-center`}>
          <SunsetIcon size={24} sunColor={tw.color("orange-500")!} color={tw.color("gray-600")!} />
          <Text style={tw`ml-3 text-base text-gray-800`}>Sunset: {sunset ? dayjs(sunset).format("h:mm A") : "—"}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      {useGlass ? (
        <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.8} style={[baseStyle, style]}>
          <GlassView style={baseStyle} glassEffectStyle="regular" tintColor={light ? "white" : undefined}>
            {pillContent}
          </GlassView>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.8} style={fallbackStyle}>
          {pillContent}
        </TouchableOpacity>
      )}

      <InfoModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="Daylight Times"
        content={modalContent}
      />
    </>
  );
}
