import { useTaxonomy, useTaxonomyMap } from "@/hooks/useTaxonomy";
import tw from "@/lib/tw";
import { useSettingsStore } from "@/stores/settingsStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useNavigation } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  findNodeHandle,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Toast from "react-native-toast-message";

type TaxonomyEntry = {
  name: string;
  sciName: string;
  code: string;
};

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
        Search above to add species to exclude from targets
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

function SearchResultItem({ entry, onAdd }: { entry: TaxonomyEntry; onAdd: () => void }) {
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
  const menuRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
  const { showActionSheetWithOptions } = useActionSheet();

  const showMenu = () => {
    const anchor = menuRef.current ? findNodeHandle(menuRef.current) : undefined;
    showActionSheetWithOptions(
      {
        options: ["View in Merlin", "Remove from Exclusions", "Cancel"],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
        anchor: anchor ?? undefined,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          Linking.openURL(`merlinbirdid://species/${code}`).catch(() => {
            Alert.alert("Cannot Open Merlin", "Make sure the Merlin Bird ID app is installed.");
          });
        } else if (buttonIndex === 1) {
          onRemove();
        }
      }
    );
  };

  return (
    <View style={[tw`px-4 py-3 flex-row items-center`, borderStyle]}>
      <View style={tw`flex-1`}>
        <Text style={tw`text-gray-900 text-base font-medium`}>{speciesName}</Text>
      </View>
      <TouchableOpacity ref={menuRef} onPress={showMenu} style={tw`p-2 -mr-2`}>
        <Ionicons name="ellipsis-horizontal" size={18} color={tw.color("gray-400")} />
      </TouchableOpacity>
    </View>
  );
}

export default function LifeListExclusionsPage() {
  const navigation = useNavigation();
  const lifelistExclusions = useSettingsStore((state) => state.lifelistExclusions);
  const setLifelistExclusions = useSettingsStore((state) => state.setLifelistExclusions);
  const { data: taxonomy } = useTaxonomy();
  const { taxonomyMap } = useTaxonomyMap();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const title = lifelistExclusions?.length ? `Exclusions (${lifelistExclusions.length})` : "Exclusions";
    navigation.setOptions({ title });
  }, [navigation, lifelistExclusions?.length]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !taxonomy) return [];
    const stripPunctuation = (s: string) => s.replace(/[^\w\s]/g, "");
    const query = stripPunctuation(searchQuery.toLowerCase().trim());
    const exclusionSet = new Set(lifelistExclusions || []);

    return taxonomy
      .filter(
        (entry) =>
          !exclusionSet.has(entry.code) &&
          (stripPunctuation(entry.name.toLowerCase()).includes(query) ||
            entry.code.toLowerCase().includes(query))
      )
      .slice(0, 10);
  }, [searchQuery, taxonomy, lifelistExclusions]);

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
      const speciesName = taxonomyMap.get(code) || code;
      Toast.show({ type: "success", text1: `Added ${speciesName}` });
    }
    setSearchQuery("");
  };

  const handleRemoveExclusion = (code: string) => {
    const current = lifelistExclusions || [];
    setLifelistExclusions(current.filter((c) => c !== code));
    const speciesName = taxonomyMap.get(code) || `Unknown (${code})`;
    Toast.show({ type: "success", text1: `Removed ${speciesName}` });
  };

  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const cardStyle: ViewStyle = {
    borderRadius: 12,
    overflow: "hidden",
  };

  const isSearching = searchQuery.trim().length > 0;

  const searchContent =
    searchResults.length === 0 ? (
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
    <ScrollView style={tw`flex-1 bg-gray-100`} contentContainerStyle={tw`pb-8`} keyboardShouldPersistTaps="handled">
      <View style={tw`px-4 pt-4 pb-4`}>
        <View style={tw`flex-row items-center bg-white rounded-lg px-3 py-2`}>
          <Ionicons name="search" size={20} color={tw.color("gray-400")} style={tw`mr-2`} />
          <TextInput
            style={tw`flex-1 text-base text-gray-900`}
            placeholder="Search species to exclude..."
            placeholderTextColor={tw.color("gray-400")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
        </View>
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
            {!isSearching && (
              <Text style={tw`text-gray-500 text-xs uppercase px-1 pb-2 font-medium tracking-wide`}>
                Excluded Species
              </Text>
            )}
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
