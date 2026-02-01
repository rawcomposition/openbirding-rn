import GoogleMapsIcon from "@/components/icons/GoogleMapsIcon";
import OrganicMapsIcon from "@/components/icons/OrganicMapsIcon";
import QuestionMarkIcon from "@/components/icons/QuestionMarkIcon";
import WazeIcon from "@/components/icons/WazeIcon";
import tw from "@/lib/tw";
import { getExternalMapProviders } from "@/lib/utils";
import { useDefaultMapProviderStore } from "@/stores/defaultMapProviderStore";
import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";

type OptionRowProps = {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onPress: () => void;
  isLast?: boolean;
};

function OptionRow({ icon, label, selected, onPress, isLast }: OptionRowProps) {
  const borderStyle = isLast ? {} : tw`border-b border-gray-200/50`;

  return (
    <TouchableOpacity
      style={[tw`flex-row items-center px-4 py-3`, borderStyle]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={tw`w-8 h-8 items-center justify-center mr-3`}>{icon}</View>
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

export default function MapProviderPage() {
  const router = useRouter();
  const defaultProvider = useDefaultMapProviderStore((state) => state.defaultProvider);
  const setDefaultProvider = useDefaultMapProviderStore((state) => state.setDefaultProvider);
  const providers = getExternalMapProviders();

  const renderProviderIcon = (providerId: string) => {
    switch (providerId) {
      case "google":
        return <GoogleMapsIcon size={24} />;
      case "apple":
        return <Ionicons name="logo-apple" size={26} color={tw.color("gray-800")} />;
      case "organic":
        return <OrganicMapsIcon size={28} />;
      case "waze":
        return <WazeIcon size={26} />;
      default:
        return <Ionicons name="map" size={24} color={tw.color("gray-500")} />;
    }
  };

  const handleSelect = (providerId: string) => {
    setDefaultProvider(providerId);
    router.back();
  };

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-100`}
      contentContainerStyle={tw`px-4 pt-6 pb-10`}
      showsVerticalScrollIndicator={false}
    >
      <OptionsGroup footer="Select the app that will open when you tap 'Get Directions' on a hotspot.">
        {providers.map((provider, index) => (
          <OptionRow
            key={provider.id}
            icon={renderProviderIcon(provider.id)}
            label={provider.name}
            selected={defaultProvider === provider.id}
            onPress={() => handleSelect(provider.id)}
            isLast={index === providers.length - 1 && !!defaultProvider}
          />
        ))}
        <OptionRow
          icon={<QuestionMarkIcon size={24} color={tw.color("gray-600")} />}
          label="Always Ask"
          selected={!defaultProvider}
          onPress={() => handleSelect("")}
          isLast
        />
      </OptionsGroup>
    </ScrollView>
  );
}
