import React from "react";
import { TouchableOpacity } from "react-native";
import tw from "twrnc";

type FloatingButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
};

export default function FloatingButton({ onPress, children }: FloatingButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={tw`bg-white w-14 h-14 rounded-full items-center justify-center shadow-lg`}
      activeOpacity={0.8}
    >
      {children}
    </TouchableOpacity>
  );
}
