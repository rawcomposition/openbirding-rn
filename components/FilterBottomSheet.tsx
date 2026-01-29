import tw from "@/lib/tw";
import { useFiltersStore } from "@/stores/filtersStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FilterBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

const SHEET_HEIGHT = 250;

export default function FilterBottomSheet({ isOpen, onClose }: FilterBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { showSavedOnly, setShowSavedOnly } = useFiltersStore();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
      backdropAnim.setValue(0);
    }
  }, [isOpen, slideAnim, backdropAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  return (
    <Modal visible={isOpen} transparent onRequestClose={handleClose}>
      <View style={tw`flex-1`}>
        <Animated.View
          style={[
            tw`absolute inset-0 bg-black`,
            { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) },
          ]}
        >
          <Pressable style={tw`flex-1`} onPress={handleClose} />
        </Animated.View>

        <View style={tw`flex-1`} pointerEvents="box-none" />

        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
          <Pressable
            style={[tw`bg-white rounded-t-3xl`, { paddingBottom: Math.max(insets.bottom, 20) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={tw`items-center pt-3 pb-2`}>
              <View style={tw`w-10 h-1 bg-gray-300 rounded-full`} />
            </View>

            <View style={tw`flex-row items-center justify-between px-5 pb-3`}>
              <Text style={tw`text-gray-900 text-xl font-bold`}>Filters</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={tw`w-10 h-10 items-center justify-center bg-slate-100 rounded-full`}
              >
                <Ionicons name="close" size={26} color={tw.color("gray-500")} />
              </TouchableOpacity>
            </View>

            <View style={tw`px-5 pt-2 pb-4`}>
              <View style={tw`flex-row items-center justify-between py-3`}>
                <Text style={tw`text-base text-gray-900`}>Show saved only</Text>
                <Switch value={showSavedOnly} onValueChange={setShowSavedOnly} />
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
