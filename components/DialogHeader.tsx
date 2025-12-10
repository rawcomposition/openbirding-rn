import React, { ReactNode } from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "@/lib/tw";
import StarIcon from "./icons/StarIcon";

type DialogHeaderProps = {
  children: ReactNode;
  onClose: () => void;
  onSavePress?: () => void;
  saveDisabled?: boolean;
  isSaved?: boolean;
};

export default function DialogHeader({ children, onClose, onSavePress, saveDisabled, isSaved }: DialogHeaderProps) {
  return (
    <View style={tw`flex-row items-start justify-between p-4 pt-0`}>
      <View style={tw`flex-1 pr-4 pl-1`}>{children}</View>
      <View style={tw`flex-row items-center gap-2`}>
        {onSavePress && (
          <TouchableOpacity
            onPress={onSavePress}
            disabled={saveDisabled}
            style={tw`w-10 h-10 items-center justify-center bg-slate-100 rounded-full shadow-sm`}
          >
            <StarIcon size={20} color={isSaved ? tw.color("yellow-400") : tw.color("gray-500")} filled={isSaved} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onClose}
          style={tw`w-10 h-10 items-center justify-center bg-slate-100 rounded-full shadow-sm`}
        >
          <Ionicons name="close" size={26} color={tw.color("gray-500")} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
