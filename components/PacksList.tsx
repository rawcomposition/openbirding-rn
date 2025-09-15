import React from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import tw from "twrnc";
import { Pack } from "@/lib/types";
import { useInstallPack } from "@/hooks/useInstallPack";

export default function PacksList() {
  const { data, isLoading, error } = useQuery<Pack[]>({
    queryKey: ["/packs"],
  });

  const { installPack, installingId, progress, isInstalling } = useInstallPack();

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

  const renderPack = ({ item }: { item: Pack }) => {
    const installing = installingId === item.id;
    const currentProgress = installing ? progress : 0;
    const isInstallingPhase = installing && isInstalling;

    return (
      <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200/70 bg-white`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-gray-900 text-lg font-medium`}>{item.name}</Text>
          <Text style={tw`text-gray-600 text-sm`}>{item.hotspots.toLocaleString()} hotspots</Text>
        </View>
        <View style={tw`flex-row items-center`}>
          <View style={tw`relative`}>
            <Pressable
              onPress={() => installPack(item)}
              disabled={installingId !== null}
              style={tw.style(`py-2 rounded-lg border border-gray-200 relative overflow-hidden`, {
                "w-20": !isInstallingPhase,
              })}
            >
              {installing && (
                <View
                  pointerEvents="none"
                  style={tw.style(`absolute top-0 left-0 bottom-0 bg-slate-200`, { width: `${currentProgress}%` })}
                />
              )}
              <Text style={tw`font-medium text-center mx-4`}>
                {isInstallingPhase ? "Installing" : installing ? `${currentProgress}%` : "Install"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={tw`flex-1`}>
      <FlatList
        data={data || []}
        renderItem={renderPack}
        keyExtractor={(item) => item.id.toString()}
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
