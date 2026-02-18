import tw from "@/lib/tw";
import { useMapStore } from "@/stores/mapStore";
import {
  TrueSheet,
  type DetentChangeEvent,
  type DidDismissEvent,
  type SheetDetent,
} from "@lodev09/react-native-true-sheet";
import React, { ReactNode, useCallback, useRef } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import IconButton from "./IconButton";

const EXPANDED_THRESHOLD = 0.9;

type BaseBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  detents?: SheetDetent[];
  initialIndex?: number;
  children: ReactNode;
  showHeader?: boolean;
  headerContent?: (dismiss: () => void) => ReactNode;
  scrollable?: boolean;
  dimmed?: boolean;
};

export default function BaseBottomSheet({
  isOpen,
  onClose,
  title,
  detents = ["auto"],
  initialIndex = 0,
  children,
  showHeader = true,
  headerContent,
  scrollable = false,
  dimmed = false,
}: BaseBottomSheetProps) {
  const sheetRef = useRef<TrueSheet>(null);
  const insets = useSafeAreaInsets();
  const setIsBottomSheetExpanded = useMapStore((state) => state.setIsBottomSheetExpanded);
  const bottomPadding = Math.max(insets.bottom, 16);

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

  const header = showHeader ? (
    headerContent ? (
      <>{headerContent(dismiss)}</>
    ) : (
      <View style={tw`flex-row items-start justify-between px-5`}>
        <View style={tw`pl-1`}>
          <Text style={tw`text-gray-900 text-xl font-bold text-center`}>{title}</Text>
        </View>
        <IconButton icon="close" variant="muted" onPress={dismiss} />
      </View>
    )
  ) : undefined;

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
