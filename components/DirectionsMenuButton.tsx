import { getDirections, getExternalMapProviders } from "@/lib/utils";
import tw from "@/lib/tw";
import { useSettingsStore } from "@/stores/settingsStore";
import { Host, Button, Menu, Section, RNHostView } from "@expo/ui/swift-ui";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import DirectionsIcon from "./icons/DirectionsIcon";

type Props = {
  latitude: number;
  longitude: number;
};

export default function DirectionsMenuButton({ latitude, longitude }: Props) {
  const directionsProvider = useSettingsStore((state) => state.directionsProvider);
  const providers = getExternalMapProviders();
  const hasSavedProvider = !!directionsProvider && directionsProvider !== "";

  const openWithProvider = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    const providerName = provider?.name || providerId;
    const url = getDirections(providerId, latitude, longitude);
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", `Could not open ${providerName}`);
    });
  };

  const buttonContent = (
    <View style={tw`flex-row items-center justify-center p-3 bg-gray-50 rounded-full`}>
      <DirectionsIcon color={tw.color("orange-600/90")} size={20} />
      <Text style={tw`text-gray-700 text-base font-medium ml-3`}>Get Directions</Text>
    </View>
  );

  // No saved provider — any tap shows the menu
  if (!hasSavedProvider) {
    return (
      <Host style={tw`flex-1`}>
        <Menu
          label={
            <RNHostView matchContents>
              {buttonContent}
            </RNHostView>
          }
        >
          <Section>
            {providers.map((provider) => (
              <Button
                key={provider.id}
                label={provider.name}
                onPress={() => openWithProvider(provider.id)}
              />
            ))}
          </Section>
        </Menu>
      </Host>
    );
  }

  // Saved provider — tap opens map directly, long press shows menu
  return (
    <Pressable
      onPress={() => openWithProvider(directionsProvider)}
      style={({ pressed }) => [tw`flex-1`, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Host matchContents pointerEvents="none">
        <Menu
          label={
            <RNHostView matchContents>
              {buttonContent}
            </RNHostView>
          }
        >
          <Section>
            {providers.map((provider) => (
              <Button
                key={provider.id}
                label={provider.name}
                onPress={() => openWithProvider(provider.id)}
              />
            ))}
          </Section>
        </Menu>
      </Host>
    </Pressable>
  );
}
