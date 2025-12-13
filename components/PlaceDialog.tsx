import React, { useRef } from "react";
import { Text, View } from "react-native";
import type { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import tw from "@/lib/tw";
import BaseBottomSheet from "./BaseBottomSheet";
import DialogHeader from "./DialogHeader";
import ActionButton from "./ActionButton";
import DirectionsIcon from "./icons/DirectionsIcon";
import { useDirections } from "@/hooks/useDirections";
import { getSavedPlaceById } from "@/lib/database";
import Toast from "react-native-toast-message";

type Props = {
  isOpen: boolean;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  onClose: () => void;
};

export default function PlaceDialog({ isOpen, placeId, lat: droppedLat, lng: droppedLng, onClose }: Props) {
  const router = useRouter();
  const directionsButtonRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
  const { openDirections, showProviderPicker } = useDirections();

  const { data } = useQuery({
    queryKey: ["savedPlace", placeId],
    queryFn: () => (placeId ? getSavedPlaceById(placeId) : Promise.resolve(null)),
    enabled: !!placeId && isOpen,
  });

  const savedPlace = placeId ? data : { lat: droppedLat, lng: droppedLng, name: `${droppedLat}, ${droppedLng}` };
  const lat = savedPlace?.lat;
  const lng = savedPlace?.lng;

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
    if (!lat || !lng) {
      Toast.show({ type: "error", text1: "Invalid coordinates" });
      return;
    }
    router.push({
      pathname: "/place-edit",
      params: {
        id: placeId ?? "",
        lat: lat?.toString() ?? "",
        lng: lng?.toString() ?? "",
      },
    });
  };

  const headerContent = (
    <DialogHeader onClose={onClose} onSavePress={handleSavePress}>
      <Text selectable style={tw`text-gray-900 text-xl font-bold`}>
        {savedPlace?.name}
      </Text>
      <Text style={tw`text-gray-600 text-sm mt-1`}>{savedPlace ? "Saved Pin" : "Dropped Pin"}</Text>
    </DialogHeader>
  );

  return (
    <BaseBottomSheet isOpen={isOpen} onClose={onClose} snapPoints={[300, 400]} headerContent={headerContent}>
      <View style={tw`px-4 pb-4 pt-2`}>
        {!!lat && !!lng && (
          <>
            <Text style={tw`text-sm font-medium text-gray-700 mb-3`}>External Links</Text>
            <ActionButton
              ref={directionsButtonRef}
              icon={<DirectionsIcon color={tw.color("orange-600")} size={20} />}
              label="Get Directions"
              onPress={handleGetDirections}
              onLongPress={handleShowProviders}
            />
          </>
        )}
      </View>
    </BaseBottomSheet>
  );
}
