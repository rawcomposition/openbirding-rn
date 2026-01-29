import tw from "@/lib/tw";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

type MapLayerType = "default" | "satellite";

type MapLayerSwitcherProps = {
  currentLayer: MapLayerType;
  onLayerChange: (layer: MapLayerType) => void;
};

export default function MapLayerSwitcher({ currentLayer, onLayerChange }: MapLayerSwitcherProps) {
  const layers = [
    {
      id: "default" as MapLayerType,
      label: "Default",
      thumbnail: require("../assets/images/map-thumb.png"),
    },
    {
      id: "satellite" as MapLayerType,
      label: "Satellite",
      thumbnail: require("../assets/images/satellite-thumb.png"),
    },
  ];

  return (
    <View style={tw`p-4 pt-3 border-b border-gray-200`}>
      <View style={tw`flex-row gap-2`}>
        {layers.map((layer) => (
          <TouchableOpacity
            key={layer.id}
            onPress={() => onLayerChange(layer.id)}
            style={tw`items-center px-2`}
            activeOpacity={0.7}
          >
            <View
              style={tw`w-20 h-20 rounded-2xl mb-2 border-[2.5px] p-0.5 ${
                currentLayer === layer.id ? "border-blue-500" : "border-transparent"
              }`}
            >
              <Image source={layer.thumbnail} style={tw`w-full h-full rounded-xl`} resizeMode="cover" />
            </View>
            <Text style={tw`text-sm font-medium ${currentLayer === layer.id ? "text-blue-600" : "text-gray-700"}`}>
              {layer.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
