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
    <View style={tw`flex-1 bg-slate-800`}>
      <View style={[tw`flex-row items-center p-4 border-b border-slate-700`, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={handleBack} style={tw`mr-4`}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={tw`text-white text-xl font-semibold`}>Settings</Text>
      </View>

      <View style={tw`flex-1 justify-center items-center p-8`}>
        <Ionicons name="settings-outline" size={64} color="#64748b" />
        <Text style={tw`text-white text-2xl font-semibold mt-4 mb-2`}>Settings</Text>
        <Text style={tw`text-slate-400 text-center`}>Settings page coming soon</Text>
      </View>
    </View>
  );
}
