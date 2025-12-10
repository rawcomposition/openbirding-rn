import React, { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import tw from "@/lib/tw";
import ModalHeader from "@/components/ModalHeader";
import IconButton from "@/components/IconButton";
import { getPlaceEditCallback, clearPlaceEditCallback } from "@/lib/placeEditCallbacks";
import Input from "@/components/Input";

export default function PlaceEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    initialTitle?: string;
    initialNotes?: string;
  }>();

  const [title, setTitle] = useState(params.initialTitle ?? "");
  const [notes, setNotes] = useState(params.initialNotes ?? "");

  const canSave = title.trim().length > 0;

  const handleSave = useCallback(() => {
    const callback = getPlaceEditCallback();
    if (callback) {
      callback(title, notes);
      clearPlaceEditCallback();
    }
    router.back();
  }, [title, notes, router]);

  return (
    <KeyboardAvoidingView
      style={tw`flex-1`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ModalHeader
        title="Edit Place"
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
