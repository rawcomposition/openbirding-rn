import React, { useRef, useMemo, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { getHotspotById } from "@/lib/database";

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
  }, [hotspotId, isOpen]);

  const loadHotspot = async () => {
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
  };

  const handleSheetChanges = (index: number) => {
    if (index === -1) {
      onClose();
    }
  };

  const handleOpenEBird = () => {
    if (!hotspot) return;
    const url = `https://ebird.org/hotspot/${hotspot.id}`;
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

  const getOpenAccessIcon = () => {
    if (hotspot?.open === true) {
      return <FontAwesome name="check-circle" size={20} color="#3b82f6" />;
    } else if (hotspot?.open === false) {
      return <FontAwesome name="times-circle" size={20} color="#ef4444" />;
    } else {
      return <FontAwesome name="question-circle" size={20} color="#9ca3af" />;
    }
  };

  const getOpenAccessText = () => {
    if (hotspot?.open === true) {
      return "Open Access";
    } else if (hotspot?.open === false) {
      return "Not Open Access";
    } else {
      return "Not Reviewed";
    }
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
        <View style={tw`flex-row items-start justify-between p-4 pt-0 border-b border-gray-200`}>
          <View style={tw`flex-1 pr-4`}>
            {isLoading ? (
              <Text style={tw`text-gray-600`}>Loading...</Text>
            ) : hotspot ? (
              <>
                <Text style={tw`text-gray-900 text-xl font-bold`}>{hotspot.name}</Text>
                <Text style={tw`text-gray-600 text-sm mt-1`}>{hotspot.species} species</Text>
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
                <View style={tw`bg-gray-50 rounded-lg p-4 mb-4`}>
                  <View style={tw`flex-row items-center mb-3`}>
                    {getOpenAccessIcon()}
                    <Text style={tw`text-gray-900 text-base font-medium ml-2`}>{getOpenAccessText()}</Text>
                  </View>

                  {hotspot.notes && (
                    <View style={tw`pt-3 border-t border-gray-200`}>
                      <Text style={tw`text-sm text-gray-800`}>{hotspot.notes}</Text>
                    </View>
                  )}

                  {hotspot.updatedAt && (
                    <View style={tw`mt-3 pt-3 border-t border-gray-200`}>
                      <View style={tw`flex-row items-center`}>
                        <FontAwesome name="calendar" size={12} color="#9ca3af" />
                        <Text style={tw`text-xs text-gray-500 ml-1`}>
                          Updated {new Date(hotspot.updatedAt).toLocaleDateString()}
                          {hotspot.lastUpdatedBy && ` by ${hotspot.lastUpdatedBy}`}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                <View style={tw`pt-2`}>
                  <Text style={tw`text-sm font-medium text-gray-700 mb-3`}>External Links</Text>
                  <View style={tw`gap-3`}>
                    <TouchableOpacity
                      style={tw`flex-row items-center p-3 bg-blue-50 rounded-lg`}
                      onPress={handleOpenEBird}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="external-link" size={20} color="#3b82f6" />
                      <Text style={tw`text-blue-800 text-sm ml-3 flex-1`}>View on eBird</Text>
                      <FontAwesome name="chevron-right" size={16} color="#3b82f6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={tw`flex-row items-center p-3 bg-green-50 rounded-lg`}
                      onPress={handleGetDirections}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="map-marker" size={20} color="#059669" />
                      <Text style={tw`text-green-800 text-sm ml-3 flex-1`}>Get Directions</Text>
                      <FontAwesome name="chevron-right" size={16} color="#059669" />
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
