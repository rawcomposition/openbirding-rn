import React, { useRef, useMemo } from "react";
import { View, Text } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";
import PacksList from "./PacksList";

type PacksBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function PacksBottomSheet({ isOpen, onClose }: PacksBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  const snapPoints = useMemo(() => ["25%", "50%", "90%"], []);

  const handleSheetChanges = (index: number) => {
    if (index === -1) {
      onClose();
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isOpen ? 1 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={tw`bg-slate-800`}
      handleIndicatorStyle={tw`bg-slate-500`}
    >
      <BottomSheetView style={tw`flex-1`}>
        <View style={tw`px-4 pb-2`}>
          <Text style={tw`text-white text-xl font-bold text-center`}>Packs</Text>
        </View>
        <View style={tw`flex-1 px-4`}>
          <PacksList />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
