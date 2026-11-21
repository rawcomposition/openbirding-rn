import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useTargetRichHotspots } from "@/hooks/useTargetRichHotspots";
import { getHotspotsWithinBounds, getSavedHotspots, getSavedPlaces, hasMoreHotspotsThan } from "@/lib/database";
import {
  haloInnerStyle,
  haloOuterStyle,
  hotspotSymbolStyle,
  savedHotspotSymbolStyle,
  savedPlaceSymbolStyle,
} from "@/lib/layers";
import { targetRichHotspotCache } from "@/lib/targetRichHotspots";
import tw from "@/lib/tw";
import { OnPressEvent } from "@/lib/types";
import { calculateDistance, findClosestFeature, getMarkerColorIndex, isWithinBounds, padBoundsBySize } from "@/lib/utils";
import { useFiltersStore } from "@/stores/filtersStore";
import { useLocationPermissionStore } from "@/stores/locationPermissionStore";
import { useMapStore } from "@/stores/mapStore";
import { useSettingsStore } from "@/stores/settingsStore";
import Mapbox from "@rnmapbox/maps";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import debounce from "lodash/debounce";
import throttle from "lodash/throttle";
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Linking, Platform, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BaseBottomSheet from "./BaseBottomSheet";

const starImage = require("@/assets/images/star.png");
const starLightImage = require("@/assets/images/star-light.png");

const markerImages = {
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
  "place-hike": require("@/assets/markers/place-hike.png"),
  "place-mountain": require("@/assets/markers/place-mountain.png"),
  "place-tent": require("@/assets/markers/place-tent.png"),
  "place-house": require("@/assets/markers/place-house.png"),
  "place-airbnb": require("@/assets/markers/place-airbnb.png"),
  "place-bed": require("@/assets/markers/place-bed.png"),
  "place-bins": require("@/assets/markers/place-bins.png"),
  "place-camera": require("@/assets/markers/place-camera.png"),
  "place-airport": require("@/assets/markers/place-airport.png"),
  "place-boat": require("@/assets/markers/place-boat.png"),
  "place-car": require("@/assets/markers/place-car.png"),
  "place-bus": require("@/assets/markers/place-bus.png"),
  "place-utensils": require("@/assets/markers/place-utensils.png"),
  "place-mug": require("@/assets/markers/place-mug.png"),
  "place-trolley": require("@/assets/markers/place-trolley.png"),
  "place-bike": require("@/assets/markers/place-bike.png"),
  "place-dog": require("@/assets/markers/place-dog.png"),
  "place-fuel": require("@/assets/markers/place-fuel.png"),
  "place-parking": require("@/assets/markers/place-parking.png"),
  "place-building": require("@/assets/markers/place-building.png"),
  "place-hotspot": require("@/assets/markers/place-hotspot.png"),
  "place-star": require("@/assets/markers/place-star.png"), // backwards compat for old saved places
};

type Bounds = { west: number; south: number; east: number; north: number };

const mapboxAccessToken = Constants.expoConfig?.extra?.MAPBOX_ACCESS_TOKEN;

if (typeof mapboxAccessToken === "string" && mapboxAccessToken.length > 0) {
  Mapbox.setAccessToken(mapboxAccessToken);
}

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
  onTouchActiveChange?: (isActive: boolean) => void;
  overlayTop?: number;
};

export type MapboxMapRef = {
  centerOnUser: () => void;
  centerOnCoordinates: (lng: number, lat: number, offsetY?: number) => void;
};

const THROTTLE_DELAY = 750;
const THROTTLE_DELAY_WITH_OPEN_HOTSPOT = 250;
const SETTLED_BOUNDS_DELAY = 300;
const TARGET_RICH_BADGE_DELAY = 350;
// At this zoom and closer, hotspots always load.
const MIN_ZOOM = 8;
// Further out than MIN_ZOOM, hotspots still load while the view holds no more than this many,
// so sparse regions stay usable from much further out. Dense cities already put ~4,000 on
// the map at MIN_ZOOM, so this is never heavier to render than what loads there.
const MAX_ZOOMED_OUT_HOTSPOTS = 3000;
// Never load below this zoom, however sparse the area; the view spans whole countries by then.
const ABSOLUTE_MIN_ZOOM = 5;
const DEFAULT_USER_ZOOM = 14;
const DEFAULT_HOTSPOT_ZOOM = 13;
const BOUNDS_EPSILON = 0.0001;

type Viewport = { bounds: Bounds; zoom: number };

function areBoundsEquivalent(left: Bounds | null, right: Bounds | null): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    Math.abs(left.west - right.west) < BOUNDS_EPSILON &&
    Math.abs(left.south - right.south) < BOUNDS_EPSILON &&
    Math.abs(left.east - right.east) < BOUNDS_EPSILON &&
    Math.abs(left.north - right.north) < BOUNDS_EPSILON
  );
}

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
      onTouchActiveChange,
      overlayTop,
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    const currentLayer = useMapStore((state) => state.currentLayer);
    const placeId = useMapStore((state) => state.placeId);
    const setMapCenter = useMapStore((state) => state.setMapCenter);
    const setViewRadiusKm = useMapStore((state) => state.setViewRadiusKm);
    const setStoreBounds = useMapStore((state) => state.setBounds);
    const setInViewCount = useMapStore((state) => state.setInViewCount);
    const setDisplayedCount = useMapStore((state) => state.setDisplayedCount);
    const isZoomedTooFarOut = useMapStore((state) => state.isZoomedTooFarOut);
    const setIsZoomedTooFarOut = useMapStore((state) => state.setIsZoomedTooFarOut);
    const showAttribution = useMapStore((state) => state.isMapAttributionOpen);
    const setShowAttribution = useMapStore((state) => state.setIsMapAttributionOpen);
    const { status: permissionStatus } = useLocationPermissionStore();
    const { showSavedOnly, targetRichEnabled } = useFiltersStore();
    const lifelist = useSettingsStore((state) => state.lifelist);

    const mapRef = useRef<Mapbox.MapView>(null);
    const cameraRef = useRef<Mapbox.Camera>(null);

    const centeredToUserRef = useRef(false);
    const userCoordRef = useRef<[number, number] | null>(null);
    const isTouchActiveRef = useRef(false);
    const lastResolvedHotspotsRef = useRef<{ id: string; lat: number; lng: number; species: number }[]>([]);

    const [isMapReady, setIsMapReady] = useState(false);
    const [bounds, setBounds] = useState<Bounds | null>(null);
    const hasLifeList = (lifelist?.length ?? 0) > 0;
    const isTargetRichMapFiltering = targetRichEnabled && hasLifeList;

    const mapStyle = useMemo(() => {
      return currentLayer === "satellite"
        ? "mapbox://styles/mapbox/satellite-v9"
        : "mapbox://styles/mapbox/outdoors-v12";
    }, [currentLayer]);

    const { data: hotspots = [], isFetching: isFetchingHotspots } = useQuery({
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

    let throttleDelay = THROTTLE_DELAY;
    if (hotspotId) {
      throttleDelay = THROTTLE_DELAY_WITH_OPEN_HOTSPOT;
    }

    const viewportRequestRef = useRef(0);
    const applyViewport = useCallback(
      async (viewport: Viewport) => {
        const requestId = ++viewportRequestRef.current;
        let isTooFarOut = viewport.zoom < ABSOLUTE_MIN_ZOOM;
        if (!isTooFarOut && viewport.zoom < MIN_ZOOM) {
          const padded = padBoundsBySize(viewport.bounds);
          isTooFarOut = await hasMoreHotspotsThan(
            MAX_ZOOMED_OUT_HOTSPOTS,
            padded.west,
            padded.south,
            padded.east,
            padded.north
          ).catch(() => true);
          // A newer viewport took over while this one was being counted.
          if (requestId !== viewportRequestRef.current) return;
        }
        const nextBounds = isTooFarOut ? null : viewport.bounds;
        setIsZoomedTooFarOut(isTooFarOut);
        setBounds((currentBounds) => (areBoundsEquivalent(currentBounds, nextBounds) ? currentBounds : nextBounds));
      },
      [setIsZoomedTooFarOut]
    );
    const throttledApplyViewport = useMemo(() => throttle(applyViewport, throttleDelay), [applyViewport, throttleDelay]);
    const debouncedApplySettledViewport = useMemo(
      () => debounce(applyViewport, SETTLED_BOUNDS_DELAY),
      [applyViewport]
    );
    const debouncedSaveLocation = useMemo(
      () =>
        debounce(async () => {
          if (!mapRef.current) return;
          const [center, zoom] = await Promise.all([mapRef.current.getCenter(), mapRef.current.getZoom()]);
          onLocationSave?.(center as [number, number], zoom);
        }, 800),
      [onLocationSave]
    );

    const throttledSetMapCenter = useMemo(
      () =>
        throttle(async () => {
          if (!mapRef.current) return;
          const [center, visible] = await Promise.all([mapRef.current.getCenter(), mapRef.current.getVisibleBounds()]);
          setMapCenter({ lat: center[1], lng: center[0] });
          if (visible) {
            const [[east, north], [west, south]] = visible;
            const widthKm = calculateDistance(center[1], west, center[1], east);
            const heightKm = calculateDistance(south, center[0], north, center[0]);
            setViewRadiusKm(Math.min(widthKm, heightKm) / 2);
          }
        }, 500),
      [setMapCenter, setViewRadiusKm]
    );

    const readViewport = useCallback(async (): Promise<Viewport | null> => {
      if (!mapRef.current) return null;
      const [b, zoom] = await Promise.all([mapRef.current.getVisibleBounds(), mapRef.current.getZoom()]);
      if (!b) return null;
      return { bounds: { west: b[1][0], south: b[1][1], east: b[0][0], north: b[0][1] }, zoom };
    }, []);

    const syncViewport = useCallback(
      async (immediate = false) => {
        const viewport = await readViewport();
        if (!viewport) return;
        if (immediate) {
          throttledApplyViewport.cancel();
          debouncedApplySettledViewport.cancel();
          void applyViewport(viewport);
        } else if (isTargetRichMapFiltering) {
          debouncedApplySettledViewport(viewport);
        } else {
          throttledApplyViewport(viewport);
        }
        debouncedSaveLocation();
        throttledSetMapCenter();
      },
      [
        applyViewport,
        debouncedApplySettledViewport,
        debouncedSaveLocation,
        isTargetRichMapFiltering,
        readViewport,
        throttledApplyViewport,
        throttledSetMapCenter,
      ]
    );

    useEffect(() => {
      return () => {
        throttledApplyViewport.cancel();
        debouncedApplySettledViewport.cancel();
      };
    }, [debouncedApplySettledViewport, throttledApplyViewport]);

    useEffect(() => {
      void syncViewport(true);
    }, [isTargetRichMapFiltering, syncViewport]);

    const setTouchActive = useCallback(
      (isActive: boolean) => {
        if (isTouchActiveRef.current === isActive) return;
        isTouchActiveRef.current = isActive;
        onTouchActiveChange?.(isActive);
      },
      [onTouchActiveChange]
    );

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

    const centerOnCoordinates = useCallback((lng: number, lat: number, offsetY: number = 0) => {
      if (!cameraRef.current) return;
      cameraRef.current.setCamera({
        centerCoordinate: [lng, lat],
        padding: { paddingTop: 0, paddingBottom: offsetY, paddingLeft: 0, paddingRight: 0 },
        animationDuration: 400,
        zoomLevel: DEFAULT_HOTSPOT_ZOOM,
      });
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        centerOnUser: centerMapOnUser,
        centerOnCoordinates,
      }),
      [centerMapOnUser, centerOnCoordinates]
    );

    const savedHotspotsSet = useMemo(() => new Set(savedHotspots.map((s) => s.hotspot_id)), [savedHotspots]);
    const mapCandidateHotspots = useMemo(
      () => hotspots.filter((hotspot) => !showSavedOnly || savedHotspotsSet.has(hotspot.id)),
      [hotspots, savedHotspotsSet, showSavedOnly]
    );
    const targetRichFilter = useTargetRichHotspots(mapCandidateHotspots.map((hotspot) => hotspot.id), {
      enabled: bounds !== null && !isFetchingHotspots,
      blockWhileDisabled: true,
    });
    const targetRichHotspotIds = useMemo(() => new Set(targetRichFilter.filteredIds), [targetRichFilter.filteredIds]);
    const unresolvedCandidateCount = targetRichFilter.isActive
      ? mapCandidateHotspots.reduce((count, hotspot) => count + (targetRichHotspotCache.has(hotspot.id) ? 0 : 1), 0)
      : 0;
    const isInitialTargetRichFetch =
      targetRichFilter.isActive &&
      bounds !== null &&
      isFetchingHotspots &&
      lastResolvedHotspotsRef.current.length === 0;
    const isTargetRichLoading =
      targetRichFilter.isActive &&
      (isInitialTargetRichFetch || unresolvedCandidateCount > 0 || targetRichFilter.isLoading);
    const isTargetRichBadgeVisible = useDelayedFlag(isTargetRichLoading, TARGET_RICH_BADGE_DELAY);
    const displayedHotspots = useMemo(() => {
      if (showSavedOnly || targetRichFilter.isActive) {
        const resolvedHotspots = mapCandidateHotspots.filter((hotspot) =>
          targetRichFilter.isActive ? targetRichHotspotIds.has(hotspot.id) : true
        );

        if (isTargetRichLoading) {
          return lastResolvedHotspotsRef.current;
        }

        return resolvedHotspots;
      }

      return hotspots;
    }, [
      hotspots,
      isTargetRichLoading,
      mapCandidateHotspots,
      targetRichFilter.isActive,
      targetRichHotspotIds,
      showSavedOnly,
    ]);

    useEffect(() => {
      if (!isTargetRichLoading) {
        lastResolvedHotspotsRef.current = displayedHotspots;
      }
    }, [displayedHotspots, isTargetRichLoading]);

    useEffect(() => {
      setStoreBounds(bounds);
    }, [bounds, setStoreBounds]);

    const visibleHotspotCount = useMemo(
      () => (bounds ? displayedHotspots.filter((hotspot) => isWithinBounds(hotspot.lat, hotspot.lng, bounds)).length : 0),
      [bounds, displayedHotspots]
    );

    useEffect(() => {
      if (bounds === null) {
        setInViewCount(null);
        setDisplayedCount(null);
        return;
      }
      setInViewCount(mapCandidateHotspots.length);
      setDisplayedCount(visibleHotspotCount);
    }, [bounds, mapCandidateHotspots.length, visibleHotspotCount, setInViewCount, setDisplayedCount]);

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
      <View
        style={[tw`flex-1`, style]}
        onTouchStart={() => setTouchActive(true)}
        onTouchEnd={() => setTouchActive(false)}
        onTouchCancel={() => setTouchActive(false)}
      >
        <Mapbox.MapView
          surfaceView={Platform.OS === "android"}
          ref={mapRef}
          style={tw`flex-1`}
          styleURL={mapStyle}
          onDidFinishLoadingMap={() => setIsMapReady(true)}
          onDidFinishLoadingStyle={() => {
            syncViewport(true);
          }}
          onCameraChanged={() => {
            syncViewport();
          }}
          onMapIdle={() => {
            syncViewport(true);
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

          <Mapbox.Images images={{ star: starImage, "star-light": starLightImage, ...markerImages }} />

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

          {isMapReady && (displayedHotspots.length > 0 || savedPlaces.length > 0) && (
            <Mapbox.ShapeSource
              id="features-source"
              onPress={handleFeaturePress}
              shape={{
                type: "FeatureCollection",
                features: [
                  ...displayedHotspots.map((h: any) => {
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
              <Mapbox.SymbolLayer
                id="hotspot"
                filter={["all", ["==", ["get", "featureType"], "hotspot"], ["==", ["get", "isSaved"], false]]}
                style={hotspotSymbolStyle() as any}
              />

              <Mapbox.SymbolLayer
                id="saved-hotspot"
                filter={["all", ["==", ["get", "featureType"], "hotspot"], ["==", ["get", "isSaved"], true]]}
                style={savedHotspotSymbolStyle() as any}
              />

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
          <View style={[tw`absolute left-0 right-0 items-center`, { top: overlayTop ?? insets.top + 16 }]}>
            {Platform.OS === "ios" && isLiquidGlassAvailable() ? (
              <GlassView
                style={tw`rounded-full overflow-hidden`}
                glassEffectStyle="regular"
                tintColor={currentLayer === "satellite" ? "rgba(255, 255, 255, 0.8)" : undefined}
              >
                <View style={tw`flex-row items-center px-4 py-2`}>
                  <Text style={tw`text-sm font-medium text-gray-700`}>Zoom in to load hotspots</Text>
                </View>
              </GlassView>
            ) : (
              <View style={tw`rounded-full overflow-hidden bg-white/90 shadow-md px-4 py-2`}>
                <Text style={tw`text-sm font-medium text-gray-700`}>Zoom in to load hotspots</Text>
              </View>
            )}
          </View>
        )}

        {isTargetRichBadgeVisible && !isZoomedTooFarOut && (
          <View style={[tw`absolute left-0 right-0 items-center`, { top: overlayTop ?? insets.top + 16 }]}>
            {Platform.OS === "ios" && isLiquidGlassAvailable() ? (
              <GlassView
                style={tw`rounded-full overflow-hidden`}
                glassEffectStyle="regular"
                tintColor={currentLayer === "satellite" ? "rgba(255, 255, 255, 0.8)" : undefined}
              >
                <View style={tw`flex-row items-center px-4 py-2`}>
                  <Text style={tw`text-sm font-medium text-gray-700`}>Filtering hotspots...</Text>
                </View>
              </GlassView>
            ) : (
              <View style={tw`rounded-full overflow-hidden bg-white/90 shadow-md px-4 py-2`}>
                <Text style={tw`text-sm font-medium text-gray-700`}>Filtering hotspots...</Text>
              </View>
            )}
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

        <BaseBottomSheet isOpen={showAttribution} onClose={() => setShowAttribution(false)} title="Map Attribution" dimmed>
          <View style={tw`px-6 pt-2`}>
            <Text style={tw`text-sm text-gray-700 mb-2`}>© OpenStreetMap contributors</Text>
            <Text style={tw`text-sm text-gray-700 mb-2`}>© Mapbox</Text>
            <TouchableOpacity onPress={() => Linking.openURL("https://www.openstreetmap.org/edit")} style={tw`mb-2`}>
              <Text style={tw`text-sm text-blue-500 underline`}>Improve this map</Text>
            </TouchableOpacity>
          </View>
        </BaseBottomSheet>
      </View>
    );
  }
);

MapboxMap.displayName = "MapboxMap";

export default MapboxMap;
