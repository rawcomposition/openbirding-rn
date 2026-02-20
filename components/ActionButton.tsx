import tw from "@/lib/tw";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import React, { ReactNode, forwardRef } from "react";
import { Platform, Text, TouchableOpacity, TouchableOpacityProps } from "react-native";

type ActionButtonProps = {
  icon: ReactNode;
  label: string;
  style?: TouchableOpacityProps["style"];
} & Pick<TouchableOpacityProps, "onPress" | "onLongPress" | "activeOpacity" | "disabled">;

const ActionButton = forwardRef<React.ComponentRef<typeof TouchableOpacity>, ActionButtonProps>(
  ({ icon, label, style, ...touchableProps }, ref) => {
    const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

    const content = (
      <>
        {icon}
        <Text style={tw`text-gray-700 text-base font-medium ml-3`}>{label}</Text>
      </>
    );

    if (useGlass) {
      return (
        <TouchableOpacity
          ref={ref}
          style={[tw`flex-1`, style]}
          activeOpacity={touchableProps.activeOpacity ?? 0.8}
          {...touchableProps}
        >
          <GlassView
            style={tw`flex-row items-center justify-center p-3 rounded-full`}
            glassEffectStyle="regular"
            isInteractive
          >
            {content}
          </GlassView>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        ref={ref}
        style={[tw`flex-row items-center justify-center p-3 bg-white rounded-full flex-1`, style]}
        activeOpacity={touchableProps.activeOpacity ?? 0.7}
        {...touchableProps}
      >
        {content}
      </TouchableOpacity>
    );
  }
);

ActionButton.displayName = "ActionButton";

export default ActionButton;
