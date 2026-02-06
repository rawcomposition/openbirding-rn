import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import React, { ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BaseBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: (string | number)[];
  initialIndex?: number;
  children: ReactNode;
  showHeader?: boolean;
  headerContent?: ReactNode;
  scrollable?: boolean;
  enableDynamicSizing?: boolean;
};

export default function BaseBottomSheet({
  isOpen,
  onClose,
  title,
  snapPoints,
  initialIndex = 0,
  children,
  showHeader = true,
  headerContent,
  scrollable = false,
  enableDynamicSizing = true,
}: BaseBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const memoizedSnapPoints = useMemo(() => snapPoints, [snapPoints]);
  const bottomPadding = Math.max(insets.bottom, 16);

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(initialIndex);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen, initialIndex]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const renderHeader = () => {
    if (!showHeader) return null;

    if (headerContent) {
      return headerContent;
    }

    return (
      <View style={tw`flex-row items-start justify-between px-4`}>
        <View style={tw`pl-1`}>
          <Text style={tw`text-gray-900 text-xl font-bold text-center`}>{title}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={tw`w-10 h-10 items-center justify-center bg-slate-100 rounded-full`}>
          <Ionicons name="close" size={26} color={tw.color("gray-500")} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      {Platform.OS === "android" && isOpen && <View style={tw`absolute bottom-0 left-0 right-0 h-6 bg-white`} />}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={enableDynamicSizing ? undefined : memoizedSnapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose
        enableDynamicSizing={enableDynamicSizing}
        topInset={insets.top}
        backgroundStyle={tw`bg-white rounded-t-3xl`}
        handleIndicatorStyle={tw`bg-gray-300`}
      >
        {scrollable ? (
          <>
            {renderHeader()}
            {children}
          </>
        ) : (
          <BottomSheetView style={tw`flex-1`}>
            {renderHeader()}
            {children}
            <View style={{ height: bottomPadding }} />
          </BottomSheetView>
        )}
      </BottomSheet>
    </>
  );
}
