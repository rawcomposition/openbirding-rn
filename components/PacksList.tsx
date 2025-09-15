import React from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import tw from "twrnc";
import { Pack } from "@/lib/types";
import { useInstallPack } from "@/hooks/useInstallPack";
import { useInstalledPacks } from "@/hooks/useInstalledPacks";

export default function PacksList() {
  const { data, isLoading, error } = useQuery<Pack[]>({
    queryKey: ["/packs"],
  });

  const { data: installedPackIds } = useInstalledPacks();
  const { installPack, uninstallPack, installingId, operationType } = useInstallPack();

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
    const isCurrentlyInstalling = installingId === item.id;
    const isInstalled = installedPackIds?.has(item.id) ?? false;

    // Determine what we're doing and how to style it
    const isUninstalling = isCurrentlyInstalling && operationType === "uninstall";
    const isDownloading = isCurrentlyInstalling && operationType === "install";
    const shouldShowRedStyling = (isInstalled && !isCurrentlyInstalling) || isUninstalling;

    // Determine button text
    const getButtonText = () => {
      if (isUninstalling) return "Uninstalling";
      if (isDownloading) return "Downloading";
      return isInstalled ? "Uninstall" : "Install";
    };

    return (
      <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200/70 bg-white`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-gray-900 text-lg font-medium`}>{item.name}</Text>
          <Text style={tw`text-gray-600 text-sm`}>{item.hotspots.toLocaleString()} hotspots</Text>
        </View>
        <View style={tw`flex-row items-center`}>
          <View style={tw`relative`}>
            <Pressable
              onPress={() => (isInstalled ? uninstallPack(item) : installPack(item))}
              disabled={installingId !== null}
              style={tw.style(`py-2 rounded-lg border`, {
                "border-gray-200": !shouldShowRedStyling,
                "border-red-200": shouldShowRedStyling,
              })}
            >
              <Text
                style={tw.style(`font-medium text-center mx-4`, {
                  "text-gray-700": !shouldShowRedStyling,
                  "text-red-700": shouldShowRedStyling,
                })}
              >
                {getButtonText()}
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
