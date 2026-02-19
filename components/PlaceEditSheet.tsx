import IconButton from "@/components/IconButton";
import Input from "@/components/Input";
import { deletePlace, getSavedPlaceById, savePlace } from "@/lib/database";
import tw from "@/lib/tw";
import { generateId } from "@/lib/utils";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import BaseBottomSheet from "./BaseBottomSheet";

type PlaceEditSheetProps = {
  isOpen: boolean;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  onSaved: (id: string) => void;
  onDeleted: () => void;
  onClose: () => void;
};

export default function PlaceEditSheet({
  isOpen,
  placeId,
  lat: propLat,
  lng: propLng,
  onSaved,
  onDeleted,
  onClose,
}: PlaceEditSheetProps) {
  const queryClient = useQueryClient();
  const isEditing = !!placeId;
  const dismissRef = useRef<(() => Promise<void>) | null>(null);
  const pendingSaveRef = useRef<string | null>(null);
  const pendingDeleteRef = useRef(false);
  const titleInputRef = useRef<TextInput>(null);

  const handleSheetClose = () => {
    if (pendingSaveRef.current) {
      const savedId = pendingSaveRef.current;
      pendingSaveRef.current = null;
      onSaved(savedId);
    } else if (pendingDeleteRef.current) {
      pendingDeleteRef.current = false;
      onDeleted();
    } else {
      onClose();
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["savedPlace", placeId],
    queryFn: () => getSavedPlaceById(placeId!),
    enabled: !!placeId,
  });

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (data) {
      setTitle(data.name);
      setNotes(data.notes || "");
    }
  }, [data]);

  // Reset form when sheet opens for a new place
  useEffect(() => {
    if (isOpen && !placeId) {
      setTitle("");
      setNotes("");
    }
  }, [isOpen, placeId]);

  const lat = data?.lat ?? propLat;
  const lng = data?.lng ?? propLng;

  const mutation = useMutation({
    mutationFn: savePlace,
    onSuccess: async (savedId) => {
      queryClient.invalidateQueries({ queryKey: ["savedPlace", savedId] });
      queryClient.invalidateQueries({ queryKey: ["savedPlaces"] });
      queryClient.refetchQueries({ queryKey: ["savedPlaces"], type: "active" });
      queryClient.refetchQueries({ queryKey: ["savedPlace", savedId], type: "active" });
      pendingSaveRef.current = savedId;
      await dismissRef.current?.();
    },
    onError: () => {
      Toast.show({ type: "error", text1: "Error saving pin" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlace,
    onSuccess: async () => {
      pendingDeleteRef.current = true;
      await dismissRef.current?.();
    },
    onError: () => {
      Toast.show({ type: "error", text1: "Error deleting pin" });
    },
  });

  const canSave = title.trim().length > 0 && lat !== null && lng !== null && !mutation.isPending && !isLoading;

  const handleSave = () => {
    if (!canSave || lat === null || lng === null) return;

    mutation.mutate({
      id: placeId || generateId(12),
      name: title.trim(),
      notes: notes.trim(),
      lat,
      lng,
      icon: "star",
    });
  };

  const handleDelete = () => {
    if (!placeId) return;
    deleteMutation.mutate(placeId);
  };

  const headerContent = (dismiss: () => Promise<void>) => {
    dismissRef.current = dismiss;
    return (
      <View style={tw`flex-row items-center justify-between px-5`}>
        <IconButton icon="close" variant="muted" onPress={dismiss} />
        <Text style={tw`text-gray-900 text-xl font-bold`}>{isEditing ? "Edit Pin" : "Save Pin"}</Text>
        <IconButton icon="checkmark" variant="primary" onPress={handleSave} disabled={!canSave} />
      </View>
    );
  };

  return (
    <BaseBottomSheet isOpen={isOpen} onClose={handleSheetClose} detents={["auto"]} headerContent={headerContent}>
      <View style={tw`px-4 py-6`}>
        <View style={tw`mb-6`}>
          <Text style={tw`text-gray-700 font-medium mb-2 text-base`}>Title</Text>
          <Input
            ref={titleInputRef}
            placeholder="Enter place title"
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
          />
        </View>

        <View style={tw`mb-6`}>
          <Text style={tw`text-gray-700 font-medium mb-2 text-base`}>Notes</Text>
          <Input
            placeholder="Add notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={5}
            returnKeyType="done"
            clearButtonMode="while-editing"
          />
        </View>

        {isEditing && (
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
            style={tw`flex-row items-center justify-center py-2`}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={tw.color("red-500")} />
            <Text style={tw`text-red-500 text-sm ml-1.5`}>Delete Pin</Text>
          </TouchableOpacity>
        )}
      </View>
    </BaseBottomSheet>
  );
}
