import tw from "@/lib/tw";
import { useFiltersStore } from "@/stores/filtersStore";
import React from "react";
import { Platform, Switch, Text, View } from "react-native";
import { BorderlessButton } from "react-native-gesture-handler";

export default function FilterSection() {
  const { showSavedOnly, setShowSavedOnly } = useFiltersStore();

  const content = (
    <View style={tw`flex-row items-center justify-between`}>
      <Text style={tw`text-lg text-gray-900`}>Show saved only</Text>
      <Switch value={showSavedOnly} onValueChange={setShowSavedOnly} />
    </View>
  );

  if (Platform.OS === "android") {
    return (
      <BorderlessButton onPress={() => setShowSavedOnly(!showSavedOnly)} style={tw`pl-6 pr-5 py-4`} activeOpacity={1}>
        {content}
      </BorderlessButton>
    );
  }

  return <View style={tw`pl-6 pr-5 py-4`}>{content}</View>;
}
