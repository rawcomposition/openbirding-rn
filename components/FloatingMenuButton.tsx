import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";

type FloatingMenuButtonProps = {
  onPress: () => void;
};

export default function FloatingMenuButton({ onPress }: FloatingMenuButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        tw`absolute bottom-0 right-0 p-4`,
        {
          bottom: insets.bottom + 16,
          right: 16,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        style={tw`bg-white w-14 h-14 rounded-full items-center justify-center shadow-lg`}
        activeOpacity={0.8}
      >
        <Ionicons name="menu" size={24} color="#1f2937" />
      </TouchableOpacity>
    </View>
  );
}
