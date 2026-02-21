import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import React from "react";
import { Platform, TouchableOpacity, ViewStyle } from "react-native";

type Variant = "default" | "primary" | "muted";

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap | React.ReactNode;
  variant?: Variant;
  onPress?: () => void;
  disabled?: boolean;
};

export default function IconButton({ icon, variant = "default", onPress, disabled }: IconButtonProps) {
  const variants = {
    default: {
      tintColor: tw.color("white/60"),
      iconColor: tw.color("gray-600"),
      fallbackBgColor: tw`bg-gray-100`,
    },
    primary: {
      tintColor: tw.color("emerald-500"),
      iconColor: tw.color("white"),
      fallbackBgColor: tw`bg-emerald-400`,
    },
    muted: {
      tintColor: tw.color("gray-200/80"),
      iconColor: tw.color("gray-500"),
      fallbackBgColor: tw`bg-slate-100`,
    },
  };

  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const size = 42;
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
      style={[baseStyle, variant === "primary" && tw`shadow-lg`, variantStyles.fallbackBgColor]}
    >
      {renderIcon()}
    </TouchableOpacity>
  );
}
