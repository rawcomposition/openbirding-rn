import { getDirections, getExternalMapProviders } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useCallback } from "react";
import { Alert, findNodeHandle, Linking } from "react-native";

export type DirectionsCoordinates = {
  latitude: number;
  longitude: number;
};

type DirectionsOptions = {
  coordinates: DirectionsCoordinates;
  anchorRef?: React.RefObject<any>;
};

export function useDirections() {
  const directionsProvider = useSettingsStore((state) => state.directionsProvider);
  const { showActionSheetWithOptions } = useActionSheet();

  const showProviderPicker = useCallback(
    ({ coordinates, anchorRef }: DirectionsOptions) => {
      const providers = getExternalMapProviders();
      const options = [...providers.map((provider) => provider.name), "Cancel"];
      const cancelButtonIndex = options.length - 1;
      const anchor = anchorRef?.current ? findNodeHandle(anchorRef.current) : undefined;

      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: "Choose Map Provider",
          anchor: anchor ?? undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === undefined || buttonIndex >= providers.length) return;
          const selectedProvider = providers[buttonIndex];
          const url = getDirections(selectedProvider.id, coordinates.latitude, coordinates.longitude);
          Linking.openURL(url).catch(() => {
            Alert.alert("Error", `Could not open ${selectedProvider.name}`);
          });
        }
      );
    },
    [showActionSheetWithOptions]
  );

  const openDirections = useCallback(
    ({ coordinates, anchorRef }: DirectionsOptions) => {
      if (directionsProvider && directionsProvider !== "") {
        const providers = getExternalMapProviders();
        const provider = providers.find((p) => p.id === directionsProvider);
        const providerName = provider?.name || directionsProvider;
        const url = getDirections(directionsProvider, coordinates.latitude, coordinates.longitude);
        Linking.openURL(url).catch(() => {
          Alert.alert("Error", `Could not open ${providerName}`);
        });
        return;
      }

      showProviderPicker({ coordinates, anchorRef });
    },
    [directionsProvider, showProviderPicker]
  );

  return { openDirections, showProviderPicker };
}
