import { useDirections } from "@/hooks/useDirections";
import { getSavedPlaceById } from "@/lib/database";
import tw from "@/lib/tw";
import { useMapStore } from "@/stores/mapStore";
import { useQuery } from "@tanstack/react-query";
import React, { useRef, useState } from "react";
import type { TouchableOpacity } from "react-native";
import { Text, View } from "react-native";
import ActionButton from "./ActionButton";
import BaseBottomSheet from "./BaseBottomSheet";
import DialogHeader from "./DialogHeader";
import DirectionsIcon from "./icons/DirectionsIcon";
import PlaceEditSheet from "./PlaceEditSheet";

type Props = {
  isOpen: boolean;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  onClose: () => void;
};

export default function PlaceDialog({ isOpen, placeId, lat: droppedLat, lng: droppedLng, onClose }: Props) {
  const directionsButtonRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
  const { openDirections, showProviderPicker } = useDirections();
  const { setPlaceId, setHotspotId, setCustomPinCoordinates } = useMapStore();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["savedPlace", placeId],
    queryFn: () => (placeId ? getSavedPlaceById(placeId) : Promise.resolve(null)),
    enabled: !!placeId && isOpen,
  });

  const savedPlace = placeId
    ? data
    : { lat: droppedLat, lng: droppedLng, name: `${droppedLat}, ${droppedLng}`, notes: "" };
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
    setIsEditOpen(true);
  };

  const handleEditSaved = (savedId: string) => {
    setIsEditOpen(false);
    setPlaceId(savedId);
    setHotspotId(null);
    setCustomPinCoordinates(null);
  };

  const handleEditDeleted = () => {
    setIsEditOpen(false);
    setPlaceId(null);
    setHotspotId(null);
    setCustomPinCoordinates(null);
  };

  const headerContent = (dismiss: () => Promise<void>) => (
    <DialogHeader onClose={dismiss} onSavePress={handleSavePress} isPlace isSaved={!!placeId}>
      <Text selectable style={tw`text-gray-900 text-xl font-bold`}>
        {savedPlace?.name}
      </Text>
      <Text style={tw`text-gray-600 text-sm mt-1`}>{placeId ? "Saved Pin" : "Dropped Pin"}</Text>
    </DialogHeader>
  );

  if (placeId && !savedPlace && !isLoading) {
    return (
      <BaseBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        headerContent={(dismiss) => <DialogHeader onClose={dismiss} isPlace isSaved={false} />}
      >
        <View style={tw`px-4 pb-4 pt-2`}>
          <Text style={tw`text-gray-600 text-center text-base`}>Pin not found</Text>
        </View>
      </BaseBottomSheet>
    );
  }

  return (
    <>
      <BaseBottomSheet isOpen={isOpen} onClose={onClose} headerContent={headerContent}>
        <View style={tw`px-4 pb-4 pt-2 min-h-[100px]`}>
          {savedPlace?.notes && (
            <View style={tw`bg-gray-50 p-3 rounded-lg mb-3`}>
              <Text style={tw`text-gray-700`}>{savedPlace.notes}</Text>
            </View>
          )}
          {!!lat && !!lng && (
            <ActionButton
              ref={directionsButtonRef}
              icon={<DirectionsIcon color={tw.color("orange-600")} size={20} />}
              label="Get Directions"
              onPress={handleGetDirections}
              onLongPress={handleShowProviders}
              style={tw`flex-none`}
            />
          )}
        </View>
      </BaseBottomSheet>
      {isEditOpen && (
        <PlaceEditSheet
          isOpen
          placeId={placeId ?? null}
          lat={lat ?? null}
          lng={lng ?? null}
          onSaved={handleEditSaved}
          onDeleted={handleEditDeleted}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </>
  );
}
