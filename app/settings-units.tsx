import tw from "@/lib/tw";
import { DistanceUnits, useSettingsStore } from "@/stores/settingsStore";
import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";

type OptionRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  isLast?: boolean;
};

function OptionRow({ label, selected, onPress, isLast }: OptionRowProps) {
  const borderStyle = isLast ? {} : tw`border-b border-gray-200/50`;

  return (
    <TouchableOpacity style={[tw`flex-row items-center px-4 py-3`, borderStyle]} onPress={onPress} activeOpacity={0.6}>
      <Text style={tw`text-gray-900 text-base flex-1`}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={22} color={tw.color("blue-500")} />}
    </TouchableOpacity>
  );
}

type OptionsGroupProps = {
  children: React.ReactNode;
  footer?: string;
};

function OptionsGroup({ children, footer }: OptionsGroupProps) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const cardStyle: ViewStyle = {
    borderRadius: 12,
    overflow: "hidden",
  };

  const content = useGlass ? (
    <GlassView style={cardStyle} glassEffectStyle="regular" tintColor="rgba(255, 255, 255, 0.7)">
      {children}
    </GlassView>
  ) : (
    <View style={[cardStyle, tw`bg-white`]}>{children}</View>
  );

  return (
    <View style={tw`mb-6`}>
      {content}
      {footer && <Text style={tw`text-gray-500 text-xs px-4 pt-2`}>{footer}</Text>}
    </View>
  );
}

const OPTIONS: { value: DistanceUnits; label: string }[] = [
  { value: "metric", label: "Kilometers" },
  { value: "imperial", label: "Miles" },
];

export default function UnitsPage() {
  const router = useRouter();
  const distanceUnits = useSettingsStore((state) => state.distanceUnits);
  const setDistanceUnits = useSettingsStore((state) => state.setDistanceUnits);

  const handleSelect = (units: DistanceUnits) => {
    setDistanceUnits(units);
    router.back();
  };

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-50`}
      contentContainerStyle={tw`px-4 pt-6 pb-10`}
      showsVerticalScrollIndicator={false}
    >
      <OptionsGroup>
        {OPTIONS.map((option, index) => (
          <OptionRow
            key={option.value}
            label={option.label}
            selected={distanceUnits === option.value}
            onPress={() => handleSelect(option.value)}
            isLast={index === OPTIONS.length - 1}
          />
        ))}
      </OptionsGroup>
    </ScrollView>
  );
}
