import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Mapbox from "@rnmapbox/maps";
import Constants from "expo-constants";
import tw from "twrnc";

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
      <Mapbox.MapView style={tw`flex-1`} onPress={handleMapPress} onDidFinishLoadingMap={() => setIsMapReady(true)}>
        <Mapbox.Camera
          centerCoordinate={initialCenter}
          zoomLevel={initialZoom}
          animationMode="flyTo"
          animationDuration={2000}
        />

        {isMapReady && <Mapbox.UserLocation visible={true} showsUserHeadingIndicator={true} animated={true} />}
      </Mapbox.MapView>
    </View>
  );
}
