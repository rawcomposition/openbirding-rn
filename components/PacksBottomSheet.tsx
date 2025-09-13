import React, { useRef, useMemo, useEffect } from "react";
import { View, Text } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import tw from "twrnc";
import MenuList from "./MenuList";

type PacksBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function PacksBottomSheet({ isOpen, onClose }: PacksBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const router = useRouter();

  const snapPoints = useMemo(() => ["25%", "50%", "90%"], []);

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const handleNavigateToPacks = () => {
    onClose();
    router.push("/packs");
  };

  const handleNavigateToSettings = () => {
    onClose();
    router.push("/settings");
  };

  const handleSheetChanges = (index: number) => {
    if (index === -1) {
      onClose();
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
        <View style={tw`px-4 pb-2`}>
          <Text style={tw`text-gray-900 text-xl font-bold text-center`}>Menu</Text>
        </View>
        <View style={tw`flex-1`}>
          <MenuList onNavigateToPacks={handleNavigateToPacks} onNavigateToSettings={handleNavigateToSettings} />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
