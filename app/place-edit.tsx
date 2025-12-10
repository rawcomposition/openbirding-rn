import React, { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import tw from "twrnc";
import ModalHeader from "@/components/ModalHeader";
import IconButton from "@/components/IconButton";
import { getPlaceEditCallback, clearPlaceEditCallback } from "@/lib/placeEditCallbacks";

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
          <Text style={tw`text-gray-700 text-sm font-medium mb-2`}>Title</Text>
          <TextInput
            style={tw`bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900`}
            placeholder="Enter place title"
            placeholderTextColor={tw.color("gray-400")}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>

        <View>
          <Text style={tw`text-gray-700 text-sm font-medium mb-2`}>Notes</Text>
          <TextInput
            style={[
              tw`bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900`,
              { minHeight: 120, textAlignVertical: "top" },
            ]}
            placeholder="Add notes (optional)"
            placeholderTextColor={tw.color("gray-400")}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={5}
            returnKeyType="default"
            clearButtonMode="while-editing"
            autoCorrect
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
