import React from "react";
import { View, Text } from "react-native";
import tw from "@/lib/tw";
import IconButton from "./IconButton";
import { useRouter } from "expo-router";

type ModalHeaderProps = {
  title: string;
  buttons: React.ReactElement[];
};

export default function ModalHeader({ buttons, title }: ModalHeaderProps) {
  const router = useRouter();

  return (
    <View style={tw`flex-row items-start justify-between p-4 pt-5`}>
      <IconButton icon="close" onPress={() => router.back()} />
      <Text style={tw`text-lg font-bold`}>{title}</Text>
      <View style={tw`flex-row items-center gap-2`}>
        {buttons.map((button, index) => (
          <React.Fragment key={index}>{button}</React.Fragment>
        ))}
      </View>
    </View>
  );
}
