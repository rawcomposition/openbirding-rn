import React from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import tw from "twrnc";

type Pack = {
  id: number;
  region: string;
  hotspots: number;
  name: string;
};

type PacksResponse = {
  data: Pack[];
  count: number;
};

export default function PacksList() {
  const { data, isLoading, error } = useQuery<PacksResponse>({
    queryKey: ["/packs"],
  });

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

  const renderPack = ({ item }: { item: Pack }) => (
    <View style={tw`bg-white p-4 m-2 rounded-lg border border-gray-200 shadow-sm`}>
      <Text style={tw`text-gray-900 text-lg font-semibold`}>{item.name}</Text>
      <Text style={tw`text-gray-700`}>{item.hotspots.toLocaleString()} hotspots</Text>
    </View>
  );

  return (
    <View style={tw`flex-1`}>
      <FlatList
        data={data?.data || []}
        renderItem={renderPack}
        keyExtractor={(item) => item.id.toString()}
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
