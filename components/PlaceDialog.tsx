import { getSavedPlaceById } from "@/lib/database";
import tw from "@/lib/tw";
import { useMapStore } from "@/stores/mapStore";
import { FontAwesome6 } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import BaseBottomSheet from "./BaseBottomSheet";
import DialogHeader from "./DialogHeader";
import DirectionsMenuButton from "./DirectionsMenuButton";
import { FloatingMenuHost, FloatingMenuProvider, useFloatingMenu } from "./FloatingMenuProvider";
import PlaceEditSheet from "./PlaceEditSheet";
import PlaceNotesSheet from "./PlaceNotesSheet";

type Props = {
  isOpen: boolean;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  onClose: () => void;
};

export default function PlaceDialog(props: Props) {
  return (
    <FloatingMenuProvider>
      <PlaceDialogContent {...props} />
    </FloatingMenuProvider>
  );
}

function PlaceDialogContent({ isOpen, placeId, lat: droppedLat, lng: droppedLng, onClose }: Props) {
  const queryClient = useQueryClient();
  const { setPlaceId, setHotspotId, setCustomPinCoordinates } = useMapStore();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const { closeMenu } = useFloatingMenu();

  useEffect(() => {
    closeMenu();
  }, [closeMenu, isOpen, placeId]);

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
    <View onTouchStart={closeMenu}>
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
    </View>
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
          {!!placeId && (
            <TouchableOpacity activeOpacity={0.6} onPress={() => setIsNotesOpen(true)} style={tw`mb-3`}>
              {savedPlace?.notes ? (
                <View style={tw`bg-gray-50 p-3 rounded-lg flex-row items-start`}>
                  <Text style={tw`text-gray-700 flex-1 text-sm`}>{savedPlace.notes}</Text>
                  <FontAwesome6 name="pencil" size={12} color={tw.color("gray-400")} style={tw`ml-2 mt-0.5`} />
                </View>
              ) : (
                <View style={tw`flex-row items-center py-1.5 px-2`}>
                  <FontAwesome6 name="pencil" size={12} color={tw.color("gray-400")} style={tw`mr-2`} />
                  <Text style={tw`text-gray-400 text-sm`}>Add notes...</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          {!!lat && !!lng && (
            <DirectionsMenuButton latitude={lat} longitude={lng} />
          )}
          <FloatingMenuHost />
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
      {isNotesOpen && placeId && (
        <PlaceNotesSheet
          isOpen
          placeId={placeId}
          initialNotes={savedPlace?.notes || ""}
          onClose={() => setIsNotesOpen(false)}
        />
      )}
    </>
  );
}
