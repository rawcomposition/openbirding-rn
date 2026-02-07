import tw from "@/lib/tw";
import { getExternalMapProviders } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Href, useRouter } from "expo-router";
import React from "react";
import { Alert, Linking, Platform, ScrollView, Switch, Text, TouchableOpacity, View, ViewStyle } from "react-native";

type SettingsIconProps =
  | { family?: "ionicons"; name: keyof typeof Ionicons.glyphMap; bgColor: string }
  | { family: "fontawesome5"; name: keyof typeof FontAwesome5.glyphMap; bgColor: string };

function SettingsIcon(props: SettingsIconProps) {
  const { bgColor, name } = props;
  const family = "family" in props ? props.family : "ionicons";

  return (
    <View style={[tw`w-7 h-7 rounded-md items-center justify-center mr-3`, { backgroundColor: bgColor }]}>
      {family === "fontawesome5" ? (
        <FontAwesome5 name={name as keyof typeof FontAwesome5.glyphMap} size={16} color="white" />
      ) : (
        <Ionicons name={name as keyof typeof Ionicons.glyphMap} size={18} color="white" />
      )}
    </View>
  );
}

type SettingsRowProps = {
  label: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
  icon?: SettingsIconProps | undefined;
};

function SettingsRow({ label, value, onPress, isLast, icon }: SettingsRowProps) {
  const borderStyle = isLast ? {} : tw`border-b border-gray-200/50`;

  return (
    <TouchableOpacity style={[tw`flex-row items-center px-4 py-3`, borderStyle]} onPress={onPress} activeOpacity={0.6}>
      {icon && <SettingsIcon {...icon} />}
      <Text style={tw`text-gray-900 text-base flex-1`}>{label}</Text>
      {value && <Text style={tw`text-gray-500 text-base mr-1`}>{value}</Text>}
      <Ionicons name="chevron-forward" size={20} color={tw.color("gray-400")} />
    </TouchableOpacity>
  );
}

type SettingsToggleRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
  icon?: SettingsIconProps;
};

function SettingsToggleRow({ label, value, onValueChange, isLast, icon }: SettingsToggleRowProps) {
  const borderStyle = isLast ? {} : tw`border-b border-gray-200/50`;

  return (
    <View style={[tw`flex-row items-center px-4 py-3`, borderStyle]}>
      {icon && <SettingsIcon {...icon} />}
      <Text style={tw`text-gray-900 text-base flex-1`}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

type SettingsGroupProps = {
  children: React.ReactNode;
  header?: string;
  footer?: string;
};

function SettingsGroup({ children, header, footer }: SettingsGroupProps) {
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
      {header && <Text style={tw`text-gray-500 text-xs uppercase px-4 pb-2 font-medium tracking-wide`}>{header}</Text>}
      {content}
      {footer && <Text style={tw`text-gray-500 text-xs px-4 pt-2`}>{footer}</Text>}
    </View>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const directionsProvider = useSettingsStore((state) => state.directionsProvider);
  const lifelist = useSettingsStore((state) => state.lifelist);
  const lifelistExclusions = useSettingsStore((state) => state.lifelistExclusions);
  const disableSunTimes = useSettingsStore((state) => state.disableSunTimes);
  const setDisableSunTimes = useSettingsStore((state) => state.setDisableSunTimes);
  const providers = getExternalMapProviders();

  const getProviderName = (providerId: string | null) => {
    if (!providerId) return "Always Ask";
    const provider = providers.find((p) => p.id === providerId);
    return provider?.name || "Always Ask";
  };

  const handlePrivacyPolicyPress = async () => {
    const url = "https://openbirding.org/privacy-policy";
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const handleContactPress = async () => {
    const email = "adam@openbirding.org";
    const subject = encodeURIComponent("OpenBirding App Feedback");
    const url = `mailto:${email}?subject=${subject}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Feedback", "Send feedback to adam@openbirding.org");
    }
  };

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-100`}
      contentContainerStyle={tw`px-4 pt-6 pb-10`}
      showsVerticalScrollIndicator={false}
    >
      <SettingsGroup header="Navigation">
        <SettingsRow
          label="Directions App"
          value={getProviderName(directionsProvider)}
          onPress={() => router.push("/settings-map-provider" as Href)}
          icon={{ name: "car", bgColor: "#007AFF" }}
          isLast
        />
      </SettingsGroup>

      <SettingsGroup header="Map Display">
        <SettingsToggleRow
          label="Show Sunrise/Sunset"
          value={!disableSunTimes}
          onValueChange={(value) => setDisableSunTimes(!value)}
          icon={{ name: "sunny", bgColor: "#FF9500" }}
          isLast
        />
      </SettingsGroup>

      <SettingsGroup header="Life List">
        <SettingsRow
          label="View Life List"
          value={lifelist?.length ? `${lifelist.length} species` : undefined}
          onPress={() => router.push("/settings-view-life-list" as Href)}
          icon={{ family: "fontawesome5", name: "feather", bgColor: "#34C759" }}
        />
        <SettingsRow
          label="Life List Exclusions"
          value={lifelistExclusions?.length ? `${lifelistExclusions.length} species` : undefined}
          onPress={() => router.push("/settings-life-list-exclusions" as Href)}
          icon={{ name: "eye-off", bgColor: "#FF9500" }}
        />
        <SettingsRow
          label="Import Life List"
          onPress={() => router.push("/settings-import-life-list" as Href)}
          icon={{ name: "cloud-upload", bgColor: "#5856D6" }}
          isLast
        />
      </SettingsGroup>

      <SettingsGroup header="Support">
        <SettingsRow label="Privacy Policy" onPress={handlePrivacyPolicyPress} />
        <SettingsRow label="Feedback" onPress={handleContactPress} isLast />
      </SettingsGroup>

      <View style={tw`items-center mt-4`}>
        <Text style={tw`text-gray-400 text-xs`}>
          Version {Constants.expoConfig?.version || "Unknown"}
          {Constants.nativeBuildVersion && ` (${Constants.nativeBuildVersion})`}
        </Text>
      </View>
    </ScrollView>
  );
}
