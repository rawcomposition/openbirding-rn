import React from "react";
import { Platform, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import tw from "@/lib/tw";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

type FloatingButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  light?: boolean;
};

export default function FloatingButton({ onPress, children, style, light }: FloatingButtonProps) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const baseStyle = tw`w-14 h-14 rounded-full items-center justify-center`;

  const fallbackContainerStyle = [baseStyle, tw`bg-white shadow-lg`, style];

  if (useGlass) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[baseStyle, style]}>
        <GlassView
          style={[baseStyle, style]}
          glassEffectStyle="regular"
          tintColor={light ? "rgba(255, 255, 255, 0.8)" : undefined}
        >
          {children}
        </GlassView>
      </TouchableOpacity>
    );
  } else {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={fallbackContainerStyle}>
        {children}
      </TouchableOpacity>
    );
  }
}
