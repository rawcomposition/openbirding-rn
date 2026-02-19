import { useLocation } from "@/hooks/useLocation";
import { useSunTimes } from "@/hooks/useSunTimes";
import tw from "@/lib/tw";
import { useMapStore } from "@/stores/mapStore";
import dayjs from "dayjs";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleProp, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import InfoModal from "./InfoModal";
import SunriseIcon from "./icons/SunriseIcon";
import SunsetIcon from "./icons/SunsetIcon";

const MAX_DISTANCE_KM = 100;

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type SunIndicatorProps = {
  style?: StyleProp<ViewStyle>;
  light?: boolean;
};

export default function SunIndicator({ style, light }: SunIndicatorProps) {
  const [showModal, setShowModal] = useState(false);
  const { sunrise, sunset, nextEvent, nextEventTime, timeUntilNextEvent, isLoading } = useSunTimes();
  const { location: userLocation } = useLocation();
  const mapCenter = useMapStore((state) => state.mapCenter);
  const isZoomedTooFarOut = useMapStore((state) => state.isZoomedTooFarOut);
  const isBottomSheetExpanded = useMapStore((state) => state.isBottomSheetExpanded);

  const isTooFarFromUser = useMemo(() => {
    if (!userLocation || !mapCenter) return false;
    const distance = getDistanceKm(userLocation.lat, userLocation.lng, mapCenter.lat, mapCenter.lng);
    return distance > MAX_DISTANCE_KM;
  }, [userLocation, mapCenter]);

  const shouldShow = !!(
    nextEvent &&
    nextEventTime &&
    !isLoading &&
    !isTooFarFromUser &&
    !isZoomedTooFarOut &&
    !isBottomSheetExpanded
  );

  // Keep component mounted, animate opacity instead of unmounting.
  // This prevents GlassView from needing to reinitialize its effect which sometimes causes issues.
  const opacity = useSharedValue(shouldShow ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(shouldShow ? 1 : 0, { duration: 200 });
  }, [shouldShow, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: opacity.value === 0 ? "none" : "auto",
  }));

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
      <Animated.View style={[style, animatedStyle]}>
        {useGlass ? (
          <Pressable onPress={() => setShowModal(true)} style={baseStyle}>
            <GlassView style={baseStyle} glassEffectStyle="clear" tintColor={light ? "white" : undefined} isInteractive>
              {pillContent}
            </GlassView>
          </Pressable>
        ) : (
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            activeOpacity={0.8}
            style={[baseStyle, tw`bg-white/90 shadow-md`]}
          >
            {pillContent}
          </TouchableOpacity>
        )}
      </Animated.View>

      <InfoModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="Daylight Times"
        content={modalContent}
      />
    </>
  );
}
