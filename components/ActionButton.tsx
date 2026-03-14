import tw from "@/lib/tw";
import React, { ReactNode, forwardRef } from "react";
import { Text, TouchableOpacity, TouchableOpacityProps } from "react-native";

type ActionButtonProps = {
  icon: ReactNode;
  label: string;
  style?: TouchableOpacityProps["style"];
} & Pick<TouchableOpacityProps, "onPress" | "onLongPress" | "activeOpacity" | "disabled">;

const ActionButton = forwardRef<React.ComponentRef<typeof TouchableOpacity>, ActionButtonProps>(
  ({ icon, label, style, ...touchableProps }, ref) => {
    return (
      <TouchableOpacity
        ref={ref}
        style={[tw`flex-row items-center justify-center p-3 bg-gray-50 rounded-full flex-1`, style]}
        activeOpacity={touchableProps.activeOpacity ?? 0.7}
        {...touchableProps}
      >
        {icon}
        <Text style={tw`text-gray-700 text-base font-medium ml-3`}>{label}</Text>
      </TouchableOpacity>
    );
  }
);

ActionButton.displayName = "ActionButton";

export default ActionButton;
