import { useTaxonomyMap } from "@/hooks/useTaxonomy";
import tw from "@/lib/tw";
import { LifeListEntry, useSettingsStore } from "@/stores/settingsStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useNavigation } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, findNodeHandle, FlatList, Linking, Platform, Text, TextInput, TouchableOpacity, View, ViewStyle } from "react-native";
import Toast from "react-native-toast-message";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parsed = dayjs(dateStr);
  return parsed.isValid() ? parsed.format("MMM D, YYYY") : dateStr;
}

function EmptyState() {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const cardStyle: ViewStyle = {
    borderRadius: 12,
    overflow: "hidden",
  };

  const content = (
    <View style={tw`p-6 items-center`}>
      <Ionicons name="list-outline" size={48} color={tw.color("gray-400")} style={tw`mb-3`} />
      <Text style={tw`text-gray-500 text-base text-center`}>No life list imported yet</Text>
      <Text style={tw`text-gray-400 text-sm text-center mt-1`}>Import your eBird life list from settings</Text>
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

function NoResults() {
  return (
    <View style={tw`p-6 items-center`}>
      <Ionicons name="search-outline" size={48} color={tw.color("gray-400")} style={tw`mb-3`} />
      <Text style={tw`text-gray-500 text-base text-center`}>No matching species found</Text>
    </View>
  );
}

function LifeListItem({
  item,
  isLast,
  taxonomyMap,
  onRemove,
  isExcluded,
}: {
  item: LifeListEntry;
  isLast: boolean;
  taxonomyMap: Map<string, string>;
  onRemove: () => void;
  isExcluded: boolean;
}) {
  const borderStyle = isLast ? {} : tw`border-b border-gray-200/50`;
  const speciesName = taxonomyMap.get(item.code) ?? `Unknown (${item.code})`;
  const menuRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
  const { showActionSheetWithOptions } = useActionSheet();

  const showMenu = () => {
    const anchor = menuRef.current ? findNodeHandle(menuRef.current) : undefined;
    showActionSheetWithOptions(
      {
        options: ["View in Merlin", "Remove from Life List", "Cancel"],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
        anchor: anchor ?? undefined,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          Linking.openURL(`merlinbirdid://species/${item.code}`).catch(() => {
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
        <View style={tw`flex-row items-center`}>
          <Text style={tw`text-gray-900 text-base font-medium`}>{speciesName}</Text>
          {isExcluded && (
            <View style={tw`ml-2 bg-orange-100 px-2 py-0.5 rounded-full`}>
              <Text style={tw`text-orange-700 text-xs font-medium`}>Excluded</Text>
            </View>
          )}
        </View>
        <Text style={tw`text-gray-500 text-sm mt-0.5`}>{formatDate(item.date)}</Text>
      </View>
      <TouchableOpacity ref={menuRef} onPress={showMenu} style={tw`p-2 -mr-2`}>
        <Ionicons name="ellipsis-horizontal" size={18} color={tw.color("gray-400")} />
      </TouchableOpacity>
    </View>
  );
}

export default function ViewLifeListPage() {
  const navigation = useNavigation();
  const lifelist = useSettingsStore((state) => state.lifelist);
  const setLifelist = useSettingsStore((state) => state.setLifelist);
  const lifelistExclusions = useSettingsStore((state) => state.lifelistExclusions);
  const { taxonomyMap } = useTaxonomyMap();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const title = lifelist?.length ? `Life List (${lifelist.length})` : "Life List";
    navigation.setOptions({ title });
  }, [navigation, lifelist?.length]);

  const filteredList = useMemo(() => {
    if (!lifelist) return [];

    const sorted = [...lifelist].sort((a, b) => b.date.localeCompare(a.date));

    if (!searchQuery.trim()) return sorted;

    const query = searchQuery.toLowerCase().trim();
    return sorted.filter((item) => {
      const speciesName = taxonomyMap.get(item.code) ?? "";
      return item.code.toLowerCase().includes(query) || speciesName.toLowerCase().includes(query);
    });
  }, [lifelist, searchQuery, taxonomyMap]);

  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const cardStyle: ViewStyle = {
    borderRadius: 12,
    overflow: "hidden",
  };

  if (!lifelist || lifelist.length === 0) {
    return (
      <View style={tw`flex-1 bg-gray-100 px-4 pt-6`}>
        <EmptyState />
      </View>
    );
  }

  const handleRemove = (item: LifeListEntry) => {
    if (!lifelist) return;
    const updated = lifelist.filter(
      (entry) => !(entry.code === item.code && entry.checklistId === item.checklistId)
    );
    setLifelist(updated);
    const speciesName = taxonomyMap.get(item.code) ?? item.code;
    Toast.show({ type: "success", text1: `Removed ${speciesName}` });
  };

  const renderItem = ({ item, index }: { item: LifeListEntry; index: number }) => (
    <LifeListItem
      item={item}
      isLast={index === filteredList.length - 1}
      taxonomyMap={taxonomyMap}
      onRemove={() => handleRemove(item)}
      isExcluded={lifelistExclusions?.includes(item.code) ?? false}
    />
  );

  const listContent = (
    <FlatList
      data={filteredList}
      renderItem={renderItem}
      keyExtractor={(item) => `${item.code}-${item.checklistId}`}
      ListEmptyComponent={<NoResults />}
      contentContainerStyle={filteredList.length === 0 ? tw`flex-1` : undefined}
    />
  );

  return (
    <View style={tw`flex-1 bg-gray-100`}>
      <View style={tw`px-4 pt-4 pb-4`}>
        <View style={tw`flex-row items-center bg-white rounded-lg px-3 py-2`}>
          <Ionicons name="search" size={20} color={tw.color("gray-400")} style={tw`mr-2`} />
          <TextInput
            style={tw`flex-1 text-base text-gray-900`}
            placeholder="Search..."
            placeholderTextColor={tw.color("gray-400")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={tw`flex-1 px-4 pb-4`}>
        {useGlass ? (
          <GlassView style={[cardStyle, tw`flex-1`]} glassEffectStyle="regular" tintColor="rgba(255, 255, 255, 0.7)">
            {listContent}
          </GlassView>
        ) : (
          <View style={[cardStyle, tw`bg-white flex-1`]}>{listContent}</View>
        )}
      </View>
    </View>
  );
}
