import avicommons from "@/avicommons";
import { useTaxonomyMap } from "@/hooks/useTaxonomy";
import { getTargetsForHotspot, getPinnedTargets, pinTarget, unpinTarget } from "@/lib/database";
import tw from "@/lib/tw";
import { parsePackVersion } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { Host, Button, Menu, Section, RNHostView, Toggle } from "@expo/ui/swift-ui";
import { contentShape, glassEffect, menuActionDismissBehavior, shapes } from "@expo/ui/swift-ui/modifiers";

import { Ionicons } from "@expo/vector-icons";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Href, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import BaseBottomSheet from "./BaseBottomSheet";
import { IconSymbol } from "./ui/IconSymbol";

const INITIAL_LIMIT = 10;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonthLabel(sorted: number[]): string {
  // Check if it's a single contiguous range
  const isContiguous = sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1);

  if (isContiguous && sorted.length >= 2) {
    return `${MONTH_LABELS[sorted[0]]}\u2013${MONTH_LABELS[sorted[sorted.length - 1]]}`;
  }

  // Comma separated, truncate if too long
  const full = sorted.map((i) => MONTH_LABELS[i]).join(", ");
  if (full.length <= 9) return full;

  let result = MONTH_LABELS[sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const next = `${result}, ${MONTH_LABELS[sorted[i]]}`;
    if (next.length > 9) return `${result}..`;
    result = next;
  }
  return result;
}

const MonthFilterMenu = memo(function MonthFilterMenu({
  onChange,
}: {
  onChange: (months: number[]) => void;
}) {
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const isAllYear = selectedMonths.length === 0;
  const sorted = [...selectedMonths].sort((a, b) => a - b);
  const label = isAllYear ? "All Year" : formatMonthLabel(sorted);

  const handleToggle = useCallback((month: number) => {
    setSelectedMonths((prev) => {
      const next = prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month];
      onChange(next);
      return next;
    });
  }, [onChange]);

  const handleAllYear = useCallback(() => {
    setSelectedMonths([]);
    onChange([]);
  }, [onChange]);

  return (
    <Host style={tw`self-start`}>
      <Menu
        label={
          <RNHostView matchContents>
            <View style={[tw`flex-row items-center justify-between bg-gray-100 rounded-full px-3 py-1`, { minWidth: 86 }]}>
              <Text style={tw`text-xs font-semibold text-gray-700`} numberOfLines={1}>{label}</Text>
              <Ionicons name="chevron-down" size={12} color={tw.color("gray-500")} style={tw`ml-1`} />
            </View>
          </RNHostView>
        }
      >
        <Section modifiers={[menuActionDismissBehavior("disabled")]}>
          <Button
            label="All Year"
            systemImage={isAllYear ? "checkmark" : undefined}
            onPress={handleAllYear}
          />
          {MONTH_NAMES.map((name, i) => (
            <Button
              key={i}
              label={name}
              systemImage={selectedMonths.includes(i) ? "checkmark" : undefined}
              onPress={() => handleToggle(i)}
            />
          ))}
        </Section>
      </Menu>
    </Host>
  );
}, () => true);

type HotspotTargetsProps = {
  hotspotId: string;
  lat: number;
  lng: number;
};

export default function HotspotTargets({ hotspotId, lat, lng }: HotspotTargetsProps) {
  const [showAll, setShowAll] = useState(false);
  const [showDataInfo, setShowDataInfo] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const { taxonomyMap } = useTaxonomyMap();
  const lifelist = useSettingsStore((s) => s.lifelist);
  const setLifelist = useSettingsStore((s) => s.setLifelist);
  const lifelistExclusions = useSettingsStore((s) => s.lifelistExclusions);
  const setLifelistExclusions = useSettingsStore((s) => s.setLifelistExclusions);
  const showAllSpecies = useSettingsStore((s) => s.showAllSpecies);
  const setShowAllSpecies = useSettingsStore((s) => s.setShowAllSpecies);
  const hasNoLifeList = !lifelist || lifelist.length === 0;
  const router = useRouter();

  useEffect(() => {
    setShowAll(false);
    setShowDataInfo(false);
  }, [hotspotId]);

  const handleMonthsChange = useCallback((months: number[]) => {
    setSelectedMonths(months);
  }, []);

  const queryClient = useQueryClient();

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

  const filteredTargets = (() => {
    if (!data) return [];
    const lifelistCodes = lifelist ? new Set(lifelist.map((e) => e.code)) : null;
    const exclusionCodes = lifelistExclusions ? new Set(lifelistExclusions) : null;
    const pinnedSet = new Set(pinnedTargets);
    const filtered = data.targets.filter((t) => {
      if (t.percentage < 1) return false;
      if (showAllSpecies) return true;
      if (exclusionCodes?.has(t.speciesCode)) return true;
      return !lifelistCodes || !lifelistCodes.has(t.speciesCode);
    });
    return filtered.sort((a, b) => {
      const aPinned = pinnedSet.has(a.speciesCode);
      const bPinned = pinnedSet.has(b.speciesCode);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  })();

  if (isLoading) return null;

  const pinnedSet = new Set(pinnedTargets);
  const pinnedFilteredTargets = filteredTargets.filter((t) => pinnedSet.has(t.speciesCode));
  const unpinnedFilteredTargets = filteredTargets.filter((t) => !pinnedSet.has(t.speciesCode));
  const displayedTargets = showAll
    ? filteredTargets
    : [...pinnedFilteredTargets, ...unpinnedFilteredTargets.slice(0, INITIAL_LIMIT)];
  const hasMore = unpinnedFilteredTargets.length > INITIAL_LIMIT;

  const hasNoTargetData = !data;
  const hasNoSpeciesData = hasNoTargetData || data.targets.length === 0;
  const hasSeenAllTargets = lifelist && filteredTargets.length === 0 && data?.targets && data.targets.length > 0;

  const handleLifeListAction = (speciesCode: string) => {
    const isExcluded = lifelistExclusions?.includes(speciesCode) ?? false;
    const isOnLifeList = lifelist?.some((e) => e.code === speciesCode) ?? false;

    if (isExcluded) {
      const current = lifelistExclusions || [];
      setLifelistExclusions(current.filter((c) => c !== speciesCode));
    } else if (isOnLifeList) {
      setLifelist((lifelist || []).filter((e) => e.code !== speciesCode));
    } else {
      const newEntry = {
        code: speciesCode,
        date: new Date().toISOString().split("T")[0],
        location: "N/A",
        checklistId: null,
      };
      setLifelist([...(lifelist || []), newEntry]);
    }
  };

  const handlePinAction = async (speciesCode: string, isPinned: boolean) => {
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

  const getLifeListMenuProps = (speciesCode: string) => {
    const isExcluded = lifelistExclusions?.includes(speciesCode) ?? false;
    const isOnLifeList = lifelist?.some((e) => e.code === speciesCode) ?? false;
    if (isExcluded) return { label: "Remove Exclusion", icon: "minus.circle" as const, isDestructive: true };
    if (isOnLifeList) return { label: "Remove from Life List", icon: "minus.circle" as const, isDestructive: true };
    return { label: "Add to Life List", icon: "plus.circle" as const, isDestructive: false };
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
      const message =
        selectedMonths.length > 0
          ? "No checklist data for the selected months."
          : "No species data available for this hotspot.";
      return (
        <View style={tw`mt-3 bg-gray-100 border border-gray-200/80 rounded-lg p-4 flex-row items-center`}>
          <Ionicons name="alert-circle" size={20} color={tw.color("gray-400")} style={tw`mr-3`} />
          <Text style={tw`text-sm text-gray-600 flex-1`}>{message}</Text>
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
          <View style={tw`flex-row items-center gap-2`}>
            <Text style={tw`text-base font-semibold text-gray-900`}>Targets</Text>
            {!hasNoLifeList && !hasNoTargetData && (
              <MonthFilterMenu onChange={handleMonthsChange} />
            )}
          </View>
          {data?.samples && data.samples > 0 && !hasNoLifeList && (
            <Text style={tw`text-sm text-gray-500 mt-1`}>Based on {data.samples.toLocaleString()} checklists</Text>
          )}
        </View>
        {data?.version &&
          parsePackVersion(data.version) && (
            <Host style={tw`w-8 h-8`}>
              <Menu
                label={
                  <RNHostView matchContents>
                    <View style={tw`w-8 h-8 items-center justify-center`}>
                      <Ionicons name="ellipsis-horizontal" size={16} color={tw.color("gray-700")} />
                    </View>
                  </RNHostView>
                }
                modifiers={[
                  contentShape(shapes.circle()),
                  glassEffect({ glass: { variant: "regular", interactive: true }, shape: "circle" }),
                ]}
              >
                <Section>
                  <Button
                    label={showAllSpecies ? "Show Targets Only" : "Show All Species"}
                    systemImage={showAllSpecies ? "target" : "bird"}
                    onPress={() => setShowAllSpecies(!showAllSpecies)}
                  />
                  <Button
                    label="About This Data"
                    systemImage="info.circle"
                    onPress={() => setShowDataInfo(true)}
                  />
                </Section>
              </Menu>
            </Host>
          )}
      </View>

      {renderEmptyState()}

      {filteredTargets.length > 0 && !hasNoLifeList && (
        <>
          <View style={tw`mt-3 -mx-4`}>
            {displayedTargets.map((t, idx) => {
              const isPinned = pinnedTargets.includes(t.speciesCode);
              const prevIsPinned = idx > 0 && pinnedTargets.includes(displayedTargets[idx - 1].speciesCode);
              const showPinnedHeader = isPinned && idx === 0;
              const showOtherHeader = pinnedFilteredTargets.length > 0 && !isPinned && (idx === 0 || prevIsPinned);
              return (
              <View key={t.speciesCode}>
                {showPinnedHeader && (
                  <Text style={tw`px-5 pt-2 pb-0 text-xs font-medium text-gray-500 uppercase tracking-wide`}>Pinned</Text>
                )}
                {showOtherHeader && (
                  <Text style={tw`px-5 pt-3 pb-0 text-xs font-medium text-gray-500 uppercase tracking-wide`}>Other Targets</Text>
                )}
                {idx > 0 && !showOtherHeader && <View style={tw`h-px bg-gray-100`} />}

                <View style={tw`px-5 py-3`}>
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`w-20 h-15 mr-3`}>
                      {avicommons[t.speciesCode as keyof typeof avicommons] ? (
                        <Image
                          source={{
                            uri: `https://static.avicommons.org/${t.speciesCode}-${
                              avicommons[t.speciesCode as keyof typeof avicommons][0]
                            }-160.webp`,
                          }}
                          style={tw`w-20 h-15 rounded bg-gray-200`}
                        />
                      ) : (
                        <View style={tw`w-20 h-15 rounded bg-gray-200`} />
                      )}
                      {isPinned && (
                        <View style={tw`absolute top-0 left-0 bg-sky-600 rounded-tl rounded-br-lg px-1 py-0.5`}>
                          <IconSymbol name="pin.fill" size={10} color="white" />
                        </View>
                      )}
                    </View>

                    <View style={tw`flex-1`}>
                      <View style={tw`flex-row items-center justify-between`}>
                        <View style={tw`flex-row items-center flex-1 mr-3`}>
                          <Text style={tw`text-base text-gray-900 flex-shrink`} numberOfLines={1}>
                            {taxonomyMap.get(t.speciesCode) || "Unknown species"}
                          </Text>
                          <Host style={tw`ml-1`}>
                            <Menu
                              label={
                                <RNHostView matchContents>
                                  <View style={tw`px-1.5 py-2 mt-px`}>
                                    <Ionicons name="ellipsis-horizontal" size={16} color={tw.color("gray-400")} />
                                  </View>
                                </RNHostView>
                              }
                            >
                              <Section>
                                <Button
                                  label="View in Merlin"
                                  systemImage="arrow.up.forward.app"
                                  onPress={() => {
                                    Linking.openURL(`merlinbirdid://species/${t.speciesCode}`).catch(() => {
                                      Alert.alert("Cannot Open Merlin", "Make sure the Merlin Bird ID app is installed.");
                                    });
                                  }}
                                />
                                <Button
                                  label="View eBird Map"
                                  systemImage="map"
                                  onPress={() => {
                                    const delta = 0.05;
                                    const url = `https://ebird.org/map/${t.speciesCode}?gp=true&yr=all&env.minX=${(lng - delta).toFixed(3)}&env.minY=${(lat - delta).toFixed(3)}&env.maxX=${(lng + delta).toFixed(3)}&env.maxY=${(lat + delta).toFixed(3)}`;
                                    Linking.openURL(url);
                                  }}
                                />
                                <Button
                                  label={isPinned ? "Unpin Target" : "Pin Target"}
                                  systemImage={isPinned ? "pin.slash" : "pin"}
                                  onPress={() => {
                                    void handlePinAction(t.speciesCode, isPinned);
                                  }}
                                />
                              </Section>
                              <Section>
                                {(() => {
                                  const { label, icon, isDestructive } = getLifeListMenuProps(t.speciesCode);
                                  return (
                                    <Button
                                      label={label}
                                      systemImage={icon}
                                      role={isDestructive ? "destructive" : undefined}
                                      onPress={() => handleLifeListAction(t.speciesCode)}
                                    />
                                  );
                                })()}
                              </Section>
                            </Menu>
                          </Host>
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
              );
            })}
          </View>

          {hasMore && (
            <TouchableOpacity onPress={() => setShowAll(!showAll)} style={tw`mt-2 text-center py-1 w-full`}>
              <Text style={tw`text-sm font-medium text-blue-600 text-center`}>
                {showAll ? "View less" : "View all"}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {data?.version && parsePackVersion(data.version) && (
        <BaseBottomSheet
          isOpen={showDataInfo}
          onClose={() => setShowDataInfo(false)}
          title="About This Data"
          dimmed
          detents={[0.45, 0.9]}
          initialIndex={0}
          scrollable
        >
          <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
            <View style={tw`px-6 pt-2 pb-6`}>
              <Text style={tw`text-sm text-gray-700 mb-3`}>
                Targets data is updated monthly from the eBird Basic Dataset.
              </Text>
              <Text style={tw`text-sm text-gray-600 italic`}>
                eBird Basic Dataset. Version: EBD_rel{parsePackVersion(data.version)?.replace(" ", "-")}. Cornell Lab of
                Ornithology, Ithaca, New York. {parsePackVersion(data.version)}.
              </Text>
              {(() => {
                const photoCredits = displayedTargets
                  .map((t) => {
                    const author = avicommons[t.speciesCode as keyof typeof avicommons]?.[1];
                    if (!author) return null;
                    return { name: taxonomyMap.get(t.speciesCode) || t.speciesCode, author };
                  })
                  .filter((c): c is { name: string; author: string } => !!c);
                if (photoCredits.length === 0) return null;
                return (
                  <View style={tw`mt-4 pt-4 border-t border-gray-200`}>
                    <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Photo Credits</Text>
                    {photoCredits.map((c, i) => (
                      <Text key={i} style={tw`text-sm text-gray-600 mb-1`}>
                        {c.name} — {c.author}
                      </Text>
                    ))}
                  </View>
                );
              })()}
            </View>
          </ScrollView>
        </BaseBottomSheet>
      )}
    </View>
  );
}
