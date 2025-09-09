import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Mapbox from "@rnmapbox/maps";
import Constants from "expo-constants";
import tw from "twrnc";
import InfoModal from "./InfoModal";

interface MapboxMapProps {
  style?: any;
  onPress?: (feature: any) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export default function MapboxMap({
  style,
  onPress,
  initialCenter = [-74.006, 40.7128],
  initialZoom = 10,
}: MapboxMapProps) {
  const [isMapReady, setIsMapReady] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const accessToken = Constants.expoConfig?.extra?.MAPBOX_ACCESS_TOKEN;
    if (accessToken) {
      Mapbox.setAccessToken(accessToken);
    }
  }, []);

  const handleMapPress = (feature: any) => {
    if (onPress) {
      onPress(feature);
    }
  };

  return (
    <View style={[tw`flex-1`, style]}>
      <Mapbox.MapView
        style={tw`flex-1`}
        onPress={handleMapPress}
        onDidFinishLoadingMap={() => setIsMapReady(true)}
        scaleBarEnabled={false}
        attributionEnabled={false}
        logoPosition={{ bottom: 4, left: 5 }}
      >
        <Mapbox.Camera
          centerCoordinate={initialCenter}
          zoomLevel={initialZoom}
          animationMode="flyTo"
          animationDuration={2000}
        />

        {isMapReady && <Mapbox.UserLocation visible={true} showsUserHeadingIndicator={true} animated={true} />}
      </Mapbox.MapView>

      <TouchableOpacity
        style={[
          tw`absolute left-24 w-5 h-5 bg-white/80 border border-black/40 rounded-full items-center justify-center`,
          { bottom: insets.bottom + 5 },
        ]}
        onPress={() => setShowAttribution(true)}
      >
        <Text style={tw`text-xs text-gray-600 font-bold`}>i</Text>
      </TouchableOpacity>

      <InfoModal
        visible={showAttribution}
        onClose={() => setShowAttribution(false)}
        title="Map Attribution"
        content={
          <View>
            <Text style={tw`text-sm text-gray-700 mb-2`}>© OpenStreetMap contributors</Text>
            <Text style={tw`text-sm text-gray-700 mb-2`}>© Mapbox</Text>
            <TouchableOpacity onPress={() => Linking.openURL("https://www.openstreetmap.org/edit")} style={tw`mb-2`}>
              <Text style={tw`text-sm text-blue-500 underline`}>Improve this map</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
