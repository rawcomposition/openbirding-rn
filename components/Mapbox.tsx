import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Mapbox from "@rnmapbox/maps";
import Constants from "expo-constants";
import tw from "twrnc";
import debounce from "lodash/debounce";
import InfoModal from "./InfoModal";
import { getHotspotsWithinBounds } from "@/lib/database";
import { getMarkerColorIndex, markerColors } from "@/lib/utils";

type Hotspot = {
  id: string;
  lat: number;
  lng: number;
  species: number;
  open: boolean | null;
};

type MapboxMapProps = {
  style?: any;
  onPress?: (feature: any) => void;
  onHotspotSelect: (hotspotId: string) => void;
  hotspotId?: string | null;
  initialCenter: [number, number];
  initialZoom?: number;
  hasPreviousLocation?: boolean;
  onLocationSave?: (center: [number, number], zoom: number) => void;
};

const MIN_ZOOM = 7;

export default function MapboxMap({
  style,
  onPress,
  onHotspotSelect,
  initialCenter,
  initialZoom,
  hasPreviousLocation = false,
  onLocationSave,
}: MapboxMapProps) {
  const [isMapReady, setIsMapReady] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [isLoadingHotspots, setIsLoadingHotspots] = useState(false);
  const [isZoomedTooFarOut, setIsZoomedTooFarOut] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraCenter, setCameraCenter] = useState(initialCenter);
  const [cameraZoom, setCameraZoom] = useState(initialZoom);
  const [initialSet, setInitialSet] = useState(false);
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
  const debouncedSaveLocation = useMemo(
    () =>
      debounce((center: [number, number], zoom: number) => {
        if (onLocationSave) {
          onLocationSave(center, zoom);
        }
      }, 1000),
    [onLocationSave]
  );

  useEffect(() => {
    return () => {
      debouncedLoadHotspots.cancel();
      debouncedSaveLocation.cancel();
    };
  }, [debouncedLoadHotspots, debouncedSaveLocation]);

  const handleMapMove = async () => {
    if (!mapRef.current || !isMapReady) return;

    try {
      const bounds = await mapRef.current.getVisibleBounds();
      const zoom = await mapRef.current.getZoom();
      const center = await mapRef.current.getCenter();

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

      debouncedSaveLocation(center as [number, number], zoom);
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
          key={cameraKey}
          centerCoordinate={cameraCenter}
          zoomLevel={cameraZoom}
          animationMode="flyTo"
          animationDuration={2000}
        />

        {isMapReady && (
          <Mapbox.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
            animated={true}
            onUpdate={(loc) => {
              if (!initialSet && !hasPreviousLocation && loc.coords) {
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
