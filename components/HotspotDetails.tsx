import ActionButton from "./ActionButton";
import DialogHeader from "./DialogHeader";
import { useDirections } from "@/hooks/useDirections";
import { getHotspotById, isHotspotSaved, saveHotspot, unsaveHotspot } from "@/lib/database";
import { getMarkerColor } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useRef } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { TouchableOpacity } from "react-native";
import tw from "twrnc";
import BaseBottomSheet from "./BaseBottomSheet";
import DirectionsIcon from "./icons/DirectionsIcon";
import InfoIcon from "./icons/InfoIcon";
import TargetsIcon from "./icons/TargetsIcon";

type HotspotDetailsProps = {
  isOpen: boolean;
  hotspotId: string | null;
  onClose: () => void;
};

export default function HotspotDetails({ isOpen, hotspotId, onClose }: HotspotDetailsProps) {
  const queryClient = useQueryClient();
  const directionsButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const { openDirections, showProviderPicker } = useDirections();

  const { data: hotspot, isLoading: isLoadingHotspot } = useQuery({
    queryKey: ["hotspot", hotspotId],
    queryFn: () => (hotspotId ? getHotspotById(hotspotId) : Promise.resolve(null)),
    enabled: !!hotspotId && isOpen,
  });

  const { data: isSaved = false } = useQuery({
    queryKey: ["isHotspotSaved", hotspotId],
    queryFn: () => (hotspotId ? isHotspotSaved(hotspotId) : Promise.resolve(false)),
    enabled: !!hotspotId,
  });

  const saveMutation = useMutation({
    mutationFn: ({ hotspotId, notes }: { hotspotId: string; notes?: string }) => saveHotspot(hotspotId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedHotspots"] });
      queryClient.invalidateQueries({ queryKey: ["isHotspotSaved", hotspotId] });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (hotspotId: string) => unsaveHotspot(hotspotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedHotspots"] });
      queryClient.invalidateQueries({ queryKey: ["isHotspotSaved", hotspotId] });
    },
  });

  const handleOpenTargets = () => {
    if (!hotspot) return;
    const url = `https://ebird.org/targets?r1=${hotspot.id}&bmo=1&emo=12&r2=world&t2=life`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open eBird link");
    });
  };

  const handleGetDirections = () => {
    if (!hotspot) return;
    openDirections({
      coordinates: { latitude: hotspot.lat, longitude: hotspot.lng },
      anchorRef: directionsButtonRef,
    });
  };

  const handleShowMapProviders = () => {
    if (!hotspot) return;
    showProviderPicker({
      coordinates: { latitude: hotspot.lat, longitude: hotspot.lng },
      anchorRef: directionsButtonRef,
    });
  };

  const handleViewDetails = () => {
    if (!hotspot) return;
    const url = `https://ebird.org/hotspot/${hotspot.id}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open eBird hotspot page");
    });
  };

  const handleToggleSave = async () => {
    if (!hotspot) return;

    try {
      if (isSaved) {
        await unsaveMutation.mutateAsync(hotspot.id);
      } else {
        await saveMutation.mutateAsync({ hotspotId: hotspot.id });
      }
    } catch (error) {
      console.error("Failed to toggle save:", error);
      Alert.alert("Error", "Failed to save/unsave hotspot");
    }
  };

  const headerContent = (
    <DialogHeader
      onClose={onClose}
      onSavePress={hotspot ? handleToggleSave : undefined}
      saveDisabled={saveMutation.isPending || unsaveMutation.isPending}
      isSaved={isSaved}
    >
      {hotspot && (
        <>
          <Text selectable style={tw`text-gray-900 text-xl font-bold`}>
            {hotspot.name}
          </Text>
          <View style={tw`flex-row items-center mt-1`}>
            <View style={[tw`w-2.5 h-2.5 rounded-full mr-2`, { backgroundColor: getMarkerColor(hotspot.species || 0) }]} />
            <Text style={tw`text-gray-600 text-sm`}>{hotspot.species} species</Text>
          </View>
        </>
      )}
    </DialogHeader>
  );

  return (
    <BaseBottomSheet isOpen={isOpen} onClose={onClose} snapPoints={[200, 400, 600]} headerContent={headerContent}>
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        <View style={[tw`px-4 pb-4`, { minHeight: 350 }]}>
          {hotspot ? (
            <View style={tw`pt-2`}>
              <Text style={tw`text-sm font-medium text-gray-700 mb-3`}>External Links</Text>
              <View style={tw`gap-3 w-full`}>
                <ActionButton
                  icon={<InfoIcon color={tw.color("blue-500")} size={20} />}
                  label="View Details"
                  onPress={handleViewDetails}
                />

                <ActionButton
                  icon={<TargetsIcon color={tw.color("green-600")} size={20} />}
                  label="View Targets"
                  onPress={handleOpenTargets}
                />

                <ActionButton
                  ref={directionsButtonRef}
                  icon={<DirectionsIcon color={tw.color("orange-600")} size={20} />}
                  label="Get Directions"
                  onPress={handleGetDirections}
                  onLongPress={handleShowMapProviders}
                />
              </View>
            </View>
          ) : isLoadingHotspot ? null : (
            <View style={tw`py-8 items-center`}>
              <Text style={tw`text-gray-600`}>Hotspot not found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </BaseBottomSheet>
  );
}
