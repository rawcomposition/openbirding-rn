import { getDirections, getExternalMapProviders } from "@/lib/utils";
import tw from "@/lib/tw";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Alert, Linking, Text, TouchableOpacity, View } from "react-native";
import { ACTION_BUTTON_MIN_HEIGHT } from "./ActionButton";
import DirectionsIcon from "./icons/DirectionsIcon";

type Props = {
  latitude: number;
  longitude: number;
  stacked?: boolean;
};

export default function DirectionsMenuButton({ latitude, longitude, stacked = false }: Props) {
  const { showActionSheetWithOptions } = useActionSheet();
  const providers = getExternalMapProviders();

  const openWithProvider = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    const providerName = provider?.name || providerId;
    const url = getDirections(providerId, latitude, longitude);
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", `Could not open ${providerName}`);
    });
  };

  const handlePress = () => {
    const options = [...providers.map((p) => p.name), "Cancel"];
    const cancelButtonIndex = options.length - 1;
    showActionSheetWithOptions(
      {
        title: "Get Directions",
        options,
        cancelButtonIndex,
      },
      (selectedIndex) => {
        if (selectedIndex == null || selectedIndex === cancelButtonIndex) return;
        openWithProvider(providers[selectedIndex].id);
      }
    );
  };

  return (
    <View
      style={[
        tw`w-full rounded-full`,
        stacked
          ? { minHeight: ACTION_BUTTON_MIN_HEIGHT }
          : { height: ACTION_BUTTON_MIN_HEIGHT, overflow: "hidden" },
      ]}
    >
      <TouchableOpacity onPress={handlePress} style={stacked ? tw`w-full` : tw`flex-1`}>
        <View
          style={[
            tw`w-full flex-row items-center justify-center px-3 bg-gray-50 rounded-full`,
            stacked
              ? { minHeight: ACTION_BUTTON_MIN_HEIGHT, paddingVertical: 12 }
              : { height: ACTION_BUTTON_MIN_HEIGHT },
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
      </TouchableOpacity>
    </View>
  );
}
