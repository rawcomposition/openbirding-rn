import { getDirections, getExternalMapProviders } from "@/lib/utils";
import tw from "@/lib/tw";
import { Alert, Linking, Text, View } from "react-native";
import { PopoverPlacement } from "react-native-popover-view";
import { ACTION_BUTTON_MIN_HEIGHT } from "./ActionButton";
import { FloatingMenuSection } from "./FloatingMenu";
import { FloatingMenuTrigger } from "./FloatingMenuProvider";
import DirectionsIcon from "./icons/DirectionsIcon";

type Props = {
  latitude: number;
  longitude: number;
  stacked?: boolean;
};

export default function DirectionsMenuButton({ latitude, longitude, stacked = false }: Props) {
  const providers = getExternalMapProviders();

  const openWithProvider = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    const providerName = provider?.name || providerId;
    const url = getDirections(providerId, latitude, longitude);
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", `Could not open ${providerName}`);
    });
  };

  const sections: FloatingMenuSection[] = [
    {
      items: providers.map((provider) => ({
        label: provider.name,
        onPress: () => openWithProvider(provider.id),
      })),
    },
  ];

  const buttonContent = (
    <View
      style={[
        tw`w-full flex-row items-center justify-center px-3 bg-gray-50 rounded-full`,
        stacked ? { minHeight: ACTION_BUTTON_MIN_HEIGHT, paddingVertical: 12 } : { height: ACTION_BUTTON_MIN_HEIGHT },
      ]}
    >
      <DirectionsIcon color={tw.color("orange-600/90")} size={20} />
      <Text
        numberOfLines={stacked ? 2 : 1}
        style={[tw`text-gray-700 text-base font-medium ml-3`, { flexShrink: 1, textAlign: "center" }]}
      >
        Get Directions
      </Text>
    </View>
  );

  return (
    <View
      style={[
        tw`w-full rounded-full`,
        // In the horizontal row, keep the directions button from briefly rendering too large
        // when switching to a newly loaded hotspot. In stacked large-text mode, let the label
        // grow naturally so the icon and text stay centered.
        stacked
          ? { minHeight: ACTION_BUTTON_MIN_HEIGHT }
          : { height: ACTION_BUTTON_MIN_HEIGHT, overflow: "hidden" },
      ]}
    >
      <FloatingMenuTrigger
        sections={sections}
        touchableStyle={stacked ? tw`w-full` : tw`flex-1`}
        placementOverride={PopoverPlacement.BOTTOM}
      >
        {buttonContent}
      </FloatingMenuTrigger>
    </View>
  );
}
