import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View, ViewStyle } from "react-native";

export function PackUpdateNotice({ style }: { style?: ViewStyle }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push("/packs")}
      activeOpacity={0.7}
      style={[tw`bg-white border border-gray-200 rounded-2xl p-4 flex-row items-center`, style]}
    >
      <View style={tw`flex-1`}>
        <Text style={tw`text-gray-900 font-semibold text-base mb-1`}>Pack Update Required</Text>
        <Text style={tw`text-gray-600 text-sm`}>This feature requires updated packs.</Text>
      </View>
      <Ionicons name="arrow-forward" size={20} color={tw.color("gray-500")} style={tw`ml-3`} />
    </TouchableOpacity>
  );
}
