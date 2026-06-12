import tw from "@/lib/tw";
import { useFiltersStore } from "@/stores/filtersStore";
import { useSettingsStore } from "@/stores/settingsStore";
import React from "react";
import { Switch, Text, View } from "react-native";
import BaseBottomSheet from "./BaseBottomSheet";
import TargetRichHotspotControls from "./TargetRichHotspotControls";

type FilterSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function FilterSheet({ isOpen, onClose }: FilterSheetProps) {
  const showSavedOnly = useFiltersStore((state) => state.showSavedOnly);
  const setShowSavedOnly = useFiltersStore((state) => state.setShowSavedOnly);
  const lifelist = useSettingsStore((state) => state.lifelist);
  const hasLifeList = (lifelist?.length ?? 0) > 0;

  return (
    <BaseBottomSheet isOpen={isOpen} onClose={onClose} title="Filters" detents={["auto"]} dimmed>
      <View style={tw`px-6 pt-4 gap-4 pb-2`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-base font-medium text-gray-900`}>Show saved only</Text>
          <Switch value={showSavedOnly} onValueChange={setShowSavedOnly} />
        </View>
        <TargetRichHotspotControls hasLifeList={hasLifeList} />
      </View>
    </BaseBottomSheet>
  );
}
