import React from "react";
import { View, Text } from "react-native";
import Mapbox from "@/components/Mapbox";
import tw from "twrnc";

export default function HomeScreen() {
  const handleMapPress = (feature: any) => {
    console.log("Map pressed:", feature);
  };

  return (
    <View style={tw`flex-1`}>
      <Mapbox onPress={handleMapPress} initialCenter={[-74.006, 40.7128]} initialZoom={12} />
    </View>
  );
}
