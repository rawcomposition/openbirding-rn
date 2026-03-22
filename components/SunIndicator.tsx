import { useLocation } from "@/hooks/useLocation";
import { useSunTimes } from "@/hooks/useSunTimes";
import tw from "@/lib/tw";
import { useMapStore } from "@/stores/mapStore";
import dayjs from "dayjs";
import { BlurView } from "expo-blur";
import React, { useEffect, useMemo } from "react";
import { PixelRatio, Pressable, StyleProp, Text, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import BaseBottomSheet from "./BaseBottomSheet";
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
};

export default function SunIndicator({ style }: SunIndicatorProps) {
  const { sunrise, sunset, nextEvent, nextEventTime, timeUntilNextEvent, isLoading } = useSunTimes();
  const { location: userLocation } = useLocation();
  const mapCenter = useMapStore((state) => state.mapCenter);
  const isZoomedTooFarOut = useMapStore((state) => state.isZoomedTooFarOut);
  const isBottomSheetExpanded = useMapStore((state) => state.isBottomSheetExpanded);
  const isDetailsOpen = useMapStore((state) => state.isSunDetailsOpen);
  const setIsDetailsOpen = useMapStore((state) => state.setIsSunDetailsOpen);

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

  const opacity = useSharedValue(shouldShow ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(shouldShow ? 1 : 0, { duration: 200 });
  }, [shouldShow, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: opacity.value === 0 ? "none" : "auto",
  }));

  const formattedTime = nextEventTime ? dayjs(nextEventTime).format("h:mm A") : "";

  const IconComponent = nextEvent === "sunrise" ? SunriseIcon : SunsetIcon;
  const fontScale = PixelRatio.getFontScale();
  const scaledIconSize = Math.round(17 * fontScale);

  const baseStyle = tw`rounded-full overflow-hidden`;

  const dayProgress = useMemo(() => {
    if (!sunrise || !sunset) return 0;
    const now = new Date();
    if (now < sunrise) return 0;
    if (now > sunset) return 1;
    return (now.getTime() - sunrise.getTime()) / (sunset.getTime() - sunrise.getTime());
  }, [sunrise, sunset]);

  const isDaytime = dayProgress > 0 && dayProgress < 1;
  const totalDaylight = useMemo(() => {
    if (!sunrise || !sunset) return null;
    const diffMs = sunset.getTime() - sunrise.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  }, [sunrise, sunset]);

  const sheetContent = (
    <View style={tw`px-5 pt-1`}>
      {/* Countdown hero */}
      <View style={tw`items-center mb-4`}>
        <View style={tw`px-5 py-2 items-center w-full`}>
          <View style={tw`mb-2`}>
            {nextEvent === "sunrise" ? (
              <SunriseIcon size={32} sunColor={tw.color("orange-500")!} color={tw.color("gray-600")!} />
            ) : (
              <SunsetIcon size={32} sunColor={tw.color("orange-500")!} color={tw.color("gray-600")!} />
            )}
          </View>
          <Text style={tw`text-2xl font-bold text-gray-900`}>{timeUntilNextEvent}</Text>
          <Text style={tw`text-sm text-gray-500 mt-0.5`}>
            until {nextEvent === "sunrise" ? "sunrise" : "sunset"}
          </Text>
        </View>
      </View>

      {/* Daylight progress bar */}
      <View style={tw`mb-3`}>
        <View style={tw`flex-row justify-between mb-2`}>
          <View style={tw`flex-row items-center gap-1.5`}>
            <SunriseIcon size={16} sunColor={tw.color("orange-500")!} color={tw.color("gray-600")!} />
            <Text style={tw`text-sm font-semibold text-gray-800`}>
              {sunrise ? dayjs(sunrise).format("h:mm A") : "—"}
            </Text>
          </View>
          <View style={tw`flex-row items-center gap-1.5`}>
            <Text style={tw`text-sm font-semibold text-gray-800`}>
              {sunset ? dayjs(sunset).format("h:mm A") : "—"}
            </Text>
            <SunsetIcon size={16} sunColor={tw.color("orange-500")!} color={tw.color("gray-600")!} />
          </View>
        </View>
        <View style={tw`h-2 bg-gray-200 rounded-full overflow-hidden`}>
          <View
            style={[
              tw`h-full rounded-full`,
              {
                width: `${Math.max(dayProgress * 100, 0)}%`,
                backgroundColor: isDaytime ? tw.color("amber-400")! : tw.color("gray-300")!,
              },
            ]}
          />
        </View>
        {totalDaylight && (
          <Text style={tw`text-xs text-gray-500 text-center mt-2`}>{totalDaylight} of daylight</Text>
        )}
      </View>
    </View>
  );

  return (
    <>
      <Animated.View style={[style, animatedStyle]}>
        <Pressable onPress={() => setIsDetailsOpen(true)} style={baseStyle}>
          <BlurView tint="light" intensity={10} style={tw`flex-row items-center px-3 py-2 gap-2`}>
            <View style={[tw`absolute inset-0 bg-white/70`]} />
            <IconComponent size={scaledIconSize} sunColor={tw.color("orange-500")!} color={tw.color("gray-600")!} />
            <Text style={tw`text-[14px] font-medium text-gray-700`}>{formattedTime}</Text>
          </BlurView>
        </Pressable>
      </Animated.View>

      <BaseBottomSheet isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="Daylight" dimmed>
        {sheetContent}
      </BaseBottomSheet>
    </>
  );
}
