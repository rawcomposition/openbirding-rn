import { BirdPlanError, fetchBirdPlanTrip } from "@/lib/birdplan";
import { deleteTrip, getTrips, importTrip } from "@/lib/database";
import tw from "@/lib/tw";
import { Trip } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Href, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import Swipeable, { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Toast from "react-native-toast-message";

function Card({ children }: { children: React.ReactNode }) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const cardStyle: ViewStyle = { borderRadius: 12, overflow: "hidden" };

  if (useGlass) {
    return (
      <GlassView style={cardStyle} glassEffectStyle="regular" tintColor="rgba(255, 255, 255, 0.7)">
        {children}
      </GlassView>
    );
  }
  return <View style={[cardStyle, tw`bg-white`]}>{children}</View>;
}

function formatMonthRange(start: number | null, end: number | null): string | null {
  if (start == null || end == null) return null;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const s = months[start - 1];
  const e = months[end - 1];
  if (!s || !e) return null;
  return s === e ? s : `${s}–${e}`;
}

type TripRowProps = {
  trip: Trip;
  onUpdate: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
  isBusy: boolean;
};

function TripRow({ trip, onUpdate, onDelete, isBusy }: TripRowProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const monthRange = formatMonthRange(trip.start_month, trip.end_month);

  const handleDelete = () => {
    swipeableRef.current?.close();
    onDelete(trip);
  };

  const renderRightActions = () => (
    <View style={tw`w-20 bg-red-500 justify-center items-center`}>
      <Pressable onPress={handleDelete} style={tw`w-full h-full justify-center items-center`}>
        <Text style={tw`text-white font-medium text-sm`}>Delete</Text>
      </Pressable>
    </View>
  );

  const content = (
    <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200/50`}>
      <View style={tw`flex-1`}>
        <Text style={tw`text-gray-900 text-lg font-medium`}>{trip.name}</Text>
        <Text style={tw`text-gray-600 text-sm`}>
          {trip.hotspot_count} hotspot{trip.hotspot_count === 1 ? "" : "s"} · {trip.marker_count} pin
          {trip.marker_count === 1 ? "" : "s"}
          {monthRange ? ` · ${monthRange}` : ""}
        </Text>
      </View>
      {isBusy ? (
        <ActivityIndicator color={tw.color("gray-400")} />
      ) : (
        <Pressable
          onPress={() => onUpdate(trip)}
          style={tw`py-2 rounded-xl border border-blue-500 bg-blue-500`}
        >
          <Text style={tw`font-medium text-center mx-4 text-sm text-white`}>Update</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions}>
      {content}
    </Swipeable>
  );
}

export default function BirdPlanSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busyTripId, setBusyTripId] = useState<string | null>(null);

  const { data: trips = [], isLoading } = useQuery({ queryKey: ["trips"], queryFn: getTrips });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["trips"] });
    queryClient.invalidateQueries({ queryKey: ["savedHotspots"] });
    queryClient.invalidateQueries({ queryKey: ["savedPlaces"] });
    queryClient.invalidateQueries({ queryKey: ["hotspots"] });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (trip: Trip) => {
      setBusyTripId(trip.id);
      await deleteTrip(trip.id);
      return trip;
    },
    onSuccess: (trip) => {
      invalidate();
      Toast.show({ type: "success", text1: `Removed "${trip.name}"` });
    },
    onError: (error: Error) => {
      Toast.show({ type: "error", text1: error.message || "Delete failed" });
    },
    onSettled: () => setBusyTripId(null),
  });

  const refreshMutation = useMutation({
    mutationFn: async (trip: Trip) => {
      if (!trip.update_token) throw new Error("NO_TOKEN");
      setBusyTripId(trip.id);
      const data = await fetchBirdPlanTrip(trip.update_token);
      await importTrip(data);
      return data;
    },
    onSuccess: (data) => {
      invalidate();
      Toast.show({ type: "success", text1: `Updated "${data.name}"` });
    },
    onError: (error: unknown, trip) => {
      if (error instanceof BirdPlanError && error.status === 404) {
        Alert.alert(
          "Trip Unavailable",
          `"${trip.name}" is no longer available on BirdPlan.app. You can delete it, or re-import with a fresh code.`
        );
        return;
      }
      if (error instanceof BirdPlanError) {
        Toast.show({ type: "error", text1: error.message });
        return;
      }
      Toast.show({ type: "error", text1: "Update failed" });
    },
    onSettled: () => setBusyTripId(null),
  });

  const goToImport = () => router.push("/settings-birdplan-import" as Href);

  const handleUpdate = (trip: Trip) => {
    if (!trip.update_token) {
      Alert.alert(
        "Update Trip",
        `"${trip.name}" was imported before automatic updates were supported. Generate a fresh code in BirdPlan.app to re-import.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Enter Code", onPress: goToImport },
        ]
      );
      return;
    }
    Alert.alert(
      "Update Trip",
      `Fetch the latest data for "${trip.name}"? Existing hotspots, pins, and notes from this trip will be replaced.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          style: "destructive",
          onPress: () => refreshMutation.mutate(trip),
        },
      ]
    );
  };

  const handleDelete = (trip: Trip) => {
    Alert.alert(
      "Delete Trip",
      `Remove "${trip.name}" and all hotspots, pins, and notes imported with it? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(trip),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-50`}
      contentContainerStyle={tw`px-4 pt-6 pb-10`}
      showsVerticalScrollIndicator={false}
    >
      <View style={tw`mb-6`}>
        <Card>
          <TouchableOpacity onPress={goToImport} style={tw`flex-row items-center px-4 py-3`} activeOpacity={0.6}>
            <View style={[tw`w-7 h-7 rounded-md items-center justify-center mr-3`, { backgroundColor: "#0284C7" }]}>
              <Ionicons name="add" size={20} color="white" />
            </View>
            <Text style={tw`text-gray-900 text-base flex-1`}>Import Trip</Text>
            <Ionicons name="chevron-forward" size={20} color={tw.color("gray-400")} />
          </TouchableOpacity>
        </Card>
      </View>

      <TouchableOpacity
        onPress={() => router.push("/packs" as Href)}
        activeOpacity={0.7}
        style={tw`bg-amber-50 rounded-xl px-4 py-3 mb-6 flex-row items-center border border-amber-200`}
      >
        <Ionicons name="information-circle" size={18} color={tw.color("amber-500")} style={tw`mr-2`} />
        <Text style={tw`text-amber-800 text-sm flex-1`}>
          Hotspot packs must be installed for the areas your trips cover.
        </Text>
        <Ionicons name="chevron-forward" size={16} color={tw.color("amber-400")} style={tw`ml-2`} />
      </TouchableOpacity>

      <Text style={tw`text-gray-500 text-xs uppercase px-4 pb-2 font-medium tracking-wide`}>
        {trips.length > 0 ? `Imported Trips (${trips.length})` : "Imported Trips"}
      </Text>
      <Card>
        {isLoading ? (
          <View style={tw`py-6 items-center`}>
            <ActivityIndicator color={tw.color("gray-400")} />
          </View>
        ) : trips.length === 0 ? (
          <View style={tw`py-6 px-4 items-center`}>
            <Text style={tw`text-gray-500 text-sm text-center`}>No trips imported yet</Text>
          </View>
        ) : (
          trips.map((trip) => (
            <TripRow
              key={trip.id}
              trip={trip}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              isBusy={busyTripId === trip.id}
            />
          ))
        )}
      </Card>
    </ScrollView>
  );
}
