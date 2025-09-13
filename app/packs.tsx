import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";
import PacksList from "@/components/PacksList";

export default function PacksPage() {
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
        <Text style={tw`text-gray-900 text-xl font-semibold`}>Hotspot Packs</Text>
      </View>

      <View style={tw`flex-1 p-4`}>
        <PacksList />
      </View>
    </View>
  );
}
