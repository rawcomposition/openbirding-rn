import { getTargetsForHotspot } from "@/lib/database";
import tw from "@/lib/tw";
import { parsePackVersion } from "@/lib/utils";
import { useMapStore } from "@/stores/mapStore";
import { useSettingsStore } from "@/stores/settingsStore";

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
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
  const showAllSpecies = useSettingsStore((s) => s.showAllSpecies);
  const setShowAllSpecies = useSettingsStore((s) => s.setShowAllSpecies);
  const displayMode = useSettingsStore((s) => s.hotspotDisplayMode);
  const setDisplayMode = useSettingsStore((s) => s.setHotspotDisplayMode);
  const isBottomSheetExpanded = useMapStore((s) => s.isBottomSheetExpanded);
  const useGlassTargetMenuButton = Platform.OS === "ios" && isLiquidGlassAvailable();
  const [aboutDataOpen, setAboutDataOpen] = useState(false);

  useEffect(() => {
    setAboutDataOpen(false);
  }, [hotspotId]);

  const { data, isLoading } = useQuery({
    queryKey: ["hotspotTargets", hotspotId, selectedMonths],
    queryFn: () => getTargetsForHotspot(hotspotId, selectedMonths.length > 0 ? selectedMonths : undefined),
    enabled: !!hotspotId,
    placeholderData: (prev) => prev,
  });

  const hasVersion = !!(data?.version && parsePackVersion(data.version));
  const showMenu = !!data && data.targets.length > 0;

  return (
    <View style={tw`mt-4`}>
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-base font-semibold text-gray-900`}>Targets</Text>
          {data?.samples && data.samples > 0 && (
            <Text style={tw`text-sm text-gray-500 mt-1`}>Based on {data.samples.toLocaleString()} checklists</Text>
          )}
        </View>
        {showMenu && (
          <FloatingMenuTrigger
            sections={buildTargetsMenuSections({
              showAllSpecies,
              onToggleShowAll: () => setShowAllSpecies(!showAllSpecies),
              displayMode,
              onToggleDisplayMode: () => setDisplayMode(displayMode === "chart" ? "percent" : "chart"),
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
        hotspotId={hotspotId}
        onExpandSheet={onExpandSheet}
        aboutDataOpen={aboutDataOpen}
        onAboutDataOpenChange={setAboutDataOpen}
        displayMode={displayMode}
      />
    </View>
  );
}
