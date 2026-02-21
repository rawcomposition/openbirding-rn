import { useInstalledPacks } from "@/hooks/useInstalledPacks";
import { useLocation } from "@/hooks/useLocation";
import { STATIC_PACKS_URL } from "@/lib/config";
import { fetchJson } from "@/lib/download";
import tw from "@/lib/tw";
import { StaticPack, StaticPacksIndex } from "@/lib/types";
import { calculateDistance } from "@/lib/utils";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { GlassContainer, GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import PackListRow from "./PackListRow";
import PacksNotice from "./PacksNotice";
import SearchInput from "./SearchInput";

type Tab = "all" | "installed" | "nearby";

const tabs = [
  { id: "installed", label: "Installed" },
  { id: "nearby", label: "Nearby" },
  { id: "all", label: "All" },
] as const;

const NEARBY_PACKS_LIMIT = 6;
const TAB_HEIGHT = 34;

function TabBar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const renderTab = (tab: (typeof tabs)[number]) => {
    const isActive = activeTab === tab.id;

    const label = (
      <Text
        style={tw.style("text-center font-medium text-sm", {
          "text-emerald-600": isActive,
          "text-gray-800": !isActive,
        })}
      >
        {tab.label}
      </Text>
    );

    if (isActive && useGlass) {
      return (
        <Pressable key={tab.id} onPress={() => onTabChange(tab.id)}>
          <GlassView
            style={[tw`px-5 items-center justify-center rounded-full`, { height: TAB_HEIGHT }]}
            glassEffectStyle="regular"
            isInteractive
          >
            {label}
          </GlassView>
        </Pressable>
      );
    }

    return (
      <Pressable
        key={tab.id}
        onPress={() => onTabChange(tab.id)}
        style={[
          tw`px-5 items-center justify-center rounded-full`,
          { height: TAB_HEIGHT },
          isActive && !useGlass && tw`bg-white shadow-sm`,
        ]}
      >
        {label}
      </Pressable>
    );
  };

  const tabElements = tabs.map(renderTab);

  return useGlass ? (
    <GlassContainer style={[tw`flex-row items-center justify-center`, { gap: 4 }]} spacing={4}>
      {tabElements}
    </GlassContainer>
  ) : (
    <View style={[tw`flex-row items-center justify-center`, { gap: 4 }]}>{tabElements}</View>
  );
}

export default function PacksList() {
  const { tab } = useLocalSearchParams<{ tab?: Tab }>();
  const [activeTab, setActiveTab] = useState<Tab>(tab || "nearby");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useQuery<StaticPack[]>({
    queryKey: ["packs"],
    queryFn: async () => {
      const response = await fetchJson<StaticPacksIndex>(STATIC_PACKS_URL);
      return response.packs;
    },
  });

  const { data: installedPackIds } = useInstalledPacks();
  const {
    location: userLocation,
    error: locationError,
    isLoading: isLoadingLocation,
  } = useLocation(activeTab === "nearby");

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setSearchQuery("");
  }, []);

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

  const keyExtractor = useCallback((item: StaticPack) => String(item.id), []);

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

  const renderPack = ({ item }: { item: StaticPack }) => <PackListRow pack={item} />;

  return (
    <View style={tw`flex-1`}>
      <View style={tw`px-4 py-3`}>
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
      </View>

      {activeTab === "all" && (
        <View style={tw`px-4 pb-3`}>
          <SearchInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search packs..." />
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
        <View style={tw`flex-1 mx-4 bg-white rounded-xl overflow-hidden`}>
          <FlashList
            key={activeTab}
            data={filteredPacks}
            renderItem={renderPack}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
}
