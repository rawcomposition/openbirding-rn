import React from "react";
import { View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Mapbox from "@/components/Mapbox";

export default function HomeScreen() {
  const handleMapPress = (feature: any) => {
    console.log("Map pressed:", feature);
  };

  return (
    <ThemedView className="flex-1">
      <ThemedView className="p-5 pt-15 pb-2.5">
        <ThemedText type="title">OpenBirding</ThemedText>
        <ThemedText className="mt-2 opacity-70">Explore birding hotspots and track your sightings</ThemedText>
      </ThemedView>

      <View className="flex-1 m-5 rounded-xl overflow-hidden shadow-lg">
        <Mapbox onPress={handleMapPress} initialCenter={[-74.006, 40.7128]} initialZoom={12} />
      </View>
    </ThemedView>
  );
}
