import { useInstalledPacks } from "@/hooks/useInstalledPacks";
import { useLocation } from "@/hooks/useLocation";
import tw from "@/lib/tw";
import { Pack } from "@/lib/types";
import { calculateDistance } from "@/lib/utils";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import PackListRow from "./PackListRow";
import PacksNotice from "./PacksNotice";

type Tab = "all" | "installed" | "nearby";

const tabs = [
  { id: "installed", label: "Installed" },
  { id: "nearby", label: "Nearby" },
  { id: "all", label: "All" },
] as const;

const NEARBY_PACKS_LIMIT = 6;

export default function PacksList() {
  const { tab } = useLocalSearchParams<{ tab?: Tab }>();
  const [activeTab, setActiveTab] = useState<Tab>(tab || "nearby");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useQuery<Pack[]>({
    queryKey: ["/packs"],
  });

  const installedPackIds = useInstalledPacks();
  const {
    location: userLocation,
    error: locationError,
    isLoading: isLoadingLocation,
  } = useLocation(activeTab === "nearby");

  const filteredPacks = useMemo(() => {
    if (!data) return [];

    let packs = data;

    if (activeTab === "installed") {
      packs = packs.filter((pack) => installedPackIds?.has(pack.id));
    }

    if (activeTab === "nearby") {
      if (!userLocation) return [];

      const packsWithClusters = packs.filter((pack) => pack.clusters && pack.clusters.length > 0);
      const packsWithDistance = packsWithClusters.map((pack) => {
        let minDistance = Infinity;
        for (const cluster of pack.clusters!) {
          const [clusterLat, clusterLng] = cluster;
          const distance = calculateDistance(userLocation.lat, userLocation.lng, clusterLat, clusterLng);
          if (distance < minDistance) {
            minDistance = distance;
          }
        }
        return {
          pack,
          distance: minDistance,
        };
      });
      packsWithDistance.sort((a, b) => a.distance - b.distance);
      return packsWithDistance.slice(0, NEARBY_PACKS_LIMIT).map((item) => item.pack);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      packs = packs.filter((pack) => pack.name.toLowerCase().includes(query));
    }

    return packs;
  }, [data, activeTab, installedPackIds, searchQuery, userLocation]);

  const keyExtractor = useCallback((item: Pack, i: number) => `${i}-${item.id}`, []);

  if (isLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color={tw.color("blue-500")} />
        <Text style={tw`mt-4 text-gray-900 text-base`}>Loading packs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Text style={tw`text-red-500 text-center text-base`}>Error loading packs: {error.message}</Text>
      </View>
    );
  }

  const hasInstalledPacks = installedPackIds && installedPackIds.size > 0;
  const showEmptyState = activeTab === "installed" && !hasInstalledPacks;
  const showNoResults =
    activeTab === "nearby" && (isLoadingLocation || locationError !== null || filteredPacks.length === 0);

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
              style={tw.style(`text-center font-medium text-sm`, {
                "text-blue-600": activeTab === tab.id,
                "text-gray-500": activeTab !== tab.id,
              })}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "all" && (
        <View style={tw`px-4 py-3 bg-white border-b border-gray-200`}>
          <TextInput
            style={tw`bg-gray-100 rounded-lg px-3 py-2 text-base leading-5`}
            placeholder="Search packs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            returnKeyType="search"
          />
        </View>
      )}

      {showEmptyState ? (
        <View style={tw`flex-1 justify-center items-center px-8 -mt-16`}>
          <PacksNotice variant="card" onPress={() => setActiveTab("nearby")} />
        </View>
      ) : showNoResults ? (
        <View style={tw`flex-1 justify-center items-center px-8`}>
          <Text style={tw`text-gray-500 text-base`}>
            {isLoadingLocation ? "Getting your location..." : locationError ? locationError : "No Results"}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredPacks}
          renderItem={renderPack}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}
