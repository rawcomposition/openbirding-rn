import React from "react";
import { View, Text } from "react-native";
import Mapbox from "@/components/Mapbox";
import tw from "twrnc";

export default function HomeScreen() {
  const handleMapPress = (feature: any) => {
    console.log("Map pressed:", feature);
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <View style={tw`p-5 pt-15 pb-2.5`}>
        <Text style={tw`text-3xl font-bold text-black`}>OpenBirding</Text>
        <Text style={tw`mt-2 text-gray-600`}>Explore birding hotspots and track your sightings</Text>
      </View>

      <View style={tw`flex-1 m-5 rounded-xl overflow-hidden shadow-lg`}>
        <Mapbox onPress={handleMapPress} initialCenter={[-74.006, 40.7128]} initialZoom={12} />
      </View>
    </View>
  );
}
