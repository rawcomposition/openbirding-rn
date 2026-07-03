import { getTargetsForHotspot, getPinnedTargets, pinTarget, unpinTarget } from "@/lib/database";
import tw from "@/lib/tw";
import { parsePackVersion } from "@/lib/utils";
import { useMapStore } from "@/stores/mapStore";
import { useSettingsStore } from "@/stores/settingsStore";

import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import { PopoverPlacement } from "react-native-popover-view";
import { FloatingMenuTrigger } from "./FloatingMenuProvider";
import TargetsView, { buildTargetsMenuSections } from "./TargetsView";

type HotspotTargetsProps = {
  hotspotId: string;
  lat: number;
  lng: number;
  onExpandSheet?: () => Promise<void>;
};

export default function HotspotTargets({ hotspotId, lat, lng, onExpandSheet }: HotspotTargetsProps) {
  const selectedMonths = useSettingsStore((s) => s.targetMonths);
  const lifelist = useSettingsStore((s) => s.lifelist);
  const showAllSpecies = useSettingsStore((s) => s.showAllSpecies);
  const setShowAllSpecies = useSettingsStore((s) => s.setShowAllSpecies);
  const isBottomSheetExpanded = useMapStore((s) => s.isBottomSheetExpanded);
  const hasNoLifeList = !lifelist || lifelist.length === 0;
  const useGlassTargetMenuButton = Platform.OS === "ios" && isLiquidGlassAvailable();
  const [aboutDataOpen, setAboutDataOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setAboutDataOpen(false);
  }, [hotspotId]);

  const { data, isLoading } = useQuery({
    queryKey: ["hotspotTargets", hotspotId, selectedMonths],
    queryFn: () => getTargetsForHotspot(hotspotId, selectedMonths.length > 0 ? selectedMonths : undefined),
    enabled: !!hotspotId && !hasNoLifeList,
    placeholderData: (prev) => prev,
  });

  const { data: pinnedTargets = [] } = useQuery({
    queryKey: ["pinnedTargets", hotspotId],
    queryFn: () => getPinnedTargets(hotspotId),
    enabled: !!hotspotId,
  });

  const handlePinToggle = async (speciesCode: string, isPinned: boolean) => {
    const previousPinnedTargets = pinnedTargets;
    const nextPinnedTargets = isPinned
      ? previousPinnedTargets.filter((code) => code !== speciesCode)
      : [...previousPinnedTargets, speciesCode];

    queryClient.setQueryData<string[]>(["pinnedTargets", hotspotId], nextPinnedTargets);

    try {
      if (isPinned) {
        await unpinTarget(hotspotId, speciesCode);
      } else {
        await pinTarget(hotspotId, speciesCode);
      }

      await queryClient.invalidateQueries({ queryKey: ["pinnedTargets", hotspotId] });
    } catch {
      queryClient.setQueryData<string[]>(["pinnedTargets", hotspotId], previousPinnedTargets);
      Alert.alert("Couldn't Update Pin", "Try again.");
    }
  };

  const hasVersion = !!(data?.version && parsePackVersion(data.version));
  const showMenu = !!data && data.targets.length > 0 && !hasNoLifeList;

  return (
    <View style={tw`mt-4`}>
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-base font-semibold text-gray-900`}>Targets</Text>
          {data?.samples && data.samples > 0 && !hasNoLifeList && (
            <Text style={tw`text-sm text-gray-500 mt-1`}>Based on {data.samples.toLocaleString()} checklists</Text>
          )}
        </View>
        {showMenu && (
          <FloatingMenuTrigger
            sections={buildTargetsMenuSections({
              showAllSpecies,
              onToggleShowAll: () => setShowAllSpecies(!showAllSpecies),
              hasVersion,
              onOpenAbout: () => setAboutDataOpen(true),
            })}
            touchableStyle={tw`w-8 h-8`}
            onBeforeOpen={isBottomSheetExpanded ? undefined : onExpandSheet}
            placementOverride={PopoverPlacement.BOTTOM}
          >
            {useGlassTargetMenuButton ? (
              <GlassView style={tw`w-8 h-8 rounded-full items-center justify-center`} glassEffectStyle="regular" isInteractive>
                <Ionicons name="ellipsis-horizontal" size={16} color={tw.color("gray-700")} />
              </GlassView>
            ) : (
              <View style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center`}>
                <Ionicons name="ellipsis-horizontal" size={16} color={tw.color("gray-700")} />
              </View>
            )}
          </FloatingMenuTrigger>
        )}
      </View>

      <TargetsView
        data={data}
        isLoading={isLoading}
        lat={lat}
        lng={lng}
        resetKey={hotspotId}
        aboutDataOpen={aboutDataOpen}
        onAboutDataOpenChange={setAboutDataOpen}
        pinnedTargets={pinnedTargets}
        onPinToggle={handlePinToggle}
      />
    </View>
  );
}
