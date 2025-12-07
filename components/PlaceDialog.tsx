import React, { useRef } from "react";
import { Alert, Text, View } from "react-native";
import type { TouchableOpacity } from "react-native";
import tw from "twrnc";
import BaseBottomSheet from "./BaseBottomSheet";
import DialogHeader from "./DialogHeader";
import ActionButton from "./ActionButton";
import DirectionsIcon from "./icons/DirectionsIcon";
import { useDirections } from "@/hooks/useDirections";

type Props = {
  isOpen: boolean;
  lat: number | null;
  lng: number | null;
  onClose: () => void;
};

export default function PlaceDialog({ isOpen, lat, lng, onClose }: Props) {
  const directionsButtonRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
  const { openDirections, showProviderPicker } = useDirections();

  const handleGetDirections = () => {
    if (!lat || !lng) return;
    openDirections({
      coordinates: { latitude: lat, longitude: lng },
      anchorRef: directionsButtonRef,
    });
  };

  const handleShowProviders = () => {
    if (!lat || !lng) return;
    showProviderPicker({
      coordinates: { latitude: lat, longitude: lng },
      anchorRef: directionsButtonRef,
    });
  };

  const handleSavePress = () => {
    Alert.alert("Not yet", "Saving custom coordinates isn't implemented yet.");
  };

  const headerContent = (
    <DialogHeader onClose={onClose} onSavePress={handleSavePress}>
      <Text selectable style={tw`text-gray-900 text-xl font-bold`}>
        {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Unknown Location"}
      </Text>
      <Text style={tw`text-gray-600 text-sm mt-1`}>Dropped Pin</Text>
    </DialogHeader>
  );

  return (
    <BaseBottomSheet isOpen={isOpen} onClose={onClose} snapPoints={[300, 400]} headerContent={headerContent}>
      <View style={tw`px-4 pb-4 pt-2`}>
        <Text style={tw`text-sm font-medium text-gray-700 mb-3`}>External Links</Text>
        <ActionButton
          ref={directionsButtonRef}
          icon={<DirectionsIcon color={tw.color("orange-600")} size={20} />}
          label="Get Directions"
          onPress={handleGetDirections}
          onLongPress={handleShowProviders}
        />
      </View>
    </BaseBottomSheet>
  );
}
