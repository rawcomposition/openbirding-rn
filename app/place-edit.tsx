import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import tw from "@/lib/tw";
import ModalHeader from "@/components/ModalHeader";
import IconButton from "@/components/IconButton";
import Input from "@/components/Input";

export default function PlaceEditScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    lat?: string;
    lng?: string;
    initialTitle?: string;
    initialNotes?: string;
  }>();

  const [title, setTitle] = useState(params.initialTitle ?? "");
  const [notes, setNotes] = useState(params.initialNotes ?? "");

  const canSave = title.trim().length > 0;

  const handleSave = () => {
    Alert.alert("Not yet", "Saving custom coordinates isn't implemented yet.");
  };

  return (
    <KeyboardAvoidingView
      style={tw`flex-1`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ModalHeader
        title={params.id ? "Edit Place" : "Add Place"}
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
