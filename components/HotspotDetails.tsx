import { useDefaultMapProvider } from "@/hooks/useDefaultMapProvider";
import { getHotspotById, isHotspotSaved, saveHotspot, unsaveHotspot } from "@/lib/database";
import { getDirections, getExternalMapProviders, getMarkerColor } from "@/lib/utils";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useRef } from "react";
import {
  ActionSheetIOS,
  Alert,
  findNodeHandle,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import tw from "twrnc";
import BaseBottomSheet from "./BaseBottomSheet";
import DirectionsIcon from "./icons/DirectionsIcon";
import ExternalLinkIcon from "./icons/ExternalLinkIcon";
import InfoIcon from "./icons/InfoIcon";
import StarIcon from "./icons/StarIcon";
import TargetsIcon from "./icons/TargetsIcon";

type HotspotDetailsProps = {
  isOpen: boolean;
  hotspotId: string | null;
  onClose: () => void;
};

export default function HotspotDetails({ isOpen, hotspotId, onClose }: HotspotDetailsProps) {
  const queryClient = useQueryClient();
  const directionsButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const { showActionSheetWithOptions } = useActionSheet();
  const { defaultProvider } = useDefaultMapProvider();

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

    if (defaultProvider && defaultProvider !== "") {
      const url = getDirections(defaultProvider, hotspot.lat, hotspot.lng);
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Could not open directions");
      });
    } else {
      handleShowMapProviders();
    }
  };

  const handleShowMapProviders = () => {
    if (!hotspot) return;

    const providers = getExternalMapProviders();
    const options = [...providers.map((provider) => provider.name), "Cancel"];
    const cancelButtonIndex = options.length - 1;

    const handleProviderSelection = (buttonIndex: number | undefined) => {
      if (buttonIndex !== undefined && buttonIndex < providers.length) {
        const selectedProvider = providers[buttonIndex];
        const url = getDirections(selectedProvider.id, hotspot.lat, hotspot.lng);
        Linking.openURL(url).catch(() => {
          Alert.alert("Error", `Could not open ${selectedProvider.name}`);
        });
      }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: "Choose Map Provider",
          anchor: findNodeHandle(directionsButtonRef.current) || undefined,
        },
        handleProviderSelection
      );
    } else {
      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: "Choose Map Provider",
          useModal: true,
        },
        handleProviderSelection
      );
    }
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

  const customHeader = (
    <View style={tw`flex-row items-start justify-between p-4 pt-0`}>
      <View style={tw`flex-1 pr-4 pl-1`}>
        {hotspot && (
          <>
            <Text selectable style={tw`text-gray-900 text-xl font-bold`}>
              {hotspot.name}
            </Text>
            <View style={tw`flex-row items-center mt-1`}>
              <View
                style={[tw`w-2.5 h-2.5 rounded-full mr-2`, { backgroundColor: getMarkerColor(hotspot.species || 0) }]}
              />
              <Text style={tw`text-gray-600 text-sm`}>{hotspot.species} species</Text>
            </View>
          </>
        )}
      </View>
      <View style={tw`flex-row items-center gap-2`}>
        {hotspot && (
          <TouchableOpacity
            onPress={handleToggleSave}
            disabled={saveMutation.isPending || unsaveMutation.isPending}
            style={tw`w-10 h-10 items-center justify-center bg-slate-100 rounded-full shadow-sm`}
          >
            <StarIcon size={20} color={isSaved ? tw.color("yellow-400") : tw.color("gray-500")} filled={isSaved} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onClose}
          style={tw`w-10 h-10 items-center justify-center bg-slate-100 rounded-full shadow-sm`}
        >
          <Ionicons name="close" size={26} color={tw.color("gray-500")} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <BaseBottomSheet isOpen={isOpen} onClose={onClose} snapPoints={[200, 400, 600]} headerContent={customHeader}>
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        <View style={[tw`px-4 pb-4`, { minHeight: 350 }]}>
          {hotspot ? (
            <View style={tw`pt-2`}>
              <Text style={tw`text-sm font-medium text-gray-700 mb-3`}>External Links</Text>
              <View style={tw`gap-3 w-full`}>
                <TouchableOpacity
                  style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg flex-1`}
                  onPress={handleViewDetails}
                  activeOpacity={0.7}
                >
                  <InfoIcon color={tw.color("blue-500")} size={20} />
                  <Text style={tw`text-gray-700 text-[16px] font-medium ml-3 flex-1`}>View Details</Text>
                  <ExternalLinkIcon color={tw.color("gray-400")} size={16} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg flex-1`}
                  onPress={handleOpenTargets}
                  activeOpacity={0.7}
                >
                  <TargetsIcon color={tw.color("green-600")} size={20} />
                  <Text style={tw`text-gray-700 text-[16px] font-medium ml-3 flex-1`}>View Targets</Text>
                  <ExternalLinkIcon color={tw.color("gray-400")} size={16} />
                </TouchableOpacity>

                <TouchableOpacity
                  ref={directionsButtonRef}
                  style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg flex-1`}
                  onPress={handleGetDirections}
                  onLongPress={handleShowMapProviders}
                  activeOpacity={0.7}
                >
                  <DirectionsIcon color={tw.color("orange-600")} size={20} />
                  <Text style={tw`text-gray-700 text-[16px] font-medium ml-3 flex-1`}>Get Directions</Text>
                  <ExternalLinkIcon color={tw.color("gray-400")} size={16} />
                </TouchableOpacity>
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
