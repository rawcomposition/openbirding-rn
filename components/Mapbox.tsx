import { getHotspotsWithinBounds, getSavedHotspots, getSavedPlaces } from "@/lib/database";
import {
  haloInnerStyle,
  haloOuterStyle,
  hotspotSymbolStyle,
  savedHotspotSymbolStyle,
  savedPlaceSymbolStyle,
} from "@/lib/layers";
import tw from "@/lib/tw";
import { OnPressEvent } from "@/lib/types";
import { findClosestFeature, getMarkerColorIndex, padBoundsBySize } from "@/lib/utils";
import { useLocationPermissionStore } from "@/stores/locationPermissionStore";
import { useMapStore } from "@/stores/mapStore";
import Mapbox from "@rnmapbox/maps";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import debounce from "lodash/debounce";
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Linking, Platform, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import InfoModal from "./InfoModal";

const starImage = require("@/assets/images/star.png");
const starLightImage = require("@/assets/images/star-light.png");

const hotspotImages = {
  "hotspot-0": require("@/assets/markers/hotspot-0.png"),
  "hotspot-1": require("@/assets/markers/hotspot-1.png"),
  "hotspot-2": require("@/assets/markers/hotspot-2.png"),
  "hotspot-3": require("@/assets/markers/hotspot-3.png"),
  "hotspot-4": require("@/assets/markers/hotspot-4.png"),
  "hotspot-5": require("@/assets/markers/hotspot-5.png"),
  "hotspot-6": require("@/assets/markers/hotspot-6.png"),
  "hotspot-7": require("@/assets/markers/hotspot-7.png"),
  "hotspot-8": require("@/assets/markers/hotspot-8.png"),
  "hotspot-9": require("@/assets/markers/hotspot-9.png"),
  "saved-hotspot-0": require("@/assets/markers/saved-hotspot-0.png"),
  "saved-hotspot-1": require("@/assets/markers/saved-hotspot-1.png"),
  "saved-hotspot-2": require("@/assets/markers/saved-hotspot-2.png"),
  "saved-hotspot-3": require("@/assets/markers/saved-hotspot-3.png"),
  "saved-hotspot-4": require("@/assets/markers/saved-hotspot-4.png"),
  "saved-hotspot-5": require("@/assets/markers/saved-hotspot-5.png"),
  "saved-hotspot-6": require("@/assets/markers/saved-hotspot-6.png"),
  "saved-hotspot-7": require("@/assets/markers/saved-hotspot-7.png"),
  "saved-hotspot-8": require("@/assets/markers/saved-hotspot-8.png"),
  "saved-hotspot-9": require("@/assets/markers/saved-hotspot-9.png"),
  "place-star": require("@/assets/markers/place-star.png"),
};

type Bounds = { west: number; south: number; east: number; north: number };

type MapboxMapProps = {
  style?: ViewStyle;
  onPress?: (event: any) => void;
  onHotspotSelect: (hotspotId: string) => void;
  onPlaceSelect?: (placeId: string) => void;
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
  centerOnCoordinates: (lng: number, lat: number, offsetY?: number) => void;
};

const MIN_ZOOM = 7;
const DEFAULT_USER_ZOOM = 14;
const isValidUserCoord = (coord: [number, number] | null) => {
  if (!coord) return false;
  const [lng, lat] = coord;
  return Math.abs(lng) > 0.0001 || Math.abs(lat) > 0.0001;
};

const MapboxMap = forwardRef<MapboxMapRef, MapboxMapProps>(
  (
    {
      style,
      onPress,
      onHotspotSelect,
      onPlaceSelect,
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
    const { currentLayer, placeId } = useMapStore();
    const { status: permissionStatus } = useLocationPermissionStore();

    const mapRef = useRef<Mapbox.MapView>(null);
    const cameraRef = useRef<Mapbox.Camera>(null);

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

    const { data: savedPlaces = [] } = useQuery({
      queryKey: ["savedPlaces"],
      queryFn: getSavedPlaces,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
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
      if (!isMapReady) return;
      const uc = userCoordRef.current;
      if (!isValidUserCoord(uc)) return;
      cameraRef.current?.setCamera({
        centerCoordinate: uc as [number, number],
        zoomLevel: DEFAULT_USER_ZOOM,
        ...(Platform.OS === "android" && { animationDuration: 0 }),
      });
      onLocationSave?.(uc as [number, number], DEFAULT_USER_ZOOM);
    }, [isMapReady, onLocationSave]);

    const centerMapOnUserInitial = useCallback(() => {
      if (!isMapReady || hasSavedLocation || centeredToUserRef.current) return;
      const uc = userCoordRef.current;
      if (!isValidUserCoord(uc)) return;
      centeredToUserRef.current = true;
      centerMapOnUser();
    }, [isMapReady, hasSavedLocation, centerMapOnUser]);

    const centerOnCoordinates = useCallback(
      (lng: number, lat: number, offsetY: number = 0) => {
        if (!cameraRef.current) return;
        cameraRef.current.setCamera({
          centerCoordinate: [lng, lat],
          padding: { paddingTop: 0, paddingBottom: offsetY, paddingLeft: 0, paddingRight: 0 },
          animationDuration: 300,
        });
      },
      []
    );

    useImperativeHandle(
      ref,
      () => ({
        centerOnUser: centerMapOnUser,
        centerOnCoordinates,
      }),
      [centerMapOnUser, centerOnCoordinates]
    );

    const savedHotspotsSet = useMemo(() => new Set(savedHotspots.map((s) => s.hotspot_id)), [savedHotspots]);

    const handleFeaturePress = useCallback(
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
        if (!closestFeature?.feature?.properties?.id) {
          onPress?.(event);
          return;
        }

        const featureId = closestFeature.feature.properties.id;
        const originalFeature = features.find((f: any) => f.properties?.id === featureId);
        const isPlace = originalFeature?.properties?.featureType === "place";

        if (isPlace) {
          onPlaceSelect?.(featureId);
        } else {
          onHotspotSelect(featureId);
        }
      },
      [onHotspotSelect, onPlaceSelect, onPress]
    );

    const handleMapLongPress = useCallback(
      (event: any) => {
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
      },
      [onLongPressCoordinates]
    );

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
            syncViewport();
            centerMapOnUserInitial();
          }}
          onPress={handleFeaturePress}
          onLongPress={handleMapLongPress}
          scaleBarEnabled={false}
          attributionEnabled={false}
          logoPosition={
            Platform.OS === "ios"
              ? insets.bottom > 0
                ? { bottom: -insets.bottom + 15, left: 25 }
                : { bottom: 4, left: 5 }
              : { bottom: 15, left: 25 }
          }
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{ centerCoordinate: initialCenter, zoomLevel: initialZoom }}
            animationMode="none"
            animationDuration={0}
          />

          <Mapbox.Images images={{ star: starImage, "star-light": starLightImage, ...hotspotImages }} />

          {isMapReady && permissionStatus === "granted" && (
            <>
              <Mapbox.UserLocation
                visible={false}
                showsUserHeadingIndicator
                animated
                onUpdate={(loc: { coords?: { longitude: number; latitude: number } }) => {
                  if (!loc?.coords) return;
                  const nextCoord: [number, number] = [loc.coords.longitude, loc.coords.latitude];
                  if (!isValidUserCoord(nextCoord)) return;
                  userCoordRef.current = nextCoord;
                  centerMapOnUserInitial();
                }}
              />
              <Mapbox.LocationPuck visible puckBearingEnabled scale={0.9} pulsing={{ isEnabled: true, radius: 22 }} />
            </>
          )}

          {isMapReady && (hotspots.length > 0 || savedPlaces.length > 0) && (
            <Mapbox.ShapeSource
              id="features-source"
              onPress={handleFeaturePress}
              shape={{
                type: "FeatureCollection",
                features: [
                  ...hotspots.map((h: any) => {
                    const isSaved = savedHotspotsSet.has(h.id);
                    return {
                      type: "Feature" as const,
                      geometry: { type: "Point" as const, coordinates: [h.lng, h.lat] },
                      properties: {
                        id: h.id,
                        shade: getMarkerColorIndex(h.species || 0),
                        isSelected: h.id === hotspotId,
                        isSaved,
                        featureType: "hotspot",
                      },
                    };
                  }),
                  ...savedPlaces.map((p) => ({
                    type: "Feature" as const,
                    geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
                    properties: {
                      id: p.id,
                      icon: p.icon,
                      isSelected: p.id === placeId,
                      featureType: "place",
                    },
                  })),
                ],
              }}
            >
              {/* Hotspot */}
              <Mapbox.SymbolLayer
                id="hotspot"
                filter={["all", ["==", ["get", "featureType"], "hotspot"], ["==", ["get", "isSaved"], false]]}
                style={hotspotSymbolStyle() as any}
              />

              {/* Saved hotspot */}
              <Mapbox.SymbolLayer
                id="saved-hotspot"
                filter={["all", ["==", ["get", "featureType"], "hotspot"], ["==", ["get", "isSaved"], true]]}
                style={savedHotspotSymbolStyle() as any}
              />

              {/* Selected hotspot */}
              <Mapbox.CircleLayer
                id="hotspot-halo"
                filter={[
                  "all",
                  ["==", ["get", "featureType"], "hotspot"],
                  ["==", ["get", "isSaved"], false],
                  ["==", ["get", "isSelected"], true],
                ]}
                style={haloInnerStyle() as any}
              />
              <Mapbox.CircleLayer
                id="hotspot-halo-outer"
                filter={[
                  "all",
                  ["==", ["get", "featureType"], "hotspot"],
                  ["==", ["get", "isSaved"], false],
                  ["==", ["get", "isSelected"], true],
                ]}
                style={haloOuterStyle() as any}
              />
              <Mapbox.SymbolLayer
                id="selected-hotspot"
                filter={[
                  "all",
                  ["==", ["get", "featureType"], "hotspot"],
                  ["==", ["get", "isSaved"], false],
                  ["==", ["get", "isSelected"], true],
                ]}
                style={hotspotSymbolStyle() as any}
              />

              {/* Selected saved hotspot */}
              <Mapbox.CircleLayer
                id="saved-hotspot-halo"
                filter={[
                  "all",
                  ["==", ["get", "featureType"], "hotspot"],
                  ["==", ["get", "isSaved"], true],
                  ["==", ["get", "isSelected"], true],
                ]}
                style={haloInnerStyle(1.2) as any}
              />
              <Mapbox.CircleLayer
                id="saved-hotspot-halo-outer"
                filter={[
                  "all",
                  ["==", ["get", "featureType"], "hotspot"],
                  ["==", ["get", "isSaved"], true],
                  ["==", ["get", "isSelected"], true],
                ]}
                style={haloOuterStyle(1.2) as any}
              />
              <Mapbox.SymbolLayer
                id="selected-saved-hotspot"
                filter={[
                  "all",
                  ["==", ["get", "featureType"], "hotspot"],
                  ["==", ["get", "isSaved"], true],
                  ["==", ["get", "isSelected"], true],
                ]}
                style={savedHotspotSymbolStyle() as any}
              />

              {/* Saved place */}
              <Mapbox.SymbolLayer
                id="saved-place"
                filter={["all", ["==", ["get", "featureType"], "place"], ["==", ["get", "isSelected"], false]]}
                style={savedPlaceSymbolStyle() as any}
              />
              <Mapbox.CircleLayer
                id="saved-place-halo"
                filter={["all", ["==", ["get", "featureType"], "place"], ["==", ["get", "isSelected"], true]]}
                style={haloInnerStyle(1.2) as any}
              />
              <Mapbox.CircleLayer
                id="saved-place-halo-outer"
                filter={["all", ["==", ["get", "featureType"], "place"], ["==", ["get", "isSelected"], true]]}
                style={haloOuterStyle(1.2) as any}
              />
              <Mapbox.SymbolLayer
                id="selected-saved-place"
                filter={["all", ["==", ["get", "featureType"], "place"], ["==", ["get", "isSelected"], true]]}
                style={savedPlaceSymbolStyle() as any}
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
