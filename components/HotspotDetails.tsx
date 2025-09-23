import React, { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { getHotspotById } from "@/lib/database";
import { getMarkerColor } from "@/lib/utils";
import AccessStatus from "./AccessStatus";
import InfoIcon from "./icons/InfoIcon";
import TargetsIcon from "./icons/TargetsIcon";
import DirectionsIcon from "./icons/DirectionsIcon";
import ExternalLinkIcon from "./icons/ExternalLinkIcon";

type HotspotDetailsProps = {
  isOpen: boolean;
  hotspotId: string | null;
  onClose: () => void;
};

type Hotspot = {
  id: string;
  name: string;
  species: number;
  lat: number;
  lng: number;
  open: boolean | null;
  notes: string | null;
  lastUpdatedBy: string | null;
  updatedAt: string | null;
};

export default function HotspotDetails({ isOpen, hotspotId, onClose }: HotspotDetailsProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [hotspot, setHotspot] = useState<Hotspot | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const snapPoints = useMemo(() => [200, 400, 600], []);

  const loadHotspot = useCallback(async () => {
    if (!hotspotId) return;

    setIsLoading(true);
    try {
      const hotspotData = await getHotspotById(hotspotId);
      setHotspot(hotspotData);
    } catch (error) {
      console.error("Failed to load hotspot:", error);
      Alert.alert("Error", "Failed to load hotspot details");
    } finally {
      setIsLoading(false);
    }
  }, [hotspotId]);

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (hotspotId && isOpen) {
      loadHotspot();
    }
  }, [hotspotId, isOpen, loadHotspot]);

  const handleSheetChanges = (index: number) => {
    if (index === -1) {
      onClose();
    }
  };

  const handleOpenTargets = () => {
    if (!hotspot) return;
    const url = `https://ebird.org/targets?r1=${hotspot.id}&bmo=1&emo=12&r2=world&t2=life`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open eBird link");
    });
  };

  const handleGetDirections = () => {
    if (!hotspot) return;
    const url = `https://www.google.com/maps?q=${hotspot.lat},${hotspot.lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open directions");
    });
  };

  const handleViewDetails = () => {
    if (!hotspot) return;
    const url = `https://ebird.org/hotspot/${hotspot.id}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open eBird hotspot page");
    });
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={tw`bg-white`}
      handleIndicatorStyle={tw`bg-gray-300`}
    >
      <BottomSheetView style={tw`flex-1`}>
        <View style={tw`flex-row items-start justify-between p-4 pt-0`}>
          <View style={tw`flex-1 pr-4`}>
            {isLoading ? (
              <Text style={tw`text-gray-600`}>Loading...</Text>
            ) : hotspot ? (
              <>
                <Text style={tw`text-gray-900 text-xl font-bold`}>{hotspot.name}</Text>
                <View style={tw`flex-row items-center mt-1`}>
                  <View
                    style={[
                      tw`w-2.5 h-2.5 rounded-full mr-2`,
                      { backgroundColor: getMarkerColor(hotspot.species || 0) },
                    ]}
                  />
                  <Text style={tw`text-gray-600 text-sm`}>{hotspot.species} species</Text>
                </View>
              </>
            ) : (
              <Text style={tw`text-gray-600`}>Hotspot not found</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={tw`w-8 h-8 items-center justify-center bg-slate-100 rounded-full shadow-sm`}
          >
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
          <View style={[tw`px-4 pb-4`, { minHeight: 350 }]}>
            {isLoading ? (
              <View style={tw`py-8 items-center`}>
                <Text style={tw`text-gray-600`}>Loading hotspot details...</Text>
              </View>
            ) : hotspot ? (
              <>
                <AccessStatus
                  open={hotspot.open}
                  notes={hotspot.notes}
                  updatedAt={hotspot.updatedAt}
                  lastUpdatedBy={hotspot.lastUpdatedBy}
                />

                <View style={tw`pt-2`}>
                  <Text style={tw`text-sm font-medium text-gray-700 mb-3`}>External Links</Text>
                  <View style={tw`gap-3 w-full`}>
                    <TouchableOpacity
                      style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg flex-1`}
                      onPress={handleViewDetails}
                      activeOpacity={0.7}
                    >
                      <InfoIcon color="#3b82f6" size={20} />
                      <Text style={tw`text-gray-700 text-[16px] font-medium ml-3 flex-1`}>View Details</Text>
                      <ExternalLinkIcon color="#9ca3af" size={16} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg flex-1`}
                      onPress={handleOpenTargets}
                      activeOpacity={0.7}
                    >
                      <TargetsIcon color="#059669" size={20} />
                      <Text style={tw`text-gray-700 text-[16px] font-medium ml-3 flex-1`}>View Targets</Text>
                      <ExternalLinkIcon color="#9ca3af" size={16} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg flex-1`}
                      onPress={handleGetDirections}
                      activeOpacity={0.7}
                    >
                      <DirectionsIcon color="#c2410d" size={20} />
                      <Text style={tw`text-gray-700 text-[16px] font-medium ml-3 flex-1`}>Get Directions</Text>
                      <ExternalLinkIcon color="#9ca3af" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <View style={tw`py-8 items-center`}>
                <Text style={tw`text-gray-600`}>Hotspot not found</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
}
