import tw from "@/lib/tw";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Frequencies cluster near the bottom of the 0-100 range, so a linear scale makes most
// bars unreadably short. Blend a piecewise curve (which stretches the low end) with a
// linear component so big frequencies still look big.
const FREQUENCY_POINTS = [0, 0.5, 1, 5, 10, 20, 30, 40, 60, 100];
const LINEAR_BLEND = 0.4;

function frequencyFraction(percent: number) {
  if (percent <= 0) return 0;
  const clamped = Math.min(percent, 100);
  const upper = FREQUENCY_POINTS.findIndex((p) => clamped <= p);
  const lo = FREQUENCY_POINTS[upper - 1];
  const hi = FREQUENCY_POINTS[upper];
  const t = (clamped - lo) / (hi - lo);
  const curved = (upper - 1 + t) / (FREQUENCY_POINTS.length - 1);
  return curved * (1 - LINEAR_BLEND) + (clamped / 100) * LINEAR_BLEND;
}

function formatPercent(percent: number) {
  if (percent === 0) return "0%";
  if (percent < 0.1) return "<0.1%";
  return `${percent < 1 ? percent.toFixed(1) : Math.round(percent)}%`;
}

type MonthlyBarChartProps = {
  /** Reporting frequency (%) for each of the 12 calendar months. */
  monthly: number[];
  variant?: "default" | "mini";
  /** Months (0-11) to render highlighted. Empty or omitted highlights every month. */
  selectedMonths?: number[];
  /** Describes the area the frequencies cover, e.g. "At this location". Default variant only. */
  caption?: string;
  style?: ViewStyle;
};

export default function MonthlyBarChart({ monthly, variant = "default", selectedMonths, caption, style }: MonthlyBarChartProps) {
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const rowWidth = useRef(0);
  const scrubbing = useRef(false);
  const currentMonth = new Date().getMonth();
  const isMini = variant === "mini";
  const barHeight = isMini ? 28 : 110;
  const allMonths = !selectedMonths || selectedMonths.length === 0;
  const isHighlighted = (month: number) => allMonths || selectedMonths.includes(month);

  if (isMini) {
    // The mini list charts stay monochrome so a hundred rows don't shout: every month is the
    // same light step, and only the letters mark the selected months (or the current month).
    const isMarked = (month: number) => (allMonths ? month === currentMonth : selectedMonths.includes(month));
    return (
      <View style={style}>
        <View
          style={[tw`flex-row items-end border-b border-gray-300`, { height: barHeight, gap: StyleSheet.hairlineWidth }]}
        >
          {monthly.map((value, month) => {
            const height = frequencyFraction(value) * barHeight;
            return (
              <View key={month} style={tw`flex-1 justify-end h-full`}>
                {value > 0 && (
                  <View
                    style={[
                      tw`w-full bg-gray-200 border-gray-400`,
                      { borderTopWidth: 1.5, height: Math.max(height, 2) },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
        <View style={[tw`flex-row mt-0.5`, { gap: StyleSheet.hairlineWidth }]}>
          {MONTH_INITIALS.map((initial, month) => (
            <Text
              key={month}
              style={tw.style(
                "flex-1 text-center text-[7px]",
                isMarked(month) ? "text-gray-800 font-bold" : "text-gray-400 font-normal"
              )}
            >
              {initial}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  const monthFromX = (x: number) => {
    if (rowWidth.current <= 0) return null;
    return Math.min(11, Math.max(0, Math.floor((x / rowWidth.current) * 12)));
  };

  // Horizontal-only pan so scrubbing across bars works without stealing vertical
  // scrolls from the enclosing ScrollView.
  const scrub = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .runOnJS(true)
    .onStart((e) => {
      scrubbing.current = true;
      setActiveMonth(monthFromX(e.x));
    })
    .onUpdate((e) => setActiveMonth(monthFromX(e.x)))
    .onFinalize(() => {
      scrubbing.current = false;
      setActiveMonth(null);
    });

  return (
    <View style={style}>
      <View style={tw`h-5 flex-row items-center justify-between`}>
        <Text style={tw`text-xs text-gray-500 flex-shrink`} numberOfLines={1}>
          {caption ?? ""}
        </Text>
        {activeMonth !== null && (
          <Text style={tw`text-xs font-medium text-gray-600 ml-2`}>
            {MONTH_NAMES[activeMonth]} · {formatPercent(monthly[activeMonth])}
          </Text>
        )}
      </View>
      <GestureDetector gesture={scrub}>
        <View
          style={[tw`flex-row items-end mt-1`, { gap: 5 }]}
          onLayout={(e) => (rowWidth.current = e.nativeEvent.layout.width)}
        >
          {monthly.map((value, month) => {
          const height = frequencyFraction(value) * barHeight;
          const highlighted = isHighlighted(month);
          const isCurrentMonth = month === currentMonth;
          const isActive = activeMonth === month;
          return (
            <Pressable
              key={month}
              onPressIn={() => setActiveMonth(month)}
              onPressOut={() => {
                // The pan cancels the press when it activates; don't wipe its selection.
                if (!scrubbing.current) setActiveMonth(null);
              }}
              style={tw`flex-1 items-center`}
            >
              <View style={[tw`w-full justify-end`, { height: barHeight }]}>
                <View
                  style={[
                    tw.style(
                      "w-full rounded-[3px]",
                      highlighted ? (isActive ? "bg-emerald-700" : "bg-emerald-600") : isActive ? "bg-gray-500" : "bg-gray-300"
                    ),
                    { height: Math.max(height, value > 0 ? 2 : 0) },
                  ]}
                />
              </View>
              <Text
                style={tw.style(
                  "text-[10px] mt-1.5",
                  highlighted && !allMonths
                    ? "text-emerald-700 font-bold"
                    : isCurrentMonth
                      ? "text-gray-700 font-bold"
                      : "text-gray-500 font-medium"
                )}
              >
                {MONTH_INITIALS[month]}
              </Text>
            </Pressable>
          );
          })}
        </View>
      </GestureDetector>
    </View>
  );
}
