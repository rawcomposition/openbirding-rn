import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import tw from "@/lib/tw";
import ModalHeader from "@/components/ModalHeader";
import IconButton from "@/components/IconButton";
import Input from "@/components/Input";
import { savePlace, getSavedPlaceById } from "@/lib/database";
import Toast from "react-native-toast-message";
import { generateId } from "@/lib/utils";
import { useMapStore } from "@/stores/mapStore";

export default function PlaceEditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setPlaceId, setHotspotId } = useMapStore();
  const params = useLocalSearchParams<{
    id?: string;
    lat?: string;
    lng?: string;
  }>();

  const placeId = params.id && params.id.trim().length > 0 ? params.id : null;
  const isEditing = !!placeId;

  const { data, isLoading, error } = useQuery({
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

  const lat = data?.lat ?? (params.lat ? parseFloat(params.lat) : null);
  const lng = data?.lng ?? (params.lng ? parseFloat(params.lng) : null);

  const mutation = useMutation({
    mutationFn: savePlace,
    onSuccess: (savedId) => {
      queryClient.invalidateQueries({ queryKey: ["savedPlace", placeId] });
      setPlaceId(savedId);
      setHotspotId(null);
      router.back();
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Error saving pin" });
    },
  });

  const canSave = title.trim().length > 0 && lat !== null && lng !== null && !mutation.isPending && !isLoading;

  const handleSave = () => {
    if (!canSave || lat === null || lng === null) {
      Toast.show({ type: "error", text1: "Invalid coordinates" });
      return;
    }

    mutation.mutate({
      id: placeId || generateId(12),
      name: title.trim(),
      notes: notes.trim(),
      lat,
      lng,
      color: "blue",
    });
  };

  if (error) {
    return (
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ModalHeader title="Edit Pin" buttons={[]} />
        <View style={tw`flex-1 justify-center items-center`}>
          <Text style={tw`text-red-500 text-center text-base`}>Error loading place: {error.message}</Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={tw`flex-1`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ModalHeader
        title={isEditing ? "Edit Pin" : "Save Pin"}
        buttons={[
          <IconButton key="save" icon="checkmark" variant="primary" onPress={handleSave} disabled={!canSave} />,
        ]}
      />
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-4 py-6`} keyboardShouldPersistTaps="handled">
        <View style={tw`mb-6`}>
          <Text style={tw`text-gray-700 font-medium mb-2 text-base`}>Title</Text>
          <Input placeholder="Enter place title" value={title} onChangeText={setTitle} autoFocus returnKeyType="next" />
        </View>

        <View>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
