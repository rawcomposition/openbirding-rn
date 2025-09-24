import React from "react";
import { Platform, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import tw from "twrnc";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

type FloatingButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function FloatingButton({ onPress, children, style }: FloatingButtonProps) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const baseStyle = tw`w-14 h-14 rounded-full items-center justify-center`;

  const fallbackContainerStyle = [baseStyle, tw`bg-white shadow-lg`, style];

  if (useGlass) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[baseStyle, style]}>
        <GlassView style={[baseStyle, style]} glassEffectStyle="regular">
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
