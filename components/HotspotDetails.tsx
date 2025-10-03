import { getHotspotById } from "@/lib/database";
import { getMarkerColor } from "@/lib/utils";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";
import BaseBottomSheet from "./BaseBottomSheet";
import DirectionsIcon from "./icons/DirectionsIcon";
import ExternalLinkIcon from "./icons/ExternalLinkIcon";
import InfoIcon from "./icons/InfoIcon";
import TargetsIcon from "./icons/TargetsIcon";

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
};

export default function HotspotDetails({ isOpen, hotspotId, onClose }: HotspotDetailsProps) {
  const [hotspot, setHotspot] = useState<Hotspot | null>(null);

  const loadHotspot = useCallback(async () => {
    if (!hotspotId) return;

    try {
      const hotspotData = await getHotspotById(hotspotId);
      setHotspot(hotspotData);
    } catch (error) {
      console.error("Failed to load hotspot:", error);
      Alert.alert("Error", "Failed to load hotspot details");
    }
  }, [hotspotId]);

  useEffect(() => {
    if (hotspotId && isOpen) {
      loadHotspot();
    }
  }, [hotspotId, isOpen, loadHotspot]);

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

  const customHeader = (
    <View style={tw`flex-row items-start justify-between p-4 pt-0`}>
      <View style={tw`flex-1 pr-4 pl-1`}>
        {hotspot ? (
          <>
            <Text style={tw`text-gray-900 text-xl font-bold`}>{hotspot.name}</Text>
            <View style={tw`flex-row items-center mt-1`}>
              <View
                style={[tw`w-2.5 h-2.5 rounded-full mr-2`, { backgroundColor: getMarkerColor(hotspot.species || 0) }]}
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
        style={tw`w-10 h-10 items-center justify-center bg-slate-100 rounded-full shadow-sm`}
      >
        <Ionicons name="close" size={26} color={tw.color("gray-500")} />
      </TouchableOpacity>
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
                  style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg flex-1`}
                  onPress={handleGetDirections}
                  activeOpacity={0.7}
                >
                  <DirectionsIcon color={tw.color("orange-600")} size={20} />
                  <Text style={tw`text-gray-700 text-[16px] font-medium ml-3 flex-1`}>Get Directions</Text>
                  <ExternalLinkIcon color={tw.color("gray-400")} size={16} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={tw`py-8 items-center`}>
              <Text style={tw`text-gray-600`}>Hotspot not found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </BaseBottomSheet>
  );
}
