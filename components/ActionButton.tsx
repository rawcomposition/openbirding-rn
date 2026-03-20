import tw from "@/lib/tw";
import React, { ReactNode, forwardRef } from "react";
import { Text, TouchableOpacity, TouchableOpacityProps } from "react-native";

export const ACTION_BUTTON_MIN_HEIGHT = 48;

type ActionButtonProps = {
  icon: ReactNode;
  label: string;
  style?: TouchableOpacityProps["style"];
  stacked?: boolean;
} & Pick<TouchableOpacityProps, "onPress" | "onLongPress" | "activeOpacity" | "disabled">;

const ActionButton = forwardRef<React.ComponentRef<typeof TouchableOpacity>, ActionButtonProps>(
  ({ icon, label, style, stacked = false, ...touchableProps }, ref) => {
    return (
      <TouchableOpacity
        ref={ref}
        style={[
          tw`w-full flex-row items-center justify-center px-3 bg-gray-50 rounded-full`,
          stacked ? { minHeight: ACTION_BUTTON_MIN_HEIGHT, paddingVertical: 12 } : { height: ACTION_BUTTON_MIN_HEIGHT },
          style,
        ]}
        activeOpacity={touchableProps.activeOpacity ?? 0.7}
        {...touchableProps}
      >
        {icon}
        <Text
          numberOfLines={stacked ? 2 : 1}
          style={[tw`text-gray-700 text-base font-medium ml-3`, { flexShrink: 1, textAlign: "center" }]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }
);

ActionButton.displayName = "ActionButton";

export default ActionButton;
