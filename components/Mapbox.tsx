import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Mapbox from "@rnmapbox/maps";
import Constants from "expo-constants";
import tw from "twrnc";
import debounce from "lodash/debounce";
import { useQuery } from "@tanstack/react-query";
import InfoModal from "./InfoModal";
import { getMarkerColorIndex, markerColors, padBoundsBySize } from "@/lib/utils";
import { getHotspotsWithinBounds } from "@/lib/database";

type Bounds = { west: number; south: number; east: number; north: number };

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
const DEFAULT_USER_ZOOM = 11;

export default function MapboxMap({
  style,
  onPress,
  onHotspotSelect,
  initialCenter,
  initialZoom,
  hasSavedLocation,
  onLocationSave,
}: MapboxMapProps) {
  const insets = useSafeAreaInsets();

  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);

  const firstIdleRef = useRef(false);
  const centeredToUserRef = useRef(false);
  const userCoordRef = useRef<[number, number] | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);
  const [isZoomedTooFarOut, setIsZoomedTooFarOut] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(null);

  useEffect(() => {
    const token = Constants.expoConfig?.extra?.MAPBOX_ACCESS_TOKEN;
    if (token) Mapbox.setAccessToken(token);
  }, []);

  const { data: hotspots = [] } = useQuery({
    queryKey: ["hotspots", bounds],
    queryFn: async () => {
      if (!bounds) return [];
      const paddedBounds = padBoundsBySize(bounds);
      return getHotspotsWithinBounds(paddedBounds.west, paddedBounds.south, paddedBounds.east, paddedBounds.north);
    },
    enabled: isMapReady && !isZoomedTooFarOut && bounds !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    placeholderData: (prev) => prev,
  });

  const debouncedSetBounds = useMemo(() => debounce((b: Bounds | null) => setBounds(b), 250), []);
  const debouncedSaveLocation = useMemo(
    () =>
      debounce(async () => {
        if (!mapRef.current) return;
        const [center, zoom] = await Promise.all([mapRef.current.getCenter(), mapRef.current.getZoom()]);
        onLocationSave?.(center as [number, number], zoom);
      }, 800),
    [onLocationSave]
  );

  const readBoundsIfZoomed = useCallback(async (): Promise<Bounds | null> => {
    if (!mapRef.current) return null;
    const [b, z] = await Promise.all([mapRef.current.getVisibleBounds(), mapRef.current.getZoom()]);
    setIsZoomedTooFarOut(z < MIN_ZOOM);
    if (z >= MIN_ZOOM && b) {
      return { west: b[1][0], south: b[1][1], east: b[0][0], north: b[0][1] };
    }
    return null;
  }, []);

  const syncViewport = useCallback(async () => {
    if (!mapRef.current) return;
    const b = await readBoundsIfZoomed();
    debouncedSetBounds(b);
    debouncedSaveLocation();
  }, [readBoundsIfZoomed, debouncedSetBounds, debouncedSaveLocation]);

  const centerMapOnUser = useCallback(() => {
    if (!isMapReady || hasSavedLocation || centeredToUserRef.current || !firstIdleRef.current) return;
    const uc = userCoordRef.current;
    if (!uc) return;
    centeredToUserRef.current = true;
    cameraRef.current?.setCamera({
      centerCoordinate: uc,
      zoomLevel: DEFAULT_USER_ZOOM,
    });
    onLocationSave?.(uc, DEFAULT_USER_ZOOM);
  }, [isMapReady, hasSavedLocation, onLocationSave]);

  const handleMapPress = useCallback(
    (event: any) => {
      const feature = event?.features?.[0];
      const hotspotId = feature?.properties?.id;
      if (hotspotId) return onHotspotSelect(hotspotId);
      onPress?.(event);
    },
    [onHotspotSelect, onPress]
  );

  return (
    <View style={[tw`flex-1`, style]}>
      <Mapbox.MapView
        ref={mapRef}
        style={tw`flex-1`}
        onDidFinishLoadingMap={() => setIsMapReady(true)}
        onDidFinishLoadingStyle={syncViewport}
        onCameraChanged={syncViewport}
        onMapIdle={() => {
          firstIdleRef.current = true;
          syncViewport();
          centerMapOnUser();
        }}
        onPress={handleMapPress}
        scaleBarEnabled={false}
        attributionEnabled={false}
        logoPosition={{ bottom: 4, left: 5 }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={initialCenter}
          zoomLevel={initialZoom}
          animationMode="none"
          animationDuration={0}
        />

        {isMapReady && (
          <Mapbox.UserLocation
            visible
            showsUserHeadingIndicator
            animated
            onUpdate={(loc) => {
              if (!loc?.coords) return;
              userCoordRef.current = [loc.coords.longitude, loc.coords.latitude];
              if (firstIdleRef.current) centerMapOnUser();
            }}
          />
        )}

        {isMapReady && hotspots.length > 0 && (
          <Mapbox.ShapeSource
            id="hotspots-source"
            onPress={handleMapPress}
            shape={{
              type: "FeatureCollection",
              features: hotspots.map((h: any) => ({
                type: "Feature" as const,
                geometry: { type: "Point" as const, coordinates: [h.lng, h.lat] },
                properties: { id: h.id, shade: getMarkerColorIndex(h.species || 0) },
              })),
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
