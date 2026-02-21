import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

type PacksNoticeProps = {
  variant?: "banner" | "card" | "inline";
  onPress?: () => void;
};

export default function PacksNotice({ variant = "banner", onPress }: PacksNoticeProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push("/packs?tab=nearby");
    }
  };

  if (variant === "banner") {
    return (
      <View style={tw`mx-4 rounded-2xl overflow-hidden bg-white/85`}>
        <Pressable onPress={handlePress} style={tw`p-4 flex-row items-center`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-gray-900 font-semibold text-base mb-1`}>Download Hotspot Packs</Text>
            <Text style={tw`text-gray-600 text-sm`}>Get started by downloading hotspot packs for your area</Text>
          </View>
          <View style={tw`ml-3`}>
            <Ionicons name="arrow-forward" size={20} color={tw.color("gray-500")} />
          </View>
        </Pressable>
      </View>
    );
  }

  if (variant === "card") {
    return (
      <View style={tw`bg-white border border-gray-200 mx-4 mt-4 rounded-lg shadow-sm`}>
        <Pressable onPress={handlePress} style={tw`p-6 items-center`}>
          <View style={tw`bg-gray-100 rounded-full p-4 mb-4`}>
            <Ionicons name="map-outline" size={32} color={tw.color("gray-600")} />
          </View>
          <Text style={tw`text-gray-900 font-semibold text-lg mb-2`}>No Hotspot Packs Installed</Text>
          <Text style={tw`text-gray-600 text-center mb-6 text-sm`}>
            Get started by downloading hotspot packs for your area
          </Text>
          <Pressable style={tw`bg-blue-500 px-6 py-3 rounded-lg flex-row items-center`} onPress={handlePress}>
            <Ionicons name="download" size={16} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white font-medium text-base`}>Browse Packs</Text>
          </Pressable>
        </Pressable>
      </View>
    );
  }

  if (variant === "inline") {
    return (
      <View style={tw`bg-amber-50 border border-amber-200 rounded-lg p-4`}>
        <View style={tw`flex-row items-start`}>
          <Ionicons name="information-circle" size={20} color={tw.color("amber-600")} style={tw`mr-3 mt-0.5`} />
          <View style={tw`flex-1`}>
            <Text style={tw`text-amber-900 font-medium mb-1 text-base`}>No packs installed</Text>
            <Text style={tw`text-amber-700 text-sm mb-3`}>
              Download hotspot packs to see birding locations and get the most out of OpenBirding
            </Text>
            <Pressable onPress={handlePress} style={tw`bg-amber-600 px-4 py-2 rounded-md self-start`}>
              <Text style={tw`text-white font-medium text-base`}>Download Packs</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return null;
}
