import React from "react";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";

type FloatingButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
};

export default function FloatingButton({ onPress, children }: FloatingButtonProps) {
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
        {children}
      </TouchableOpacity>
    </View>
  );
}
