import tw from "@/lib/tw";
import { useState } from "react";
import { Pressable, Text, View, ViewStyle } from "react-native";

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

// Subtle gray/blue bars; the current calendar month gets the one saturated color so
// "what's around right now" pops without the whole chart shouting.
function barColor(opts: { highlighted: boolean; isCurrentMonth: boolean; isActive?: boolean }) {
  if (opts.isCurrentMonth) {
    if (!opts.highlighted) return "bg-sky-300";
    return opts.isActive ? "bg-sky-700" : "bg-sky-600";
  }
  if (!opts.highlighted) return opts.isActive ? "bg-gray-300" : "bg-gray-200";
  return opts.isActive ? "bg-slate-500" : "bg-slate-400";
}

type MonthlyBarChartProps = {
  /** Reporting frequency (%) for each of the 12 calendar months. */
  monthly: number[];
  variant?: "default" | "mini";
  /** Months (0-11) to render highlighted. Empty or omitted highlights every month. */
  selectedMonths?: number[];
  style?: ViewStyle;
};

export default function MonthlyBarChart({ monthly, variant = "default", selectedMonths, style }: MonthlyBarChartProps) {
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const currentMonth = new Date().getMonth();
  const isMini = variant === "mini";
  const barHeight = isMini ? 28 : 110;
  const allMonths = !selectedMonths || selectedMonths.length === 0;
  const isHighlighted = (month: number) => allMonths || selectedMonths.includes(month);

  if (isMini) {
    return (
      <View style={style}>
        <View style={[tw`flex-row items-end`, { height: barHeight, gap: 2 }]}>
          {monthly.map((value, month) => {
            const height = frequencyFraction(value) * barHeight;
            return (
              <View key={month} style={tw`flex-1 justify-end h-full`}>
                <View
                  style={[
                    tw.style(
                      "w-full rounded-[3px]",
                      barColor({ highlighted: isHighlighted(month), isCurrentMonth: month === currentMonth })
                    ),
                    { height: Math.max(height, value > 0 ? 2 : 0) },
                  ]}
                />
              </View>
            );
          })}
        </View>
        <View style={[tw`flex-row mt-0.5`, { gap: 2 }]}>
          {MONTH_INITIALS.map((initial, month) => (
            <Text
              key={month}
              style={tw.style(
                "flex-1 text-center text-[7px]",
                month === currentMonth ? "text-sky-600 font-semibold" : "text-gray-400 font-normal"
              )}
            >
              {initial}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={style}>
      <View style={tw`h-5 items-center justify-center`}>
        {activeMonth !== null && (
          <Text style={tw`text-xs font-medium text-gray-600`}>
            {MONTH_NAMES[activeMonth]} · {formatPercent(monthly[activeMonth])}
          </Text>
        )}
      </View>
      <View style={[tw`flex-row items-end mt-1`, { gap: 5 }]}>
        {monthly.map((value, month) => {
          const height = frequencyFraction(value) * barHeight;
          const highlighted = isHighlighted(month);
          const isCurrentMonth = month === currentMonth;
          const isActive = activeMonth === month;
          return (
            <Pressable
              key={month}
              onPress={() => setActiveMonth(isActive ? null : month)}
              style={tw`flex-1 items-center`}
            >
              <View style={[tw`w-full justify-end`, { height: barHeight }]}>
                <View
                  style={[
                    tw.style("w-full rounded-md", barColor({ highlighted, isCurrentMonth, isActive })),
                    { height: Math.max(height, value > 0 ? 2 : 0) },
                  ]}
                />
              </View>
              <Text
                style={tw.style(
                  "text-[10px] mt-1.5",
                  isCurrentMonth
                    ? "text-sky-700 font-bold"
                    : highlighted && !allMonths
                      ? "text-slate-700 font-bold"
                      : "text-gray-500 font-medium"
                )}
              >
                {MONTH_INITIALS[month]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
