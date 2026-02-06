import avicommons from "@/avicommons";
import { useTaxonomyMap } from "@/hooks/useTaxonomy";
import { getTargetsForHotspot } from "@/lib/database";
import tw from "@/lib/tw";
import { parsePackVersion } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Href, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, findNodeHandle, Image, Linking, Platform, Pressable, Text, TouchableOpacity, View } from "react-native";
import InfoModal from "./InfoModal";

const INITIAL_LIMIT = 10;

type HotspotTargetsProps = {
  hotspotId: string;
  lat: number;
  lng: number;
};

export default function HotspotTargets({ hotspotId, lat, lng }: HotspotTargetsProps) {
  const [showAll, setShowAll] = useState(false);
  const [showDataInfo, setShowDataInfo] = useState(false);
  const { taxonomyMap } = useTaxonomyMap();
  const lifelist = useSettingsStore((s) => s.lifelist);
  const setLifelist = useSettingsStore((s) => s.setLifelist);
  const lifelistExclusions = useSettingsStore((s) => s.lifelistExclusions);
  const setLifelistExclusions = useSettingsStore((s) => s.setLifelistExclusions);
  const hasNoLifeList = !lifelist || lifelist.length === 0;
  const router = useRouter();
  const menuRefs = useRef<Map<string, React.ComponentRef<typeof TouchableOpacity>>>(new Map());
  const headerMenuRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
  const { showActionSheetWithOptions } = useActionSheet();
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

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
    const exclusionCodes = lifelistExclusions ? new Set(lifelistExclusions) : null;
    return data.targets.filter((t) => {
      if (t.percentage < 1) return false;
      // If species is in exclusions, show it as a target (override life list)
      if (exclusionCodes?.has(t.speciesCode)) return true;
      // Otherwise, filter out species on the life list
      return !lifelistCodes || !lifelistCodes.has(t.speciesCode);
    });
  }, [data, lifelist, lifelistExclusions]);

  if (isLoading) return null;

  const displayedTargets = showAll ? filteredTargets : filteredTargets.slice(0, INITIAL_LIMIT);
  const hasMore = filteredTargets.length > INITIAL_LIMIT;

  const hasNoSpeciesData = !data || data.targets.length === 0;
  const hasSeenAllTargets = lifelist && filteredTargets.length === 0 && data?.targets && data.targets.length > 0;

  const handleActionSelection = (buttonIndex: number | undefined, speciesCode: string, isExcluded: boolean) => {
    if (buttonIndex === 0) {
      Linking.openURL(`merlinbirdid://species/${speciesCode}`).catch(() => {
        Alert.alert("Cannot Open Merlin", "Make sure the Merlin Bird ID app is installed.");
      });
    } else if (buttonIndex === 1) {
      const delta = 0.05;
      const url = `https://ebird.org/map/${speciesCode}?gp=true&yr=all&env.minX=${(lng - delta).toFixed(3)}&env.minY=${(
        lat - delta
      ).toFixed(3)}&env.maxX=${(lng + delta).toFixed(3)}&env.maxY=${(lat + delta).toFixed(3)}`;
      console.log(url);
      Linking.openURL(url);
    } else if (buttonIndex === 2) {
      if (isExcluded) {
        // Remove from exclusions
        const current = lifelistExclusions || [];
        setLifelistExclusions(current.filter((c) => c !== speciesCode));
      } else {
        // Add to life list
        const newEntry = {
          code: speciesCode,
          date: new Date().toISOString().split("T")[0],
          location: "N/A",
          checklistId: null,
        };
        setLifelist([...(lifelist || []), newEntry]);
      }
    }
  };

  const showActionSheet = (speciesCode: string) => {
    const ref = menuRefs.current.get(speciesCode);
    const anchor = ref ? findNodeHandle(ref) : undefined;
    const isExcluded = lifelistExclusions?.includes(speciesCode) ?? false;
    const options = ["View in Merlin", "View eBird Map", isExcluded ? "Remove Exclusion" : "Add to Life List"];

    showActionSheetWithOptions(
      {
        options,
        anchor: anchor ?? undefined,
      },
      (buttonIndex) => handleActionSelection(buttonIndex, speciesCode, isExcluded)
    );
  };

  const showHeaderMenu = () => {
    const anchor = headerMenuRef.current ? findNodeHandle(headerMenuRef.current) : undefined;
    showActionSheetWithOptions(
      {
        options: ["About This Data", "Cancel"],
        cancelButtonIndex: 1,
        anchor: anchor ?? undefined,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          setShowDataInfo(true);
        }
      }
    );
  };

  const renderEmptyState = () => {
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

    if (hasNoSpeciesData) {
      return (
        <View style={tw`mt-3 bg-gray-100 border border-gray-200/80 rounded-lg p-4 flex-row items-center`}>
          <Ionicons name="alert-circle" size={20} color={tw.color("gray-400")} style={tw`mr-3`} />
          <Text style={tw`text-sm text-gray-600 flex-1`}>No species data available for this hotspot.</Text>
        </View>
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
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-base font-semibold text-gray-900`}>Targets</Text>
          {data?.samples && data.samples > 0 && !hasNoLifeList && (
            <Text style={tw`text-sm text-gray-500 mt-1`}>Based on {data.samples.toLocaleString()} checklists</Text>
          )}
        </View>
        {data?.version &&
          parsePackVersion(data.version) &&
          (useGlass ? (
            <TouchableOpacity
              ref={headerMenuRef}
              onPress={showHeaderMenu}
              activeOpacity={0.8}
              style={tw`w-8 h-8 rounded-full items-center justify-center`}
            >
              <GlassView
                style={tw`w-8 h-8 rounded-full items-center justify-center`}
                glassEffectStyle="regular"
                isInteractive
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={tw.color("gray-700")} />
              </GlassView>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              ref={headerMenuRef}
              onPress={showHeaderMenu}
              activeOpacity={0.8}
              style={tw`w-8 h-8 rounded-full items-center justify-center bg-white shadow-lg`}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={tw.color("gray-700")} />
            </TouchableOpacity>
          ))}
      </View>

      {renderEmptyState()}

      {filteredTargets.length > 0 && !hasNoLifeList && (
        <>
          <View style={tw`mt-3 -mx-4`}>
            {displayedTargets.map((t, idx) => (
              <View key={t.speciesCode}>
                {idx > 0 && <View style={tw`h-px bg-gray-100`} />}

                <View style={tw`px-5 py-3`}>
                  <View style={tw`flex-row items-center`}>
                    {avicommons[t.speciesCode as keyof typeof avicommons] ? (
                      <Image
                        source={{
                          uri: `https://static.avicommons.org/${t.speciesCode}-${
                            avicommons[t.speciesCode as keyof typeof avicommons][0]
                          }-240.jpg`,
                        }}
                        style={tw`w-20 h-15 rounded mr-3 bg-gray-200`}
                      />
                    ) : (
                      <View style={tw`w-20 h-15 rounded mr-3 bg-gray-200`} />
                    )}

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

                      <View style={tw`mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden`}>
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
              <Text style={tw`text-sm font-medium text-blue-600 text-center`}>View all</Text>
            </TouchableOpacity>
          )}

          {data?.version && parsePackVersion(data.version) && (
            <InfoModal
              visible={showDataInfo}
              onClose={() => setShowDataInfo(false)}
              title="About This Data"
              content={
                <View>
                  <Text style={tw`text-sm text-gray-700 mb-3`}>
                    Targets data is updated monthly from the eBird Basic Dataset.
                  </Text>
                  <Text style={tw`text-sm text-gray-600 italic`}>
                    eBird Basic Dataset. Version: EBD_rel{parsePackVersion(data.version)?.replace(" ", "-")}. Cornell
                    Lab of Ornithology, Ithaca, New York. {parsePackVersion(data.version)}.
                  </Text>
                  {(() => {
                    const photoCredits = displayedTargets
                      .map((t) => avicommons[t.speciesCode as keyof typeof avicommons]?.[1])
                      .filter((author): author is string => !!author);
                    const uniqueAuthors = [...new Set(photoCredits)];
                    if (uniqueAuthors.length === 0) return null;
                    return (
                      <View style={tw`mt-4 pt-4 border-t border-gray-200`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                          Photo Credits (in order of appearance)
                        </Text>
                        <Text style={tw`text-sm text-gray-600`}>{uniqueAuthors.join(", ")}</Text>
                      </View>
                    );
                  })()}
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
}
