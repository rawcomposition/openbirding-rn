import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";

export default function SettingsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <View style={[tw`flex-row items-center p-4 border-b border-gray-200 bg-white`, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={handleBack} style={tw`mr-4`}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={tw`text-gray-900 text-xl font-semibold`}>Settings</Text>
      </View>

      <View style={tw`flex-1 justify-center items-center p-8`}>
        <Ionicons name="settings-outline" size={64} color="#9ca3af" />
        <Text style={tw`text-gray-900 text-2xl font-semibold mt-4 mb-2`}>Settings</Text>
        <Text style={tw`text-gray-600 text-center`}>Settings page coming soon</Text>
      </View>
    </View>
  );
}
