import tw from "@/lib/tw";
import { ReactNode, useEffect } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

/** Wraps skeleton shapes in a shared pulse so every piece fades in sync. */
export function SkeletonPulse({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.45, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

// Fixed heights so the fake mini charts look organic without using randomness.
const SKELETON_BAR_HEIGHTS = [8, 12, 17, 23, 26, 22, 16, 20, 25, 18, 12, 9];
const SKELETON_NAME_WIDTHS = ["w-40", "w-32", "w-44", "w-36", "w-28", "w-40", "w-34", "w-38"];

/** Placeholder for the Nearby Species / targets list while data loads. */
export function TargetRowsSkeleton({ rows = 7, style }: { rows?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <SkeletonPulse style={style}>
      <View style={tw`w-56 h-7 bg-gray-200 rounded-full`} />
      <View style={tw`mt-1`}>
        {Array.from({ length: rows }).map((_, row) => (
          <View key={row} style={tw`flex-row items-center py-3`}>
            <View style={tw`w-20 h-15 rounded bg-gray-200 mr-3`} />
            <View style={tw`flex-1`}>
              <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`${SKELETON_NAME_WIDTHS[row % SKELETON_NAME_WIDTHS.length]} h-3.5 rounded bg-gray-200`} />
                <View style={tw`w-8 h-3 rounded bg-gray-200`} />
              </View>
              <View style={[tw`flex-row items-end mt-2`, { height: 28, gap: 2 }]}>
                {SKELETON_BAR_HEIGHTS.map((height, i) => (
                  <View
                    key={i}
                    style={[tw`flex-1 rounded-[3px] bg-gray-200`, { height: height + ((row * 5 + i * 3) % 7) }]}
                  />
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

/** Placeholder for the hotspot rows on the species detail page. */
export function HotspotRowsSkeleton({ rows = 4, style }: { rows?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <SkeletonPulse style={style}>
      <View style={tw`bg-white border border-gray-200/80 rounded-2xl overflow-hidden`}>
        {Array.from({ length: rows }).map((_, row) => (
          <View key={row}>
            {row > 0 && <View style={tw`h-px bg-gray-100 ml-4`} />}
            <View style={tw`px-4 py-3.5`}>
              <View style={tw`${SKELETON_NAME_WIDTHS[(row + 2) % SKELETON_NAME_WIDTHS.length]} h-3.5 rounded bg-gray-200`} />
              <View style={tw`w-28 h-3 rounded bg-gray-200 mt-2`} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

/** Placeholder for the seasonality chart card on the species detail page. */
export function ChartCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <SkeletonPulse style={style}>
      <View style={tw`bg-white border border-gray-200/80 rounded-2xl px-4 pt-8 pb-4`}>
        <View style={[tw`flex-row items-end`, { height: 110, gap: 5 }]}>
          {SKELETON_BAR_HEIGHTS.map((height, i) => (
            <View key={i} style={[tw`flex-1 rounded-md bg-gray-200`, { height: height * 3.5 }]} />
          ))}
        </View>
        <View style={[tw`flex-row mt-2`, { gap: 5 }]}>
          {SKELETON_BAR_HEIGHTS.map((_, i) => (
            <View key={i} style={tw`flex-1 items-center`}>
              <View style={tw`w-2 h-2 rounded bg-gray-200`} />
            </View>
          ))}
        </View>
      </View>
    </SkeletonPulse>
  );
}
