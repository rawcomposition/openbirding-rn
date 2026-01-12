import React from "react";
import { Platform, TouchableOpacity, ViewStyle } from "react-native";
import tw from "@/lib/tw";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Ionicons } from "@expo/vector-icons";

type Variant = "default" | "primary";

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap | React.ReactNode;
  variant?: Variant;
  onPress?: () => void;
  disabled?: boolean;
};

export default function IconButton({ icon, variant = "default", onPress, disabled }: IconButtonProps) {
  const variants = {
    default: {
      tintColor: undefined,
      iconColor: tw.color("gray-700"),
      fallbackBgColor: tw`bg-white`,
    },
    primary: {
      tintColor: tw.color("emerald-500"),
      iconColor: tw.color("white"),
      fallbackBgColor: tw`bg-emerald-400`,
    },
  };

  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const size = 40;
  const iconSize = 27;
  const variantStyles = variants[variant];

  const baseStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: "center",
    justifyContent: "center",
    opacity: disabled ? 0.5 : 1,
  };

  const tintColor = variantStyles.tintColor;
  const iconColor = variantStyles.iconColor;

  const renderIcon = () => {
    if (typeof icon === "string" && icon in Ionicons.glyphMap) {
      return <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={iconSize} color={iconColor} />;
    }
    return icon;
  };

  if (useGlass) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={disabled} style={baseStyle}>
        <GlassView style={baseStyle} glassEffectStyle="regular" tintColor={tintColor} isInteractive>
          {renderIcon()}
        </GlassView>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      style={[baseStyle, tw`bg-white shadow-lg`, variantStyles.fallbackBgColor]}
    >
      {renderIcon()}
    </TouchableOpacity>
  );
}
