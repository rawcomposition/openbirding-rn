import React, { useState, useRef, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Mapbox from "@rnmapbox/maps";
import Constants from "expo-constants";
import tw from "twrnc";
import debounce from "lodash/debounce";
import InfoModal from "./InfoModal";
import { getMarkerColorIndex, markerColors } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getHotspotsWithinBounds } from "@/lib/database";

type MapboxMapProps = {
  style?: any;
  onPress?: (feature: any) => void;
  onHotspotSelect: (hotspotId: string) => void;
  hotspotId?: string | null;
  initialCenter: [number, number];
  initialZoom: number;
  hasSavedLocation?: boolean;
  onLocationSave?: (center: [number, number], zoom: number) => void;
};

const MIN_ZOOM = 7;

export default function MapboxMap({
  style,
  onPress,
  onHotspotSelect,
  initialCenter,
  initialZoom,
  onLocationSave,
  hasSavedLocation,
}: MapboxMapProps) {
  const [isMapReady, setIsMapReady] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);
  const [isZoomedTooFarOut, setIsZoomedTooFarOut] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraCenter, setCameraCenter] = useState(initialCenter);
  const [cameraZoom, setCameraZoom] = useState(initialZoom);
  const [initialSet, setInitialSet] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<{
    west: number;
    south: number;
    east: number;
    north: number;
  } | null>(null);
  const mapRef = useRef<Mapbox.MapView>(null);
  const insets = useSafeAreaInsets();

  const { data: hotspots = [] } = useQuery({
    queryKey: ["hotspots", currentBounds],
    queryFn: async () => {
      if (!currentBounds) return [];
      return getHotspotsWithinBounds(currentBounds.west, currentBounds.south, currentBounds.east, currentBounds.north);
    },
    enabled: isMapReady && !isZoomedTooFarOut && currentBounds !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const initializeMap = () => {
    const accessToken = Constants.expoConfig?.extra?.MAPBOX_ACCESS_TOKEN;
    if (accessToken) {
      Mapbox.setAccessToken(accessToken);
    }
  };

  const getBoundsFromMap = async () => {
    if (!mapRef.current) return null;

    try {
      const bounds = await mapRef.current.getVisibleBounds();
      const zoom = await mapRef.current.getZoom();

      if (zoom >= MIN_ZOOM) {
        return {
          west: bounds[1][0],
          south: bounds[1][1],
          east: bounds[0][0],
          north: bounds[0][1],
        };
      }
      return null;
    } catch (error) {
      console.error("Failed to get bounds:", error);
      return null;
    }
  };

  const getInitialBounds = async () => {
    const bounds = await getBoundsFromMap();
    if (bounds) {
      setCurrentBounds(bounds);
    }
  };

  const debouncedSetBoundsRef = useRef(
    debounce((bounds: { west: number; south: number; east: number; north: number }) => {
      setCurrentBounds(bounds);
    }, 300)
  );

  const debouncedSaveLocationRef = useRef(
    debounce((center: [number, number], zoom: number) => {
      if (onLocationSave) {
        onLocationSave(center, zoom);
      }
    }, 1000)
  );

  const handleMapMove = async () => {
    if (!mapRef.current || !isMapReady) return;

    try {
      const bounds = await getBoundsFromMap();
      const center = await mapRef.current.getCenter();
      const zoom = await mapRef.current.getZoom();

      setIsZoomedTooFarOut(zoom < MIN_ZOOM);

      if (bounds) {
        debouncedSetBoundsRef.current(bounds);
      } else {
        setCurrentBounds(null);
      }
      debouncedSaveLocationRef.current(center as [number, number], zoom);
    } catch (error) {
      console.error("Failed to get map bounds:", error);
    }
  };

  const handleMapPress = (event: any) => {
    if (event && event.features && event.features.length > 0) {
      const feature = event.features[0];
      if (feature.properties && feature.properties.id) {
        const hotspotId = feature.properties.id;
        onHotspotSelect(hotspotId);
        return;
      }
    }

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
        onDidFinishLoadingMap={() => {
          initializeMap();
          setIsMapReady(true);
          handleMapMove();
          getInitialBounds();
        }}
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
          key={cameraKey}
          centerCoordinate={cameraCenter}
          zoomLevel={cameraZoom}
          animationMode={cameraKey === 0 ? "none" : "flyTo"}
          animationDuration={cameraKey === 0 ? 0 : 2000}
        />

        {isMapReady && (
          <Mapbox.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
            animated={true}
            onUpdate={(loc) => {
              if (hasSavedLocation || !loc.coords) return;
              if (!initialSet) {
                setCameraCenter([loc.coords.longitude, loc.coords.latitude]);
                setCameraZoom(14);
                setCameraKey((prev) => prev + 1);
                setInitialSet(true);
                if (onLocationSave) {
                  onLocationSave([loc.coords.longitude, loc.coords.latitude], 14);
                }
              }
            }}
          />
        )}

        {isMapReady && hotspots.length > 0 && (
          <Mapbox.ShapeSource
            id="hotspots-source"
            onPress={handleMapPress}
            shape={{
              type: "FeatureCollection",
              features: hotspots.map((hotspot) => {
                const colorIndex = getMarkerColorIndex(hotspot.species || 0);
                return {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: [hotspot.lng, hotspot.lat],
                  },
                  properties: {
                    shade: colorIndex,
                    id: hotspot.id,
                  },
                };
              }),
            }}
          >
            <Mapbox.CircleLayer
              id="hotspot-points"
              style={{
                circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 7, 12, 10],
                circleColor: [
                  "match",
                  ["get", "shade"],
                  0,
                  markerColors[0],
                  1,
                  markerColors[1],
                  2,
                  markerColors[2],
                  3,
                  markerColors[3],
                  4,
                  markerColors[4],
                  5,
                  markerColors[5],
                  6,
                  markerColors[6],
                  7,
                  markerColors[7],
                  8,
                  markerColors[8],
                  9,
                  markerColors[9],
                  markerColors[0],
                ],
                circleStrokeWidth: 0.5,
                circleStrokeColor: "#555",
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {isZoomedTooFarOut && (
        <View style={[tw`absolute left-0 right-0 items-center`, { top: insets.top + 16 }]}>
          <View style={tw`bg-white/90 rounded-lg p-3 shadow-lg`}>
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
