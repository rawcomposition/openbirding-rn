import tw from "@/lib/tw";
import { useMapStore } from "@/stores/mapStore";
import { Ionicons } from "@expo/vector-icons";
import { TrueSheet, type DetentChangeEvent, type DidDismissEvent, type SheetDetent } from "@lodev09/react-native-true-sheet";
import React, { ReactNode, useCallback, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EXPANDED_THRESHOLD = 0.9;

type BaseBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: (string | number)[];
  initialIndex?: number;
  children: ReactNode;
  showHeader?: boolean;
  headerContent?: (dismiss: () => void) => ReactNode;
  scrollable?: boolean;
  enableDynamicSizing?: boolean;
  dimmed?: boolean;
};

function convertSnapPointsToDetents(
  snapPoints: (string | number)[] | undefined,
  enableDynamicSizing: boolean
): SheetDetent[] {
  if (enableDynamicSizing || !snapPoints) {
    return ["auto"];
  }
  return snapPoints.map((sp) => {
    if (typeof sp === "string" && sp.endsWith("%")) {
      return parseFloat(sp) / 100;
    }
    return typeof sp === "number" ? sp : 0.5;
  });
}

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
  dimmed = false,
}: BaseBottomSheetProps) {
  const sheetRef = useRef<TrueSheet>(null);
  const insets = useSafeAreaInsets();
  const setIsBottomSheetExpanded = useMapStore((state) => state.setIsBottomSheetExpanded);
  const bottomPadding = Math.max(insets.bottom, 16);

  const detents = convertSnapPointsToDetents(snapPoints, enableDynamicSizing);

  const handleDismiss = useCallback(
    (_event: DidDismissEvent) => {
      setIsBottomSheetExpanded(false);
      onClose();
    },
    [onClose, setIsBottomSheetExpanded]
  );

  const handleDetentChange = useCallback(
    (event: DetentChangeEvent) => {
      const { detent } = event.nativeEvent;
      setIsBottomSheetExpanded(detent >= EXPANDED_THRESHOLD);
    },
    [setIsBottomSheetExpanded]
  );

  const dismiss = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const header = showHeader
    ? headerContent
      ? <>{headerContent(dismiss)}</>
      : (
        <View style={tw`flex-row items-start justify-between px-4`}>
          <View style={tw`pl-1`}>
            <Text style={tw`text-gray-900 text-xl font-bold text-center`}>{title}</Text>
          </View>
          <TouchableOpacity onPress={dismiss} style={tw`w-10 h-10 items-center justify-center bg-slate-100 rounded-full`}>
            <Ionicons name="close" size={26} color={tw.color("gray-500")} />
          </TouchableOpacity>
        </View>
      )
    : undefined;

  if (!isOpen) return null;

  return (
    <TrueSheet
      ref={sheetRef}
      initialDetentIndex={initialIndex}
      detents={detents}
      scrollable={scrollable}
      dismissible
      dimmed={dimmed}
      backgroundColor="white"
      grabber
      grabberOptions={{ color: "#d1d5db" }}
      header={header}
      headerStyle={tw`pt-6`}
      onDidDismiss={handleDismiss}
      onDetentChange={handleDetentChange}
    >
      {scrollable ? (
        children
      ) : (
        <>
          {children}
          <View style={{ height: bottomPadding }} />
        </>
      )}
    </TrueSheet>
  );
}
