import React, { useMemo, useRef } from "react";
import { Alert, Text, View } from "react-native";
import type { TouchableOpacity } from "react-native";
import tw from "twrnc";
import BaseBottomSheet from "./BaseBottomSheet";
import DialogHeader from "./DialogHeader";
import DialogActionRow from "./DialogActionRow";
import DirectionsIcon from "./icons/DirectionsIcon";
import ExternalLinkIcon from "./icons/ExternalLinkIcon";
import { useDirections } from "@/hooks/useDirections";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LongPressCoordinatesDialogProps = {
  isOpen: boolean;
  coordinates: Coordinates | null;
  onClose: () => void;
};

const formatCoordinatePair = (coords: Coordinates | null) => {
  if (!coords) return "Coordinates";
  return `${coords.latitude.toFixed(5)}°, ${coords.longitude.toFixed(5)}°`;
};

export default function LongPressCoordinatesDialog({ isOpen, coordinates, onClose }: LongPressCoordinatesDialogProps) {
  const directionsButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const { openDirections, showProviderPicker } = useDirections();
  const coordinateLabel = useMemo(() => formatCoordinatePair(coordinates), [coordinates]);

  const handleGetDirections = () => {
    if (!coordinates) return;
    openDirections({
      coordinates: { latitude: coordinates.latitude, longitude: coordinates.longitude },
      anchorRef: directionsButtonRef,
    });
  };

  const handleShowProviders = () => {
    if (!coordinates) return;
    showProviderPicker({
      coordinates: { latitude: coordinates.latitude, longitude: coordinates.longitude },
      anchorRef: directionsButtonRef,
    });
  };

  const handleSavePress = () => {
    Alert.alert("Not yet", "Saving custom coordinates isn't implemented yet.");
  };

  const headerContent = (
    <DialogHeader onClose={onClose} onSavePress={handleSavePress}>
      <Text selectable style={tw`text-gray-900 text-xl font-bold`}>
        {coordinateLabel}
      </Text>
      <Text style={tw`text-gray-600 text-sm mt-1`}>Long-press location</Text>
    </DialogHeader>
  );

  return (
    <BaseBottomSheet isOpen={isOpen} onClose={onClose} snapPoints={[220, 320]} headerContent={headerContent}>
      <View style={tw`px-4 pb-4 pt-2`}>
        <Text style={tw`text-sm font-medium text-gray-700 mb-3`}>Actions</Text>
        <DialogActionRow
          ref={directionsButtonRef}
          icon={<DirectionsIcon color={tw.color("orange-600")} size={20} />}
          label="Get Directions"
          onPress={handleGetDirections}
          onLongPress={handleShowProviders}
          accessory={<ExternalLinkIcon color={tw.color("gray-400")} size={16} />}
        />
      </View>
    </BaseBottomSheet>
  );
}
