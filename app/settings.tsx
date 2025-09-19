import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";

export default function SettingsPage() {
  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <View style={tw`flex-1 justify-center items-center p-8`}>
        <Ionicons name="settings-outline" size={64} color="#9ca3af" />
        <Text style={tw`text-gray-900 text-2xl font-semibold mt-4 mb-2`}>Settings</Text>
        <Text style={tw`text-gray-600 text-center`}>Settings page coming soon</Text>
      </View>
    </View>
  );
}
