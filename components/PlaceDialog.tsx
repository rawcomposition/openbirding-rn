import { getSavedPlaceById } from "@/lib/database";
import tw from "@/lib/tw";
import { useMapStore } from "@/stores/mapStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Text, View } from "react-native";
import BaseBottomSheet from "./BaseBottomSheet";
import DialogHeader from "./DialogHeader";
import DirectionsMenuButton from "./DirectionsMenuButton";
import PlaceEditSheet from "./PlaceEditSheet";

type Props = {
  isOpen: boolean;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  onClose: () => void;
};

export default function PlaceDialog({ isOpen, placeId, lat: droppedLat, lng: droppedLng, onClose }: Props) {
  const queryClient = useQueryClient();
  const { setPlaceId, setHotspotId, setCustomPinCoordinates } = useMapStore();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["savedPlace", placeId],
    queryFn: () => (placeId ? getSavedPlaceById(placeId) : Promise.resolve(null)),
    enabled: !!placeId && isOpen,
  });

  const savedPlace = placeId
    ? data
    : droppedLat !== null && droppedLng !== null
      ? { lat: droppedLat, lng: droppedLng, name: `${droppedLat}, ${droppedLng}`, notes: "" }
      : null;
  const lat = savedPlace?.lat;
  const lng = savedPlace?.lng;

  const handleSavePress = () => {
    setIsEditOpen(true);
  };

  const handleSaved = (savedId: string) => {
    setIsEditOpen(false);
    setPlaceId(savedId);
    setHotspotId(null);
    setCustomPinCoordinates(null);
  };

  const handleDeleted = () => {
    setIsEditOpen(false);
    setPlaceId(null);
    setHotspotId(null);
    setCustomPinCoordinates(null);
    queryClient.invalidateQueries({ queryKey: ["savedPlaces"] });
    queryClient.refetchQueries({ queryKey: ["savedPlaces"], type: "active" });
  };

  const headerContent = (dismiss: () => Promise<void>) => (
    <DialogHeader onClose={dismiss} onSavePress={handleSavePress} isPlace isSaved={!!placeId}>
      {savedPlace?.name ? (
        <Text selectable style={tw`text-gray-900 text-xl font-bold`}>
          {savedPlace.name}
        </Text>
      ) : (
        <View style={tw`h-7`} />
      )}
      {!!savedPlace && (
        <Text style={tw`text-gray-600 text-sm mt-1`}>{placeId ? "Saved Pin" : "Dropped Pin"}</Text>
      )}
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
            <DirectionsMenuButton latitude={lat} longitude={lng} />
          )}
        </View>
      </BaseBottomSheet>
      {isEditOpen && (
        <PlaceEditSheet
          isOpen
          placeId={placeId ?? null}
          lat={lat ?? null}
          lng={lng ?? null}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </>
  );
}
