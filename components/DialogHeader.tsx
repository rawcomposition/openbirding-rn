import tw from "@/lib/tw";
import { FontAwesome6 } from "@expo/vector-icons";
import React, { ReactNode } from "react";
import { View } from "react-native";
import IconButton from "./IconButton";
import IconButtonGroup from "./IconButtonGroup";
import StarIcon from "./icons/StarIcon";

type DialogHeaderProps = {
  children?: ReactNode;
  onClose: () => void;
  onSavePress?: () => void;
  saveDisabled?: boolean;
  isSaved?: boolean;
  isPlace?: boolean;
};

export default function DialogHeader({
  children,
  onClose,
  onSavePress,
  saveDisabled,
  isSaved,
  isPlace,
}: DialogHeaderProps) {
  return (
    <View style={tw`flex-row items-start justify-between pr-5 pl-5 pb-4`}>
      <View style={tw`flex-1 pr-4 pl-1`}>{children}</View>
      <IconButtonGroup>
        {onSavePress && (
          <IconButton
            onPress={onSavePress}
            disabled={saveDisabled}
            icon={
              isPlace ? (
                isSaved ? (
                  <FontAwesome6 name="pencil" size={18} color={tw.color("gray-600")} />
                ) : (
                  <StarIcon size={20} color={tw.color("gray-500")} />
                )
              ) : (
                <StarIcon size={20} color={isSaved ? tw.color("yellow-400") : tw.color("gray-500")} filled={isSaved} />
              )
            }
          />
        )}
        <IconButton icon="close" onPress={onClose} />
      </IconButtonGroup>
    </View>
  );
}
