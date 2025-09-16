import React, { useState, useMemo } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable, TextInput } from "react-native";
import { useQuery } from "@tanstack/react-query";
import tw from "twrnc";
import { Pack } from "@/lib/types";
import { useInstalledPacks } from "@/hooks/useInstalledPacks";
import PackListRow from "./PackListRow";

const tabs = [
  { id: "installed", label: "Installed" },
  { id: "all", label: "All Packs" },
] as const;

export default function PacksList() {
  const [activeTab, setActiveTab] = useState<"all" | "installed">("installed");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useQuery<Pack[]>({
    queryKey: ["/packs"],
  });

  const { data: installedPackIds } = useInstalledPacks();

  const filteredPacks = useMemo(() => {
    if (!data) return [];

    let packs = data;

    if (activeTab === "installed") {
      packs = packs.filter((pack) => installedPackIds?.has(pack.id));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      packs = packs.filter((pack) => pack.name.toLowerCase().includes(query));
    }

    return packs;
  }, [data, activeTab, installedPackIds, searchQuery]);

  if (isLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={tw`mt-4 text-gray-900`}>Loading packs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Text style={tw`text-red-500 text-center`}>Error loading packs: {error.message}</Text>
      </View>
    );
  }

  const hasInstalledPacks = installedPackIds && installedPackIds.size > 0;
  const showEmptyState = activeTab === "installed" && !hasInstalledPacks;

  const renderPack = ({ item }: { item: Pack }) => (
    <PackListRow id={item.id} name={item.name} hotspots={item.hotspots} />
  );

  return (
    <View style={tw`flex-1`}>
      <View style={tw`flex-row bg-white border-b border-gray-200`}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              setActiveTab(tab.id);
              setSearchQuery("");
            }}
            style={tw.style(`flex-1 py-3 px-4 border-b-2`, {
              "border-blue-500": activeTab === tab.id,
              "border-transparent": activeTab !== tab.id,
            })}
          >
            <Text
              style={tw.style(`text-center font-medium`, {
                "text-blue-600": activeTab === tab.id,
                "text-gray-500": activeTab !== tab.id,
              })}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={tw`px-4 py-3 bg-white border-b border-gray-200`}>
        <TextInput
          style={tw`bg-gray-100 rounded-lg px-3 py-2 text-gray-900`}
          placeholder="Search packs..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {showEmptyState ? (
        <View style={tw`flex-1 justify-center items-center px-8 -mt-16`}>
          <View style={tw`items-center`}>
            <Text style={tw`text-gray-800 text-lg text-center mb-4`}>No packs installed yet</Text>
            <Text style={tw`text-gray-700 text-center mb-6`}>Download hotspot packs to get started</Text>
            <Pressable onPress={() => setActiveTab("all")} style={tw`bg-blue-500 px-6 py-3 rounded-lg`}>
              <Text style={tw`text-white font-medium`}>Download Packs</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredPacks}
          renderItem={renderPack}
          keyExtractor={(item) => item.id.toString()}
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
