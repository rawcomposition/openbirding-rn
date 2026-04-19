import tw from "@/lib/tw";
import { useMapStore } from "@/stores/mapStore";
import React from "react";
import { Modal, Pressable, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DebugMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function DebugMenu({ isOpen, onClose }: DebugMenuProps) {
  const insets = useSafeAreaInsets();
  const debugHideTargetRowMenu = useMapStore((s) => s.debugHideTargetRowMenu);
  const setDebugHideTargetRowMenu = useMapStore((s) => s.setDebugHideTargetRowMenu);
  const debugHideHotspotActions = useMapStore((s) => s.debugHideHotspotActions);
  const setDebugHideHotspotActions = useMapStore((s) => s.setDebugHideHotspotActions);

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={tw`flex-1`}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            tw`absolute right-4 bg-white rounded-xl shadow-lg p-4 w-64`,
            { top: insets.top + 72 },
          ]}
        >
          <Text style={tw`text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3`}>Debug</Text>
          <View style={tw`flex-row items-center justify-between py-2`}>
            <Text style={tw`text-sm text-gray-900 flex-1 mr-3`}>Hide target row 3-dot menu</Text>
            <Switch value={debugHideTargetRowMenu} onValueChange={setDebugHideTargetRowMenu} />
          </View>
          <View style={tw`flex-row items-center justify-between py-2`}>
            <Text style={tw`text-sm text-gray-900 flex-1 mr-3`}>Hide eBird / Directions buttons</Text>
            <Switch value={debugHideHotspotActions} onValueChange={setDebugHideHotspotActions} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
