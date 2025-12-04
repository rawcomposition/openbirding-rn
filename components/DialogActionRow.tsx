import React, { ReactNode, forwardRef } from "react";
import { Text, TouchableOpacity, TouchableOpacityProps } from "react-native";
import tw from "twrnc";

type DialogActionRowProps = {
  icon: ReactNode;
  label: string;
  accessory?: ReactNode;
  style?: TouchableOpacityProps["style"];
} & Pick<TouchableOpacityProps, "onPress" | "onLongPress" | "activeOpacity" | "disabled">;

const DialogActionRow = forwardRef<TouchableOpacity, DialogActionRowProps>(
  ({ icon, label, accessory, style, ...touchableProps }, ref) => {
    return (
      <TouchableOpacity
        ref={ref}
        style={[tw`flex-row items-center p-3 bg-gray-50 rounded-lg flex-1`, style]}
        activeOpacity={touchableProps.activeOpacity ?? 0.7}
        {...touchableProps}
      >
        {icon}
        <Text style={tw`text-gray-700 text-[16px] font-medium ml-3 flex-1`}>{label}</Text>
        {accessory}
      </TouchableOpacity>
    );
  }
);

DialogActionRow.displayName = "DialogActionRow";

export default DialogActionRow;
