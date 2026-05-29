import PersonalizedHotspotFilterControls from "@/components/PersonalizedHotspotFilterControls";
import tw from "@/lib/tw";
import { useFiltersStore } from "@/stores/filtersStore";
import { useSettingsStore } from "@/stores/settingsStore";
import React from "react";
import { Platform, Switch, Text, View } from "react-native";
import { BorderlessButton } from "react-native-gesture-handler";

export default function FilterSection() {
  const { showSavedOnly, setShowSavedOnly } = useFiltersStore();
  const lifelist = useSettingsStore((state) => state.lifelist);
  const hasLifeList = (lifelist?.length ?? 0) > 0;

  const content = (
    <View style={tw`flex-row items-center justify-between`}>
      <Text style={tw`text-lg text-gray-900`}>Show saved only</Text>
      <Switch value={showSavedOnly} onValueChange={setShowSavedOnly} />
    </View>
  );

  if (Platform.OS === "android") {
    return (
      <View style={tw`pl-6 pr-5 py-4 gap-4`}>
        <BorderlessButton onPress={() => setShowSavedOnly(!showSavedOnly)} activeOpacity={1}>
          {content}
        </BorderlessButton>
        <PersonalizedHotspotFilterControls hasLifeList={hasLifeList} />
      </View>
    );
  }

  return (
    <View style={tw`pl-6 pr-5 py-4 gap-4`}>
      {content}
      <PersonalizedHotspotFilterControls hasLifeList={hasLifeList} />
    </View>
  );
}
