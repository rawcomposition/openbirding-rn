import { getHotspotById, getSavedHotspotById, isHotspotSaved, saveHotspot, unsaveHotspot } from "@/lib/database";
import tw from "@/lib/tw";
import { getMarkerColor } from "@/lib/utils";
import { useMapStore } from "@/stores/mapStore";
import { FontAwesome6 } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  TouchableOpacity as RNTouchableOpacity,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { PopoverMode, PopoverPlacement } from "react-native-popover-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ActionButton from "./ActionButton";
import ActionButtonRow from "./ActionButtonRow";
import BaseBottomSheet from "./BaseBottomSheet";
import DialogHeader from "./DialogHeader";
import DirectionsMenuButton from "./DirectionsMenuButton";
import FloatingMenu, { FloatingMenuSection } from "./FloatingMenu";
import HotspotNotesSheet from "./HotspotNotesSheet";
import HotspotTargets from "./HotspotTargets";
import InfoIcon from "./icons/InfoIcon";

type HotspotDialogProps = {
  isOpen: boolean;
  hotspotId: string | null;
  onClose: () => void;
};

type RowMenuState = {
  sections: FloatingMenuSection[];
  from: React.RefObject<View | null>;
  placement: PopoverPlacement;
};

const MENU_EDGE_MARGIN = 12;
const MENU_ROW_ESTIMATED_HEIGHT = 48;
const MENU_VERTICAL_PADDING = 8;
const MENU_SECTION_SEPARATOR_HEIGHT = 9;

function getEstimatedMenuHeight(sections: FloatingMenuSection[]) {
  const itemCount = sections.reduce((total, section) => total + section.items.length, 0);
  const separatorCount = Math.max(sections.length - 1, 0);
  return MENU_VERTICAL_PADDING + itemCount * MENU_ROW_ESTIMATED_HEIGHT + separatorCount * MENU_SECTION_SEPARATOR_HEIGHT;
}

export default function HotspotDialog({ isOpen, hotspotId, onClose }: HotspotDialogProps) {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { fontScale, height: windowHeight } = useWindowDimensions();
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);
  const useStackedActionButtons = fontScale >= 1.25;
  const debugHideHotspotActions = useMapStore((s) => s.debugHideHotspotActions);

  useEffect(() => {
    setRowMenu(null);
  }, [hotspotId, isOpen]);

  const { data: hotspot, isLoading: isLoadingHotspot } = useQuery({
    queryKey: ["hotspot", hotspotId],
    queryFn: () => (hotspotId ? getHotspotById(hotspotId) : Promise.resolve(null)),
    enabled: !!hotspotId && isOpen,
  });

  const { data: isSaved = false } = useQuery({
    queryKey: ["isHotspotSaved", hotspotId],
    queryFn: () => (hotspotId ? isHotspotSaved(hotspotId) : Promise.resolve(false)),
    enabled: !!hotspotId,
  });

  const { data: savedHotspot } = useQuery({
    queryKey: ["savedHotspot", hotspotId],
    queryFn: () => (hotspotId ? getSavedHotspotById(hotspotId) : Promise.resolve(null)),
    enabled: !!hotspotId && isSaved,
  });

  const saveMutation = useMutation({
    mutationFn: ({ hotspotId, notes }: { hotspotId: string; notes?: string }) => saveHotspot(hotspotId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedHotspots"] });
      queryClient.invalidateQueries({ queryKey: ["isHotspotSaved", hotspotId] });
      queryClient.invalidateQueries({ queryKey: ["savedHotspot", hotspotId] });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (hotspotId: string) => unsaveHotspot(hotspotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedHotspots"] });
      queryClient.invalidateQueries({ queryKey: ["isHotspotSaved", hotspotId] });
      queryClient.invalidateQueries({ queryKey: ["savedHotspot", hotspotId] });
    },
  });

  const handleViewDetails = () => {
    if (!hotspot) return;
    const url = `https://ebird.org/hotspot/${hotspot.id}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open eBird hotspot page");
    });
  };

  const handleToggleSave = async () => {
    if (!hotspot) return;

    try {
      if (isSaved) {
        await unsaveMutation.mutateAsync(hotspot.id);
      } else {
        await saveMutation.mutateAsync({ hotspotId: hotspot.id });
      }
    } catch (error) {
      console.error("Failed to toggle save:", error);
      Alert.alert("Error", "Failed to save/unsave hotspot");
    }
  };

  const notes = savedHotspot?.notes || "";

  const handleOpenRowMenu = (sections: FloatingMenuSection[], from: React.RefObject<View | null>) => {
    const fallbackPlacement = PopoverPlacement.TOP;
    if (!from.current) {
      setRowMenu({ sections, from, placement: fallbackPlacement });
      return;
    }

    from.current.measureInWindow((_x, y, _width, height) => {
      const estimatedMenuHeight = getEstimatedMenuHeight(sections);
      const availableAbove = y - insets.top - MENU_EDGE_MARGIN;
      const availableBelow = windowHeight - (y + height) - Math.max(insets.bottom, 16) - MENU_EDGE_MARGIN;
      const placement =
        availableBelow >= estimatedMenuHeight || availableBelow >= availableAbove
          ? PopoverPlacement.BOTTOM
          : PopoverPlacement.TOP;

      setRowMenu({ sections, from, placement });
    });
  };

  const headerContent = (dismiss: () => Promise<void>) => (
    <View onTouchStart={() => setRowMenu(null)}>
      <DialogHeader
        onClose={dismiss}
        onSavePress={hotspot ? handleToggleSave : undefined}
        saveDisabled={saveMutation.isPending || unsaveMutation.isPending}
        isSaved={isSaved}
      >
        {hotspot && (
          <>
            <Text selectable style={tw`text-gray-900 text-xl font-bold`}>
              {hotspot.name}
            </Text>
            <View style={tw`flex-row items-center mt-1`}>
              <View
                style={[tw`w-2.5 h-2.5 rounded-full mr-2`, { backgroundColor: getMarkerColor(hotspot.species || 0) }]}
              />
              <Text style={tw`text-gray-600 text-sm`}>{hotspot.species} species</Text>
            </View>
          </>
        )}
      </DialogHeader>
    </View>
  );

  return (
    <>
      <BaseBottomSheet isOpen={isOpen} onClose={onClose} detents={[0.4, 0.97]} headerContent={headerContent} scrollable>
        <View style={tw`flex-1`}>
          <ScrollView
            style={tw`flex-1`}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => setRowMenu(null)}
          >
            <View style={[tw`px-4`, { minHeight: 350, paddingBottom: Math.max(insets.bottom, 16) }]}>
              {hotspot ? (
                <View style={tw`pt-2`}>
                  {isSaved && (
                    <RNTouchableOpacity activeOpacity={0.6} onPress={() => setIsNotesOpen(true)} style={tw`mb-3`}>
                      {notes ? (
                        <View style={tw`bg-gray-50 p-3 rounded-lg flex-row items-start`}>
                          <Text style={tw`text-gray-700 flex-1 text-sm`}>{notes}</Text>
                          <FontAwesome6 name="pencil" size={12} color={tw.color("gray-400")} style={tw`ml-2 mt-0.5`} />
                        </View>
                      ) : (
                        <View style={tw`flex-row items-center py-1.5 px-2`}>
                          <FontAwesome6 name="pencil" size={12} color={tw.color("gray-400")} style={tw`mr-2`} />
                          <Text style={tw`text-gray-400 text-sm`}>Add notes...</Text>
                        </View>
                      )}
                    </RNTouchableOpacity>
                  )}

                  {!debugHideHotspotActions && (
                    <ActionButtonRow stacked={useStackedActionButtons}>
                      <ActionButton
                        icon={<InfoIcon color={tw.color("[#36824b]")} size={20} />}
                        label="View on eBird"
                        stacked={useStackedActionButtons}
                        onPress={handleViewDetails}
                      />

                      <DirectionsMenuButton
                        latitude={hotspot.lat}
                        longitude={hotspot.lng}
                        stacked={useStackedActionButtons}
                      />
                    </ActionButtonRow>
                  )}

                  <HotspotTargets
                    hotspotId={hotspot.id}
                    lat={hotspot.lat}
                    lng={hotspot.lng}
                    onOpenRowMenu={handleOpenRowMenu}
                  />
                </View>
              ) : isLoadingHotspot ? null : (
                <View style={tw`py-8 items-center`}>
                  <Text style={tw`text-gray-600 text-base`}>Hotspot not found</Text>
                </View>
              )}
            </View>
          </ScrollView>
          <FloatingMenu
            isOpen={!!rowMenu}
            onClose={() => setRowMenu(null)}
            from={rowMenu?.from}
            sections={rowMenu?.sections ?? []}
            mode={PopoverMode.JS_MODAL}
            placement={rowMenu?.placement}
          />
        </View>
      </BaseBottomSheet>
      {isNotesOpen && hotspotId && (
        <HotspotNotesSheet isOpen hotspotId={hotspotId} initialNotes={notes} onClose={() => setIsNotesOpen(false)} />
      )}
    </>
  );
}
