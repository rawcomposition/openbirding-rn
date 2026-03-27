import SearchInput from "@/components/SearchInput";
import { useTaxonomyMap } from "@/hooks/useTaxonomy";
import tw from "@/lib/tw";
import { useSettingsStore } from "@/stores/settingsStore";
import { Button, Host, Menu, RNHostView, Section } from "@expo/ui/swift-ui";
import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useNavigation } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform, ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";

function EmptyState() {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const cardStyle: ViewStyle = {
    borderRadius: 12,
    overflow: "hidden",
  };

  const content = (
    <View style={tw`p-6 items-center`}>
      <Ionicons name="eye-off-outline" size={48} color={tw.color("gray-400")} style={tw`mb-3`} />
      <Text style={tw`text-gray-500 text-base text-center`}>No exclusions yet</Text>
      <Text style={tw`text-gray-400 text-sm text-center mt-1`}>
        Species you exclude won't show up as targets
      </Text>
    </View>
  );

  return useGlass ? (
    <GlassView style={cardStyle} glassEffectStyle="regular" tintColor="rgba(255, 255, 255, 0.7)">
      {content}
    </GlassView>
  ) : (
    <View style={[cardStyle, tw`bg-white`]}>{content}</View>
  );
}

function SearchResultItem({ entry, onAdd }: { entry: { code: string; name: string }; onAdd: () => void }) {
  return (
    <TouchableOpacity style={tw`flex-row items-center px-4 py-3 border-b border-gray-200/50`} onPress={onAdd}>
      <Text style={tw`text-gray-900 text-base flex-1`}>{entry.name}</Text>
      <Ionicons name="add-circle" size={24} color={tw.color("blue-500")} />
    </TouchableOpacity>
  );
}

function ExclusionItem({
  code,
  isLast,
  taxonomyMap,
  onRemove,
}: {
  code: string;
  isLast: boolean;
  taxonomyMap: Map<string, string>;
  onRemove: () => void;
}) {
  const borderStyle = isLast ? {} : tw`border-b border-gray-200/50`;
  const speciesName = taxonomyMap.get(code) ?? `Unknown (${code})`;

  return (
    <View style={[tw`px-4 py-3 flex-row items-center`, borderStyle]}>
      <View style={tw`flex-1`}>
        <Text style={tw`text-gray-900 text-base font-medium`}>{speciesName}</Text>
      </View>
      <Host style={tw`p-2 -mr-2`}>
        <Menu
          label={
            <RNHostView matchContents>
              <View style={tw`w-8 h-8 items-center justify-center`}>
                <Ionicons name="ellipsis-horizontal" size={18} color={tw.color("gray-400")} />
              </View>
            </RNHostView>
          }
        >
          <Section>
            <Button
              label="View in Merlin"
              systemImage="arrow.up.forward.app"
              onPress={() => {
                Linking.openURL(`merlinbirdid://species/${code}`).catch(() => {
                  Alert.alert("Cannot Open Merlin", "Make sure the Merlin Bird ID app is installed.");
                });
              }}
            />
          </Section>
          <Section>
            <Button
              label="Remove"
              systemImage="minus.circle"
              role="destructive"
              onPress={onRemove}
            />
          </Section>
        </Menu>
      </Host>
    </View>
  );
}

export default function LifeListExclusionsPage() {
  const navigation = useNavigation();
  const lifelist = useSettingsStore((state) => state.lifelist);
  const lifelistExclusions = useSettingsStore((state) => state.lifelistExclusions);
  const setLifelistExclusions = useSettingsStore((state) => state.setLifelistExclusions);
  const { taxonomyMap } = useTaxonomyMap();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const title = lifelistExclusions?.length ? `Exclusions (${lifelistExclusions.length})` : "Exclusions";
    navigation.setOptions({ title });
  }, [navigation, lifelistExclusions?.length]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !lifelist) return [];
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const query = normalize(searchQuery);
    const exclusionSet = new Set(lifelistExclusions || []);

    return lifelist
      .filter((entry) => {
        if (exclusionSet.has(entry.code)) return false;
        const name = taxonomyMap.get(entry.code) ?? "";
        return normalize(name).includes(query) || normalize(entry.code).includes(query);
      })
      .map((entry) => ({
        code: entry.code,
        name: taxonomyMap.get(entry.code) ?? entry.code,
      }))
      .slice(0, 10);
  }, [searchQuery, lifelist, lifelistExclusions, taxonomyMap]);

  const excludedSpecies = useMemo(() => {
    if (!lifelistExclusions) return [];
    return [...lifelistExclusions].sort((a, b) => {
      const nameA = taxonomyMap.get(a) || a;
      const nameB = taxonomyMap.get(b) || b;
      return nameA.localeCompare(nameB);
    });
  }, [lifelistExclusions, taxonomyMap]);

  const handleAddExclusion = (code: string) => {
    const current = lifelistExclusions || [];
    if (!current.includes(code)) {
      setLifelistExclusions([...current, code]);
    }
    setSearchQuery("");
  };

  const handleRemoveExclusion = (code: string) => {
    const current = lifelistExclusions || [];
    setLifelistExclusions(current.filter((c) => c !== code));
  };

  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const cardStyle: ViewStyle = {
    borderRadius: 12,
    overflow: "hidden",
  };

  const isSearching = searchQuery.trim().length > 0;

  const searchContent =
    !lifelist || lifelist.length === 0 ? (
      <View style={tw`p-6 items-center`}>
        <Text style={tw`text-gray-500 text-base text-center`}>You haven't imported a life list yet</Text>
      </View>
    ) : searchResults.length === 0 ? (
      <View style={tw`p-6 items-center`}>
        <Text style={tw`text-gray-500 text-base text-center`}>No matching species found</Text>
      </View>
    ) : (
      searchResults.map((entry) => (
        <SearchResultItem key={entry.code} entry={entry} onAdd={() => handleAddExclusion(entry.code)} />
      ))
    );

  const exclusionsContent = excludedSpecies.map((code, index) => (
    <ExclusionItem
      key={code}
      code={code}
      isLast={index === excludedSpecies.length - 1}
      taxonomyMap={taxonomyMap}
      onRemove={() => handleRemoveExclusion(code)}
    />
  ));

  return (
    <ScrollView style={tw`flex-1 bg-gray-50`} contentContainerStyle={tw`pb-8`} keyboardShouldPersistTaps="handled">
      <View style={tw`px-4 pt-4 pb-4`}>
        <SearchInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search life list..." />
      </View>

      {isSearching && (
        <View style={tw`px-4 pb-4`}>
          <Text style={tw`text-gray-500 text-xs uppercase px-1 pb-2 font-medium tracking-wide`}>Search Results</Text>
          {useGlass ? (
            <GlassView style={cardStyle} glassEffectStyle="regular" tintColor="rgba(255, 255, 255, 0.7)">
              {searchContent}
            </GlassView>
          ) : (
            <View style={[cardStyle, tw`bg-white`]}>{searchContent}</View>
          )}
        </View>
      )}

      <View style={tw`px-4 pb-4`}>
        {!isSearching && excludedSpecies.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {!isSearching &&
              (useGlass ? (
                <GlassView style={cardStyle} glassEffectStyle="regular" tintColor="rgba(255, 255, 255, 0.7)">
                  {exclusionsContent}
                </GlassView>
              ) : (
                <View style={[cardStyle, tw`bg-white`]}>{exclusionsContent}</View>
              ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}
