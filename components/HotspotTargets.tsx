import { useTaxonomyMap } from "@/hooks/useTaxonomy";
import { getTargetsForHotspot } from "@/lib/database";
import tw from "@/lib/tw";
import { useSettingsStore } from "@/stores/settingsStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Href, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, findNodeHandle, Linking, Pressable, Text, TouchableOpacity, View } from "react-native";

const INITIAL_LIMIT = 10;

type HotspotTargetsProps = {
  hotspotId: string;
};

export default function HotspotTargets({ hotspotId }: HotspotTargetsProps) {
  const [showAll, setShowAll] = useState(false);
  const { taxonomyMap } = useTaxonomyMap();
  const lifelist = useSettingsStore((s) => s.lifelist);
  const setLifelist = useSettingsStore((s) => s.setLifelist);
  const hasNoLifeList = !lifelist || lifelist.length === 0;
  const router = useRouter();
  const menuRefs = useRef<Map<string, React.ComponentRef<typeof TouchableOpacity>>>(new Map());
  const { showActionSheetWithOptions } = useActionSheet();

  useEffect(() => {
    setShowAll(false);
  }, [hotspotId]);

  const { data, isLoading } = useQuery({
    queryKey: ["hotspotTargets", hotspotId],
    queryFn: () => getTargetsForHotspot(hotspotId),
    enabled: !!hotspotId && !hasNoLifeList,
  });

  const filteredTargets = useMemo(() => {
    if (!data) return [];
    const lifelistCodes = lifelist ? new Set(lifelist.map((e) => e.code)) : null;
    return data.targets.filter((t) => t.percentage >= 1 && (!lifelistCodes || !lifelistCodes.has(t.speciesCode)));
  }, [data, lifelist]);

  if (isLoading) return null;

  const displayedTargets = showAll ? filteredTargets : filteredTargets.slice(0, INITIAL_LIMIT);
  const hasMore = filteredTargets.length > INITIAL_LIMIT;

  const hasNoSpeciesData = !data || data.targets.length === 0;
  const hasSeenAllTargets = lifelist && filteredTargets.length === 0 && data?.targets && data.targets.length > 0;

  const handleActionSelection = (buttonIndex: number | undefined, speciesCode: string) => {
    if (buttonIndex === 0) {
      Linking.openURL(`merlinbirdid://species/${speciesCode}`).catch(() => {
        Alert.alert("Cannot Open Merlin", "Make sure the Merlin Bird ID app is installed.");
      });
    } else if (buttonIndex === 1) {
      const newEntry = {
        code: speciesCode,
        date: new Date().toISOString().split("T")[0],
        location: "N/A",
        checklistId: null,
      };
      setLifelist([...(lifelist || []), newEntry]);
    }
  };

  const showActionSheet = (speciesCode: string) => {
    const ref = menuRefs.current.get(speciesCode);
    const anchor = ref ? findNodeHandle(ref) : undefined;
    const options = ["View in Merlin", "Add to Life List"];

    showActionSheetWithOptions(
      {
        options,
        anchor: anchor ?? undefined,
      },
      (buttonIndex) => handleActionSelection(buttonIndex, speciesCode)
    );
  };

  const renderEmptyState = () => {
    if (hasNoSpeciesData) {
      return (
        <View style={tw`mt-3 bg-gray-100 border border-gray-200/80 rounded-lg p-4 flex-row items-center`}>
          <Ionicons name="alert-circle" size={20} color={tw.color("gray-400")} style={tw`mr-3`} />
          <Text style={tw`text-sm text-gray-600 flex-1`}>No species data available for this hotspot.</Text>
        </View>
      );
    }

    if (hasNoLifeList) {
      return (
        <Pressable
          onPress={() => router.push("/settings-import-life-list" as Href)}
          style={tw`mt-3 bg-sky-50 border border-sky-200/80 rounded-lg p-4 flex-row items-center`}
        >
          <View style={tw`flex-1`}>
            <Text style={tw`text-base font-semibold text-sky-900 mb-1`}>Import Life List</Text>
            <Text style={tw`text-sm text-sky-700 mt-0.5`}>See personalized targets based on species you need.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={tw.color("sky-400")} style={tw`ml-3`} />
        </Pressable>
      );
    }

    if (hasSeenAllTargets) {
      return (
        <View style={tw`mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex-row items-center`}>
          <Ionicons name="checkmark-circle" size={20} color={tw.color("emerald-600")} style={tw`mr-3`} />
          <Text style={tw`text-sm text-emerald-800 flex-1`}>You&apos;ve seen all species above 1% here!</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={tw`mt-4`}>
      <Text style={tw`text-base font-semibold text-gray-900`}>Targets</Text>
      {data?.samples && data.samples > 0 && !hasNoLifeList && (
        <Text style={tw`text-sm text-gray-500 mt-1`}>Based on {data.samples.toLocaleString()} checklists</Text>
      )}

      {renderEmptyState()}

      {filteredTargets.length > 0 && !hasNoLifeList && (
        <>
          <View style={tw`mt-3 -mx-4`}>
            {displayedTargets.map((t, idx) => (
              <View key={t.speciesCode}>
                {idx > 0 && <View style={tw`h-px bg-gray-100`} />}

                <View style={tw`pl-5 pr-3 py-3`}>
                  <View style={tw`flex-row items-center`}>
                    <Text style={tw`w-7 text-sm font-semibold text-gray-400 tabular-nums`}>{idx + 1}</Text>

                    <View style={tw`flex-1`}>
                      <View style={tw`flex-row items-center justify-between`}>
                        <View style={tw`flex-row items-center flex-1 mr-3`}>
                          <Text style={tw`text-base text-gray-900 flex-shrink`} numberOfLines={1}>
                            {taxonomyMap.get(t.speciesCode) || "Unknown species"}
                          </Text>
                          <TouchableOpacity
                            ref={(ref) => {
                              if (ref) menuRefs.current.set(t.speciesCode, ref);
                            }}
                            onPress={() => showActionSheet(t.speciesCode)}
                            style={tw`px-1.5 py-2 ml-1 mt-px`}
                          >
                            <Ionicons name="ellipsis-horizontal" size={16} color={tw.color("gray-400")} />
                          </TouchableOpacity>
                        </View>

                        <Text style={tw`text-xs font-semibold text-gray-600 tabular-nums`}>
                          {t.percentage.toFixed(0)}%
                        </Text>
                      </View>

                      <View style={tw`mt-2 h-1 bg-gray-200 rounded-full overflow-hidden`}>
                        <View
                          style={[tw`h-full bg-emerald-600 rounded-full`, { width: `${Math.min(t.percentage, 100)}%` }]}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {hasMore && !showAll && (
            <TouchableOpacity onPress={() => setShowAll(true)} style={tw`mt-2 text-center py-1 w-full`}>
              <Text style={tw`text-sm font-medium text-blue-600 text-center`}>See all</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}
