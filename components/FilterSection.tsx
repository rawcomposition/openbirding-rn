import tw from "@/lib/tw";
import { useFiltersStore } from "@/stores/filtersStore";
import React from "react";
import { Switch, Text, View } from "react-native";

export default function FilterSection() {
  const { showSavedOnly, setShowSavedOnly } = useFiltersStore();

  return (
    <View style={tw`px-6 py-4 border-b border-gray-200`}>
      <View style={tw`flex-row items-center justify-between`}>
        <Text style={tw`text-lg text-gray-900`}>Show saved only</Text>
        <Switch value={showSavedOnly} onValueChange={setShowSavedOnly} />
      </View>
    </View>
  );
}
