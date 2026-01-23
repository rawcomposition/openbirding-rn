import { getDirections, getExternalMapProviders } from "@/lib/utils";
import { useDefaultMapProviderStore } from "@/stores/defaultMapProviderStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useCallback } from "react";
import { ActionSheetIOS, Alert, Linking, Platform, findNodeHandle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type DirectionsCoordinates = {
  latitude: number;
  longitude: number;
};

type DirectionsOptions = {
  coordinates: DirectionsCoordinates;
  anchorRef?: React.RefObject<any>;
};

export function useDirections() {
  const defaultProvider = useDefaultMapProviderStore((state) => state.defaultProvider);
  const { showActionSheetWithOptions } = useActionSheet();
  const insets = useSafeAreaInsets();

  const showProviderPicker = useCallback(
    ({ coordinates, anchorRef }: DirectionsOptions) => {
      const providers = getExternalMapProviders();
      const options = [...providers.map((provider) => provider.name), "Cancel"];
      const cancelButtonIndex = options.length - 1;

      const handleProviderSelection = (buttonIndex?: number) => {
        if (buttonIndex === undefined || buttonIndex >= providers.length) return;
        const selectedProvider = providers[buttonIndex];
        const url = getDirections(selectedProvider.id, coordinates.latitude, coordinates.longitude);
        Linking.openURL(url).catch(() => {
          Alert.alert("Error", `Could not open ${selectedProvider.name}`);
        });
      };

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex,
            title: "Choose Map Provider",
            anchor: findNodeHandle(anchorRef?.current) || undefined,
          },
          handleProviderSelection
        );
        return;
      }

      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: "Choose Map Provider",
          containerStyle: {
            paddingBottom: insets.bottom,
            backgroundColor: "white",
          },
        },
        handleProviderSelection
      );
    },
    [showActionSheetWithOptions]
  );

  const openDirections = useCallback(
    ({ coordinates, anchorRef }: DirectionsOptions) => {
      if (defaultProvider && defaultProvider !== "") {
        const providers = getExternalMapProviders();
        const provider = providers.find((p) => p.id === defaultProvider);
        const providerName = provider?.name || defaultProvider;
        const url = getDirections(defaultProvider, coordinates.latitude, coordinates.longitude);
        Linking.openURL(url).catch(() => {
          Alert.alert("Error", `Could not open ${providerName}`);
        });
        return;
      }

      showProviderPicker({ coordinates, anchorRef });
    },
    [defaultProvider, showProviderPicker]
  );

  return { openDirections, showProviderPicker };
}
