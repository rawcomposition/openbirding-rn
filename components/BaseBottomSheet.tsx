import React, { useRef, useMemo, useEffect, ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import tw from "@/lib/tw";

type BaseBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: (string | number)[];
  children: ReactNode;
  showHeader?: boolean;
  headerContent?: ReactNode;
};

export default function BaseBottomSheet({
  isOpen,
  onClose,
  title,
  snapPoints = ["45%", "90%"],
  children,
  showHeader = true,
  headerContent,
}: BaseBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  const memoizedSnapPoints = useMemo(() => snapPoints, [snapPoints]);

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const handleSheetChanges = (index: number) => {
    if (index === -1) {
      onClose();
    }
  };

  const renderHeader = () => {
    if (!showHeader) return null;

    if (headerContent) {
      return headerContent;
    }

    return (
      <View style={tw`flex-row items-start justify-between p-4 pt-0 border-b border-gray-200`}>
        <View style={tw`pl-1 pr-4 pb-2`}>
          <Text style={tw`text-gray-900 text-xl font-bold text-center`}>{title}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={tw`w-10 h-10 items-center justify-center bg-slate-100 rounded-full`}>
          <Ionicons name="close" size={26} color={tw.color("gray-500")} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={memoizedSnapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={tw`bg-white rounded-t-3xl`}
      handleIndicatorStyle={tw`bg-gray-300`}
    >
      <BottomSheetView style={tw`flex-1`}>
        {renderHeader()}
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}
