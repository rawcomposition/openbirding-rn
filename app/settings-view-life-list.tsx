import tw from "@/lib/tw";
import { LifeListEntry, useSettingsStore } from "@/stores/settingsStore";
import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useNavigation } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Platform, Text, TextInput, View, ViewStyle } from "react-native";

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

function LifeListItem({ item, isLast }: { item: LifeListEntry; isLast: boolean }) {
  const borderStyle = isLast ? {} : tw`border-b border-gray-200/50`;

  return (
    <View style={[tw`px-4 py-3`, borderStyle]}>
      <Text style={tw`text-gray-900 text-base font-medium`}>{item.code}</Text>
      <Text style={tw`text-gray-500 text-sm mt-0.5`}>{item.date}</Text>
    </View>
  );
}

export default function ViewLifeListPage() {
  const navigation = useNavigation();
  const lifelist = useSettingsStore((state) => state.lifelist);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const title = lifelist?.length ? `Life List (${lifelist.length})` : "Life List";
    navigation.setOptions({ title });
  }, [navigation, lifelist?.length]);

  const filteredList = useMemo(() => {
    if (!lifelist) return [];
    if (!searchQuery.trim()) return lifelist;

    const query = searchQuery.toLowerCase().trim();
    return lifelist.filter((item) => item.code.toLowerCase().includes(query));
  }, [lifelist, searchQuery]);

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

  const renderItem = ({ item, index }: { item: LifeListEntry; index: number }) => (
    <LifeListItem item={item} isLast={index === filteredList.length - 1} />
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
