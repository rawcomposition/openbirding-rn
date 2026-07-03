import avicommons from "@/avicommons";
import { useTaxonomyMap } from "@/hooks/useTaxonomy";
import { HotspotTargetsResult } from "@/lib/database";
import tw from "@/lib/tw";
import { parsePackVersion } from "@/lib/utils";
import { useMapStore } from "@/stores/mapStore";
import { TargetsDisplayMode, useSettingsStore } from "@/stores/settingsStore";

import { Ionicons } from "@expo/vector-icons";

import { Image } from "expo-image";
import { Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import BaseBottomSheet from "./BaseBottomSheet";
import { FloatingMenuSection } from "./FloatingMenu";
import { FloatingMenuTrigger } from "./FloatingMenuProvider";
import MonthlyBarChart from "./MonthlyBarChart";
import MonthStrip from "./MonthStrip";
import { TargetRowsSkeleton } from "./Skeleton";
import { IconSymbol } from "./ui/IconSymbol";

const INITIAL_LIMIT = 10;

type TargetsViewProps = {
  data: HotspotTargetsResult | null | undefined;
  isLoading: boolean;
  lat: number;
  lng: number;
  /** Changing this value resets the "view all" local UI state. */
  resetKey?: string;
  /** Hides the per-row "..." menus entirely (e.g. Nearby Species, where rows open a detail page). */
  hideRowMenus?: boolean;
  /** Controlled "About This Data" sheet, opened from the caller's menu (hotspot kebab / nav header button). */
  aboutDataOpen: boolean;
  onAboutDataOpenChange: (open: boolean) => void;
  /** Pinning support (hotspot targets only). Omit to hide pin UI. */
  pinnedTargets?: string[];
  onPinToggle?: (speciesCode: string, isPinned: boolean) => void | Promise<void>;
  /** Optional metadata caption rendered under the month strip (e.g. sample size / data scope). */
  caption?: React.ReactNode;
  /** Show every target at once, hiding the "View all"/"View less" toggle (e.g. Nearby Species). */
  disableViewAllLimit?: boolean;
  /** Minimum reporting frequency (%) a species must reach to be listed. Defaults to 1. */
  minPercentage?: number;
  /** Render each row's frequency as a mini bar chart or a progress bar. Defaults to progress bar. */
  displayMode?: TargetsDisplayMode;
  /** Makes rows tappable (e.g. to open the species detail page). */
  onSpeciesPress?: (speciesCode: string) => void;
  /** Filters rows by common name (case-insensitive substring match). */
  searchQuery?: string;
};

export default function TargetsView({
  data,
  isLoading,
  lat,
  lng,
  resetKey,
  hideRowMenus = false,
  aboutDataOpen,
  onAboutDataOpenChange,
  pinnedTargets = [],
  onPinToggle,
  caption,
  disableViewAllLimit = false,
  minPercentage = 1,
  displayMode = "percent",
  onSpeciesPress,
  searchQuery,
}: TargetsViewProps) {
  const [showAll, setShowAll] = useState(false);
  const selectedMonths = useSettingsStore((s) => s.targetMonths);
  const setSelectedMonths = useSettingsStore((s) => s.setTargetMonths);
  const { taxonomyMap } = useTaxonomyMap();
  const lifelist = useSettingsStore((s) => s.lifelist);
  const setLifelist = useSettingsStore((s) => s.setLifelist);
  const lifelistExclusions = useSettingsStore((s) => s.lifelistExclusions);
  const setLifelistExclusions = useSettingsStore((s) => s.setLifelistExclusions);
  const showAllSpecies = useSettingsStore((s) => s.showAllSpecies);
  const isBottomSheetExpanded = useMapStore((s) => s.isBottomSheetExpanded);
  const hasNoLifeList = !lifelist || lifelist.length === 0;
  const pinningEnabled = !!onPinToggle;
  const rowMenusVisible = !hideRowMenus && isBottomSheetExpanded;
  const router = useRouter();

  useEffect(() => {
    setShowAll(false);
  }, [resetKey]);

  const handleToggleMonth = (month: number) => {
    if (selectedMonths.length === 0) {
      setSelectedMonths([month]);
    } else {
      const next = selectedMonths.includes(month)
        ? selectedMonths.filter((m) => m !== month)
        : [...selectedMonths, month];
      setSelectedMonths(next);
    }
  };

  const handleSelectAllYear = () => {
    setSelectedMonths([]);
  };

  const query = searchQuery?.trim().toLowerCase() ?? "";

  const filteredTargets = (() => {
    if (!data) return [];
    const lifelistCodes = lifelist ? new Set(lifelist.map((e) => e.code)) : null;
    const exclusionCodes = lifelistExclusions ? new Set(lifelistExclusions) : null;
    const pinnedSet = new Set(pinnedTargets);
    const filtered = data.targets.filter((t) => {
      if (t.percentage < minPercentage) return false;
      if (query && !(taxonomyMap.get(t.speciesCode) ?? "").toLowerCase().includes(query)) return false;
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

  if (isLoading) {
    return (
      <View>
        {!hasNoLifeList && (
          <View style={tw`mt-3`}>
            <MonthStrip
              selectedMonths={selectedMonths}
              onToggleMonth={handleToggleMonth}
              onSelectAllYear={handleSelectAllYear}
            />
          </View>
        )}
        <TargetRowsSkeleton style={tw`mt-3`} />
      </View>
    );
  }

  const pinnedSet = new Set(pinnedTargets);
  const pinnedFilteredTargets = filteredTargets.filter((t) => pinnedSet.has(t.speciesCode));
  const unpinnedFilteredTargets = filteredTargets.filter((t) => !pinnedSet.has(t.speciesCode));
  const displayedTargets =
    showAll || disableViewAllLimit
      ? filteredTargets
      : [...pinnedFilteredTargets, ...unpinnedFilteredTargets.slice(0, INITIAL_LIMIT)];
  const hasMore = !disableViewAllLimit && unpinnedFilteredTargets.length > INITIAL_LIMIT;

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
        isManual: true,
      };
      setLifelist([...(lifelist || []), newEntry]);
      const speciesName = taxonomyMap.get(speciesCode) ?? speciesCode;
      Toast.show({ type: "success", text1: `Added ${speciesName} to life list` });
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
          : "No species data available for this area.";
      return (
        <View style={tw`mt-3 bg-gray-100 border border-gray-200/80 rounded-lg p-4 flex-row items-center`}>
          <Ionicons name="alert-circle" size={20} color={tw.color("gray-400")} style={tw`mr-3`} />
          <Text style={tw`text-sm text-gray-600 flex-1`}>{message}</Text>
        </View>
      );
    }

    if (query && filteredTargets.length === 0) {
      return (
        <View style={tw`mt-3 bg-gray-100 border border-gray-200/80 rounded-lg p-4 flex-row items-center`}>
          <Ionicons name="search" size={20} color={tw.color("gray-400")} style={tw`mr-3`} />
          <Text style={tw`text-sm text-gray-600 flex-1`}>No species match your search.</Text>
        </View>
      );
    }

    if (hasSeenAllTargets) {
      return (
        <View style={tw`mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex-row items-center`}>
          <Ionicons name="checkmark-circle" size={20} color={tw.color("emerald-600")} style={tw`mr-3`} />
          <Text style={tw`text-sm text-emerald-800 flex-1`}>
            You&apos;ve seen all species above {minPercentage < 1 ? minPercentage : minPercentage.toFixed(0)}% here!
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View>
      {!hasNoLifeList && !hasNoTargetData && (
        <View style={tw`mt-3`}>
          <MonthStrip selectedMonths={selectedMonths} onToggleMonth={handleToggleMonth} onSelectAllYear={handleSelectAllYear} />
        </View>
      )}

      {caption ? <View style={tw`mt-3`}>{caption}</View> : null}

      {renderEmptyState()}

      {filteredTargets.length > 0 && !hasNoLifeList && (
        <>
          <View style={tw`${caption ? "mt-1" : "mt-3"} -mx-4`}>
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

                <Pressable
                  onPress={onSpeciesPress ? () => onSpeciesPress(t.speciesCode) : undefined}
                  disabled={!onSpeciesPress}
                  style={({ pressed }) => [tw`px-5 py-3`, pressed && onSpeciesPress ? tw`bg-gray-100` : null]}
                >
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
                          {rowMenusVisible && (
                            <TargetRowMenuButton
                              sections={buildRowMenuSections(t.speciesCode, {
                                pinnedTargets,
                                lat,
                                lng,
                                pinningEnabled,
                                onPinToggle,
                                handleLifeListAction,
                                getLifeListMenuProps,
                              })}
                            />
                          )}
                        </View>

                        <Text style={tw`text-xs font-semibold text-gray-600 tabular-nums`}>
                          {t.percentage < 1 ? t.percentage.toFixed(1) : t.percentage.toFixed(0)}%
                        </Text>
                      </View>

                      {displayMode === "chart" ? (
                        <MonthlyBarChart monthly={t.monthly} variant="mini" selectedMonths={selectedMonths} style={tw`mt-1.5`} />
                      ) : (
                        <View style={tw`mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden`}>
                          <View
                            style={[tw`h-full bg-emerald-600 rounded-full`, { width: `${Math.min(t.percentage, 100)}%` }]}
                          />
                        </View>
                      )}
                    </View>
                    {onSpeciesPress && (
                      <Ionicons name="chevron-forward" size={16} color={tw.color("gray-300")} style={tw`ml-2`} />
                    )}
                  </View>
                </Pressable>
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
          isOpen={aboutDataOpen}
          onClose={() => onAboutDataOpenChange(false)}
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

// Shared "..." menu content used by both the hotspot kebab and the Nearby Species header button.
export function buildTargetsMenuSections(opts: {
  showAllSpecies: boolean;
  onToggleShowAll: () => void;
  displayMode: TargetsDisplayMode;
  onToggleDisplayMode: () => void;
  hasVersion: boolean;
  onOpenAbout: () => void;
}): FloatingMenuSection[] {
  return [
    {
      items: [
        {
          label: opts.showAllSpecies ? "Show Targets Only" : "Show All Species",
          icon: (
            <Ionicons
              name={opts.showAllSpecies ? "locate-outline" : "eye-outline"}
              size={18}
              color={tw.color("gray-700")}
            />
          ),
          onPress: opts.onToggleShowAll,
        },
        {
          label: opts.displayMode === "chart" ? "Show Progress Bars" : "Show Bar Charts",
          icon: (
            <Ionicons
              name={opts.displayMode === "chart" ? "options-outline" : "bar-chart-outline"}
              size={18}
              color={tw.color("gray-700")}
            />
          ),
          onPress: opts.onToggleDisplayMode,
        },
        ...(opts.hasVersion
          ? [
              {
                label: "About This Data",
                icon: <Ionicons name="information-circle-outline" size={18} color={tw.color("gray-700")} />,
                onPress: opts.onOpenAbout,
              },
            ]
          : []),
      ],
    },
  ];
}

type RowMenuCtx = {
  pinnedTargets: string[];
  lat: number;
  lng: number;
  pinningEnabled: boolean;
  onPinToggle?: (code: string, isPinned: boolean) => void | Promise<void>;
  handleLifeListAction: (code: string) => void;
  getLifeListMenuProps: (code: string) => { label: string; icon: "plus.circle" | "minus.circle"; isDestructive: boolean };
};

function buildRowMenuSections(code: string, ctx: RowMenuCtx): FloatingMenuSection[] {
  const isPinned = ctx.pinnedTargets.includes(code);
  const lifeProps = ctx.getLifeListMenuProps(code);
  const firstSectionItems = [
    {
      label: "View in Merlin",
      icon: <Ionicons name="open-outline" size={18} color={tw.color("gray-700")} />,
      onPress: () => {
        Linking.openURL(`merlinbirdid://species/${code}`).catch(() => {
          Alert.alert("Cannot Open Merlin", "Make sure the Merlin Bird ID app is installed.");
        });
      },
    },
    {
      label: "View eBird Map",
      icon: <Ionicons name="map-outline" size={18} color={tw.color("gray-700")} />,
      onPress: () => {
        const delta = 0.05;
        const url = `https://ebird.org/map/${code}?gp=true&yr=all&env.minX=${(ctx.lng - delta).toFixed(3)}&env.minY=${(ctx.lat - delta).toFixed(3)}&env.maxX=${(ctx.lng + delta).toFixed(3)}&env.maxY=${(ctx.lat + delta).toFixed(3)}`;
        Linking.openURL(url);
      },
    },
  ];

  if (ctx.pinningEnabled && ctx.onPinToggle) {
    const onPinToggle = ctx.onPinToggle;
    firstSectionItems.push({
      label: isPinned ? "Unpin Target" : "Pin Target",
      icon: <IconSymbol name={isPinned ? "pin.fill" : "pin"} size={18} color={tw.color("gray-700") ?? "#374151"} />,
      onPress: () => {
        void onPinToggle(code, isPinned);
      },
    });
  }

  return [
    {
      items: firstSectionItems,
    },
    {
      items: [
        {
          label: lifeProps.label,
          icon: (
            <Ionicons
              name={lifeProps.icon === "plus.circle" ? "add-circle-outline" : "remove-circle-outline"}
              size={18}
              color={lifeProps.isDestructive ? tw.color("red-600") : tw.color("gray-700")}
            />
          ),
          destructive: lifeProps.isDestructive,
          onPress: () => ctx.handleLifeListAction(code),
        },
      ],
    },
  ];
}

type TargetRowMenuButtonProps = {
  sections: FloatingMenuSection[];
};

function TargetRowMenuButton({ sections }: TargetRowMenuButtonProps) {
  return (
    <FloatingMenuTrigger sections={sections} touchableStyle={tw`ml-1`}>
      <View style={tw`px-1.5 py-2 mt-px`}>
        <Ionicons name="ellipsis-horizontal" size={16} color={tw.color("gray-400")} />
      </View>
    </FloatingMenuTrigger>
  );
}
