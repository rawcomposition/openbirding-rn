import { getHotspotsWithinBounds, getSavedHotspots } from "@/lib/database";
import { OnPressEvent } from "@/lib/types";
import { findClosestFeature, getMarkerColorIndex, padBoundsBySize } from "@/lib/utils";
import { useMapStore } from "@/stores/mapStore";
import Mapbox from "@rnmapbox/maps";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import debounce from "lodash/debounce";
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Linking, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "@/lib/tw";
import InfoModal from "./InfoModal";
import CircleLayer from "@/components/layers/CircleLayer";
import StarLayer from "@/components/layers/StarLayer";
import Halo from "@/components/layers/Halo";

type Bounds = { west: number; south: number; east: number; north: number };

type MapboxMapProps = {
  style?: ViewStyle;
  onPress?: (event: any) => void;
  onHotspotSelect: (hotspotId: string) => void;
  hotspotId?: string | null;
  initialCenter: [number, number];
  initialZoom: number;
  hasSavedLocation?: boolean;
  onLocationSave?: (center: [number, number], zoom: number) => void;
  hasInstalledPacks?: boolean;
  onLongPressCoordinates?: (coordinates: { latitude: number; longitude: number }) => void;
  placeCoordinates?: { latitude: number; longitude: number } | null;
};

export type MapboxMapRef = {
  centerOnUser: () => void;
};

const MIN_ZOOM = 7;
const DEFAULT_USER_ZOOM = 14;

const MapboxMap = forwardRef<MapboxMapRef, MapboxMapProps>(
  (
    {
      style,
      onPress,
      onHotspotSelect,
      hotspotId,
      initialCenter,
      initialZoom,
      hasSavedLocation,
      onLocationSave,
      hasInstalledPacks,
      onLongPressCoordinates,
      placeCoordinates,
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    const { currentLayer } = useMapStore();

    const mapRef = useRef<Mapbox.MapView>(null);
    const cameraRef = useRef<Mapbox.Camera>(null);

    const firstIdleRef = useRef(false);
    const centeredToUserRef = useRef(false);
    const userCoordRef = useRef<[number, number] | null>(null);

    const [isMapReady, setIsMapReady] = useState(false);
    const [showAttribution, setShowAttribution] = useState(false);
    const [isZoomedTooFarOut, setIsZoomedTooFarOut] = useState(false);
    const [bounds, setBounds] = useState<Bounds | null>(null);

    const mapStyle = useMemo(() => {
      return currentLayer === "satellite"
        ? "mapbox://styles/mapbox/satellite-v9"
        : "mapbox://styles/mapbox/outdoors-v12";
    }, [currentLayer]);

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

    const { data: savedHotspots = [] } = useQuery({
      queryKey: ["savedHotspots"],
      queryFn: getSavedHotspots,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    });

    const savedHotspotsSet = new Set(savedHotspots.map((s) => s.hotspot_id));

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
      if (!isMapReady) return;
      const uc = userCoordRef.current;
      if (!uc) return;
      cameraRef.current?.setCamera({
        centerCoordinate: uc,
        zoomLevel: DEFAULT_USER_ZOOM,
      });
      onLocationSave?.(uc, DEFAULT_USER_ZOOM);
    }, [isMapReady, onLocationSave]);

    const centerMapOnUserInitial = useCallback(() => {
      if (!isMapReady || hasSavedLocation || centeredToUserRef.current || !firstIdleRef.current) return;
      const uc = userCoordRef.current;
      if (!uc) return;
      centeredToUserRef.current = true;
      centerMapOnUser();
    }, [isMapReady, hasSavedLocation, centerMapOnUser]);

    useImperativeHandle(
      ref,
      () => ({
        centerOnUser: centerMapOnUser,
      }),
      [centerMapOnUser]
    );

    const handleMapPress = useCallback(
      (event: any) => {
        const pressEvent = event as OnPressEvent;
        const features = pressEvent?.features;
        const tapLocation = pressEvent?.coordinates
          ? ([pressEvent.coordinates.longitude, pressEvent.coordinates.latitude] as [number, number])
          : null;
        if (!features || features.length === 0 || !tapLocation) {
          onPress?.(event);
          return;
        }

        const closestFeature = findClosestFeature(features, tapLocation);
        const hotspotId = closestFeature?.feature?.properties?.id;
        if (hotspotId) return onHotspotSelect(hotspotId);
        onPress?.(event);
      },
      [onHotspotSelect, onPress]
    );

    const handleMapLongPress = (event: any) => {
      if (!onLongPressCoordinates) return;
      if (
        event?.geometry?.coordinates &&
        Array.isArray(event.geometry.coordinates) &&
        event.geometry.coordinates.length >= 2
      ) {
        const longitude = event.geometry.coordinates[0].toFixed(6);
        const latitude = event.geometry.coordinates[1].toFixed(6);
        onLongPressCoordinates({ latitude: parseFloat(latitude), longitude: parseFloat(longitude) });
      }
    };

    return (
      <View style={[tw`flex-1`, style]}>
        <Mapbox.MapView
          ref={mapRef}
          style={tw`flex-1`}
          styleURL={mapStyle}
          onDidFinishLoadingMap={() => setIsMapReady(true)}
          onDidFinishLoadingStyle={syncViewport}
          onCameraChanged={syncViewport}
          onMapIdle={() => {
            firstIdleRef.current = true;
            syncViewport();
            centerMapOnUserInitial();
          }}
          onPress={handleMapPress}
          onLongPress={handleMapLongPress}
          scaleBarEnabled={false}
          attributionEnabled={false}
          logoPosition={insets.bottom > 0 ? { bottom: -insets.bottom + 15, left: 25 } : { bottom: 4, left: 5 }}
          rotateEnabled={false}
          pitchEnabled={false}
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
                if (firstIdleRef.current) centerMapOnUserInitial();
              }}
            />
          )}

          {isMapReady && hotspots.length > 0 && (
            <Mapbox.ShapeSource
              id="hotspots-source"
              onPress={handleMapPress}
              shape={{
                type: "FeatureCollection",
                features: hotspots.map((h: any) => {
                  const isSaved = savedHotspotsSet.has(h.id);
                  return {
                    type: "Feature" as const,
                    geometry: { type: "Point" as const, coordinates: [h.lng, h.lat] },
                    properties: {
                      id: h.id,
                      shade: getMarkerColorIndex(h.species || 0),
                      isSelected: h.id === hotspotId,
                      isSaved,
                    },
                  };
                }),
              }}
            >
              <CircleLayer id="hotspot-points" shaded />
              <CircleLayer id="saved-hotspot-point" filter={["==", ["get", "isSaved"], true]} shaded />
              <StarLayer id="saved-hotspot-stars" filter={["==", ["get", "isSaved"], true]} />
              <Halo />
              <CircleLayer id="selected-hotspot-point" filter={["==", ["get", "isSelected"], true]} shaded />
              <StarLayer
                id="selected-saved-hotspot-stars"
                filter={["all", ["==", ["get", "isSelected"], true], ["==", ["get", "isSaved"], true]]}
              />
            </Mapbox.ShapeSource>
          )}

          {isMapReady && placeCoordinates && (
            <Mapbox.ShapeSource
              id="place-marker-source"
              shape={{
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature" as const,
                    geometry: {
                      type: "Point" as const,
                      coordinates: [placeCoordinates.longitude, placeCoordinates.latitude],
                    },
                    properties: {},
                  },
                ],
              }}
            >
              <Mapbox.CircleLayer
                id="place-marker-outer"
                style={{
                  circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 7, 12, 9],
                  circleColor: "transparent",
                  circleStrokeWidth: 2,
                  circleStrokeColor: "#444",
                }}
              />
              <Mapbox.CircleLayer
                id="place-marker"
                style={{
                  circleRadius: ["interpolate", ["linear"], ["zoom"], 7, 3.5, 12, 4],
                  circleColor: "#444",
                  circleStrokeWidth: 0,
                }}
              />
            </Mapbox.ShapeSource>
          )}
        </Mapbox.MapView>

        {isZoomedTooFarOut && hasInstalledPacks && (
          <View style={[tw`absolute left-0 right-0 items-center`, { top: insets.top + 16 }]}>
            <View style={tw`bg-white/90 rounded-lg p-3 shadow-lg`}>
              <Text style={tw`text-sm text-gray-700`}>Zoom in to see hotspots</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            tw`absolute w-5 h-5 bg-white/80 border border-black/40 rounded-full items-center justify-center`,
            insets.bottom > 0 ? { bottom: 17, left: 114 } : { bottom: 5, left: 5 },
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
);

MapboxMap.displayName = "MapboxMap";

export default MapboxMap;
