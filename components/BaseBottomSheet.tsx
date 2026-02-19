import tw from "@/lib/tw";
import { useMapStore } from "@/stores/mapStore";
import { TrueSheet, type SheetDetent } from "@lodev09/react-native-true-sheet";
import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
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
  children: ReactNode | ((dismiss: () => Promise<void>) => ReactNode);
  showHeader?: boolean;
  headerContent?: (dismiss: () => Promise<void>) => ReactNode;
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
  const dismissingRef = useRef(false);
  const insets = useSafeAreaInsets();
  const setIsBottomSheetExpanded = useMapStore((state) => state.setIsBottomSheetExpanded);
  const bottomPadding = Math.max(insets.bottom, 16);
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    // Handle external dismiss
    if (isOpen) {
      dismissingRef.current = false;
      setShouldRender(true);
    } else if (!dismissingRef.current) {
      sheetRef.current?.dismiss();
    }
  }, [isOpen]);

  const dismiss = useCallback(async () => {
    await sheetRef.current?.dismiss();
  }, []);

  const header = showHeader ? (
    headerContent ? (
      <>{headerContent(dismiss)}</>
    ) : (
      <View style={tw`flex-row items-start justify-between pr-5 pl-5.5`}>
        <View style={tw`pl-1`}>
          <Text style={tw`text-gray-900 text-xl font-bold text-center`}>{title}</Text>
        </View>
        <IconButton icon="close" variant="muted" onPress={dismiss} />
      </View>
    )
  ) : undefined;

  if (!shouldRender) return null;

  return (
    <TrueSheet
      ref={sheetRef}
      initialDetentIndex={initialIndex}
      detents={detents}
      scrollable={scrollable}
      dismissible
      dimmed={dimmed}
      backgroundColor="white"
      grabber={false}
      header={header}
      headerStyle={tw`pt-5`}
      onWillDismiss={() => {
        dismissingRef.current = true;
        onClose();
      }}
      onDidDismiss={() => {
        setShouldRender(false);
        setIsBottomSheetExpanded(false);
      }}
      onDetentChange={(e) => {
        setIsBottomSheetExpanded(e.nativeEvent.detent >= EXPANDED_THRESHOLD);
      }}
    >
      {scrollable ? (
        typeof children === "function" ? (
          children(dismiss)
        ) : (
          children
        )
      ) : (
        <>
          {typeof children === "function" ? children(dismiss) : children}
          <View style={{ height: bottomPadding }} />
        </>
      )}
    </TrueSheet>
  );
}
