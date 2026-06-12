import tw from "@/lib/tw";
import { useFiltersStore } from "@/stores/filtersStore";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Switch, Text, View } from "react-native";

type TargetRichHotspotControlsProps = {
  hasLifeList: boolean;
};

const PERCENT_STEP = 10;
const MIN_PERCENT = 10;

function StepperButton({
  icon,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        tw`w-9 h-9 rounded-full items-center justify-center border border-gray-300`,
        disabled && tw`opacity-40`,
        pressed && !disabled && tw`bg-gray-100`,
      ]}
    >
      <Ionicons name={icon} size={20} color={tw.color("gray-700")} />
    </Pressable>
  );
}

export default function TargetRichHotspotControls({
  hasLifeList,
}: TargetRichHotspotControlsProps) {
  const enabled = useFiltersStore((state) => state.targetRichEnabled);
  const setEnabled = useFiltersStore((state) => state.setTargetRichEnabled);
  const minCount = useFiltersStore((state) => state.minTargets);
  const setMinCount = useFiltersStore((state) => state.setMinTargets);
  const minPercent = useFiltersStore((state) => state.minTargetFrequency);
  const setMinPercent = useFiltersStore((state) => state.setMinTargetFrequency);

  // Snap to clean tens as the user steps, so values stay 0/10/20/… even if a
  // legacy stored value (e.g. 12) was off the grid.
  const stepPercent = (delta: number) => {
    const base = Math.round(minPercent / PERCENT_STEP) * PERCENT_STEP;
    setMinPercent(Math.min(100, Math.max(MIN_PERCENT, base + delta)));
  };

  return (
    <View style={tw`gap-3`}>
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-1 pr-4`}>
          <Text style={tw`text-base font-medium text-gray-900`}>Target-Rich Hotspots</Text>
        </View>
        <Switch disabled={!hasLifeList} value={hasLifeList && enabled} onValueChange={setEnabled} />
      </View>

      {!hasLifeList ? (
        <Text style={tw`text-sm text-gray-500`}>Import a life list to enable this filter.</Text>
      ) : enabled ? (
        <View style={tw`bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 gap-4`}>
          <View style={tw`flex-row items-center justify-between`}>
            <Text style={tw`text-base text-gray-900 flex-1 pr-4`}>Minimum targets</Text>
            <View style={tw`flex-row items-center gap-3`}>
              <StepperButton icon="remove" onPress={() => setMinCount(minCount - 1)} disabled={minCount <= 1} />
              <Text style={tw`text-base font-semibold text-gray-900 w-12 text-center`}>{minCount}</Text>
              <StepperButton icon="add" onPress={() => setMinCount(minCount + 1)} />
            </View>
          </View>

          <View style={tw`flex-row items-center justify-between`}>
            <Text style={tw`text-base text-gray-900 flex-1 pr-4`}>Minimum frequency</Text>
            <View style={tw`flex-row items-center gap-3`}>
              <StepperButton icon="remove" onPress={() => stepPercent(-PERCENT_STEP)} disabled={minPercent <= MIN_PERCENT} />
              <Text style={tw`text-base font-semibold text-gray-900 w-12 text-center`}>{minPercent}%</Text>
              <StepperButton icon="add" onPress={() => stepPercent(PERCENT_STEP)} disabled={minPercent >= 100} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
