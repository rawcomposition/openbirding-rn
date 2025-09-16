import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Mapbox from "@rnmapbox/maps";
import Constants from "expo-constants";
import tw from "twrnc";
import debounce from "lodash/debounce";
import InfoModal from "./InfoModal";
import { getHotspotsWithinBounds } from "@/lib/database";

type Hotspot = {
  id: string;
  lat: number;
  lng: number;
  open: boolean | null;
};

type MapboxMapProps = {
  style?: any;
  onPress?: (feature: any) => void;
  onHotspotSelect: (hotspotId: string) => void;
  hotspotId?: string | null;
  initialCenter?: [number, number];
  initialZoom?: number;
};

const MIN_ZOOM = 7;

export default function MapboxMap({
  style,
  onPress,
  onHotspotSelect,
  initialCenter = [-73.7, 40.6],
  initialZoom = 10,
}: MapboxMapProps) {
  const [isMapReady, setIsMapReady] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [isLoadingHotspots, setIsLoadingHotspots] = useState(false);
  const [isZoomedTooFarOut, setIsZoomedTooFarOut] = useState(false);
  const mapRef = useRef<Mapbox.MapView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const accessToken = Constants.expoConfig?.extra?.MAPBOX_ACCESS_TOKEN;
    if (accessToken) {
      Mapbox.setAccessToken(accessToken);
    }
  }, []);

  const loadHotspots = useCallback(
    async (bounds: { west: number; south: number; east: number; north: number }) => {
      if (isLoadingHotspots) return;

      setIsLoadingHotspots(true);
      try {
        const hotspotsData = await getHotspotsWithinBounds(bounds.west, bounds.south, bounds.east, bounds.north);
        setHotspots(hotspotsData);
      } catch (error) {
        console.error("Failed to load hotspots:", error);
      } finally {
        setIsLoadingHotspots(false);
      }
    },
    [isLoadingHotspots]
  );

  const debouncedLoadHotspots = useMemo(() => debounce(loadHotspots, 300), [loadHotspots]);

  useEffect(() => {
    return () => {
      debouncedLoadHotspots.cancel();
    };
  }, [debouncedLoadHotspots]);

  const handleMapMove = async () => {
    if (!mapRef.current || !isMapReady) return;

    try {
      const bounds = await mapRef.current.getVisibleBounds();
      const zoom = await mapRef.current.getZoom();

      setIsZoomedTooFarOut(zoom < MIN_ZOOM);

      if (zoom >= MIN_ZOOM) {
        debouncedLoadHotspots({
          west: bounds[1][0], // southwest longitude
          south: bounds[1][1], // southwest latitude
          east: bounds[0][0], // northeast longitude
          north: bounds[0][1], // northeast latitude
        });
      } else {
        setHotspots([]);
      }
    } catch (error) {
      console.error("Failed to get map bounds:", error);
    }
  };

  const handleMapPress = (event: any) => {
    console.log("Map pressed:", event);

    // Handle ShapeSource press (hotspot clicks)
    if (event && event.features && event.features.length > 0) {
      const feature = event.features[0];
      if (feature.properties && feature.properties.id) {
        console.log("Hotspot clicked:", feature.properties.id);
        const hotspotId = feature.properties.id;
        onHotspotSelect(hotspotId);
        return;
      }
    }

    // Handle general map press
    if (onPress) {
      onPress(event);
    }
  };

  return (
    <View style={[tw`flex-1`, style]}>
      <Mapbox.MapView
        ref={mapRef}
        style={tw`flex-1`}
        onPress={handleMapPress}
        onDidFinishLoadingMap={() => setIsMapReady(true)}
        onDidFinishLoadingStyle={() => {
          if (isMapReady) {
            handleMapMove();
          }
        }}
        onCameraChanged={handleMapMove}
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

        {isMapReady && hotspots.length > 0 && (
          <Mapbox.ShapeSource
            id="hotspots-source"
            onPress={handleMapPress}
            shape={{
              type: "FeatureCollection",
              features: hotspots.map((hotspot) => ({
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [hotspot.lng, hotspot.lat],
                },
                properties: {
                  id: hotspot.id,
                  open: hotspot.open,
                },
              })),
            }}
          >
            <Mapbox.CircleLayer
              id="hotspot-points"
              style={{
                circleRadius: 7,
                circleColor: [
                  "case",
                  ["==", ["get", "open"], true],
                  "#3b82f6",
                  ["==", ["get", "open"], false],
                  "#374151",
                  "#9ca3af",
                ],
                circleStrokeWidth: 0.75,
                circleStrokeColor: "#ffffff",
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {isZoomedTooFarOut && (
        <View style={[tw`absolute left-0 right-0 items-center`, { top: insets.top + 16 }]}>
          <View style={tw`bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg`}>
            <Text style={tw`text-sm text-gray-700`}>Zoom in to see hotspots</Text>
          </View>
        </View>
      )}

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
