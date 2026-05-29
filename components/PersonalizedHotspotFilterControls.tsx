import tw from "@/lib/tw";
import { useFiltersStore } from "@/stores/filtersStore";
import React, { useEffect, useState } from "react";
import { Switch, Text, TextInput, View } from "react-native";

type PersonalizedHotspotFilterControlsProps = {
  hasLifeList: boolean;
};

function FilterNumberField({
  label,
  value,
  onChangeValue,
  keyboardType,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeValue: () => void;
  keyboardType: "decimal-pad" | "number-pad";
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={tw`flex-1`}>
      <Text style={tw`text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5`}>{label}</Text>
      <TextInput
        style={tw`bg-white border border-gray-200 rounded-2xl px-3 py-2.5 text-base text-gray-900`}
        keyboardType={keyboardType}
        value={value}
        onChangeText={onChangeText}
        onBlur={onChangeValue}
        onEndEditing={onChangeValue}
      />
    </View>
  );
}

export default function PersonalizedHotspotFilterControls({
  hasLifeList,
}: PersonalizedHotspotFilterControlsProps) {
  const personalizedFilterEnabled = useFiltersStore((state) => state.personalizedFilterEnabled);
  const setPersonalizedFilterEnabled = useFiltersStore((state) => state.setPersonalizedFilterEnabled);
  const neededSpeciesMinCount = useFiltersStore((state) => state.neededSpeciesMinCount);
  const setNeededSpeciesMinCount = useFiltersStore((state) => state.setNeededSpeciesMinCount);
  const neededSpeciesMinPercent = useFiltersStore((state) => state.neededSpeciesMinPercent);
  const setNeededSpeciesMinPercent = useFiltersStore((state) => state.setNeededSpeciesMinPercent);

  const [countText, setCountText] = useState(String(neededSpeciesMinCount));
  const [percentText, setPercentText] = useState(String(neededSpeciesMinPercent));

  useEffect(() => {
    setCountText(String(neededSpeciesMinCount));
  }, [neededSpeciesMinCount]);

  useEffect(() => {
    setPercentText(String(neededSpeciesMinPercent));
  }, [neededSpeciesMinPercent]);

  const commitCount = () => {
    const parsedValue = Number.parseInt(countText.replace(/[^\d]/g, ""), 10);
    const nextValue = Number.isFinite(parsedValue) ? parsedValue : neededSpeciesMinCount;
    setNeededSpeciesMinCount(nextValue);
    setCountText(String(nextValue));
  };

  const commitPercent = () => {
    const parsedValue = Number.parseFloat(percentText.replace(/[^0-9.]/g, ""));
    const nextValue = Number.isFinite(parsedValue) ? parsedValue : neededSpeciesMinPercent;
    setNeededSpeciesMinPercent(nextValue);
    setPercentText(String(nextValue));
  };

  return (
    <View style={tw`gap-3`}>
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-1 pr-4`}>
          <Text style={tw`text-base font-medium text-gray-900`}>Personalized hotspot filter</Text>
          <Text style={tw`text-sm text-gray-500 mt-1`}>
            Show only hotspots with at least X needed species above Y%.
          </Text>
        </View>
        <Switch
          disabled={!hasLifeList}
          value={hasLifeList && personalizedFilterEnabled}
          onValueChange={setPersonalizedFilterEnabled}
        />
      </View>

      {!hasLifeList ? (
        <Text style={tw`text-sm text-gray-500`}>Import a life list to enable this filter.</Text>
      ) : personalizedFilterEnabled ? (
        <View style={tw`flex-row gap-3`}>
          <FilterNumberField
            label="Needed species"
            value={countText}
            keyboardType="number-pad"
            onChangeText={(text) => setCountText(text.replace(/[^\d]/g, ""))}
            onChangeValue={commitCount}
          />
          <FilterNumberField
            label="Min frequency %"
            value={percentText}
            keyboardType="decimal-pad"
            onChangeText={(text) => setPercentText(text.replace(/[^0-9.]/g, ""))}
            onChangeValue={commitPercent}
          />
        </View>
      ) : null}
    </View>
  );
}
