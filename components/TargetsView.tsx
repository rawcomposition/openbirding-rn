import avicommons from "@/avicommons";
import { useInstalledPacks } from "@/hooks/useInstalledPacks";
import { usePinnedTargets } from "@/hooks/usePinnedTargets";
import { useTaxonomyMap } from "@/hooks/useTaxonomy";
import { HotspotTargetsResult } from "@/lib/database";
import { AggregatedHotspotTarget } from "@/lib/hotspotTargets";
import { getLifeListMenuProps, handleLifeListAction, LifeListMenuProps } from "@/lib/lifelist";
import tw from "@/lib/tw";
import { parsePackVersion } from "@/lib/utils";
import { TargetsDisplayMode, useSettingsStore } from "@/stores/settingsStore";

import { Ionicons } from "@expo/vector-icons";

import { Image } from "expo-image";
import { Href, useRouter } from "expo-router";
import { memo, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import BaseBottomSheet from "./BaseBottomSheet";
import { FloatingMenuSection } from "./FloatingMenu";
import { useFloatingMenu } from "./FloatingMenuProvider";
import MonthlyBarChart from "./MonthlyBarChart";
import MonthStrip from "./MonthStrip";
import PacksNotice from "./PacksNotice";
import SpinnerPill from "./SpinnerPill";
import { IconSymbol } from "./ui/IconSymbol";

const INITIAL_LIMIT = 10;

type TargetsViewProps = {
  data: HotspotTargetsResult | null | undefined;
  isLoading: boolean;
  lat: number;
  lng: number;
  /** Changing this value resets the "view all" local UI state. */
  resetKey?: string;
  /**
   * Hotspot these targets belong to. Enables pinning (own section, long-press action) and is
   * handed to the species page so it can offer Pin/Unpin too.
   */
  hotspotId?: string;
  /** Controlled "About This Data" sheet, opened from the caller's menu (hotspot kebab / nav header button). */
  aboutDataOpen: boolean;
  onAboutDataOpenChange: (open: boolean) => void;
  /** Optional metadata caption rendered under the month strip (e.g. sample size / data scope). */
  caption?: React.ReactNode;
  /** How many rows to show before the "View all" toggle. */
  initialLimit?: number;
  /** Fresh data is loading behind currently-visible (stale) results; dims the list (the caller renders its own loader). */
  isUpdating?: boolean;
  /** Minimum reporting frequency (%) a species must reach to be listed. Defaults to 1. */
  minPercentage?: number;
  /** Render each row's frequency as a mini bar chart or a progress bar. Defaults to progress bar. */
  displayMode?: TargetsDisplayMode;
  /** Filters rows by common name (case-insensitive substring match). */
  searchQuery?: string;
  /**
   * Months the rendered data corresponds to. Pass a deferred value so a month toggle
   * repaints the strip instantly while the rows update in a lower-priority render.
   * Defaults to the live month selection.
   */
  chartMonths?: number[];
  /**
   * Rendered instead of the generic "no species data" message when the empty result has a
   * more specific cause the caller knows about (e.g. installed packs don't cover the area).
   */
  emptyNotice?: React.ReactNode;
  /** Skip the built-in loading spinner (the caller renders its own, e.g. a screen-centered one). */
  hideLoadingIndicator?: boolean;
};

export default function TargetsView({
  data,
  isLoading,
  lat,
  lng,
  resetKey,
  hotspotId,
  aboutDataOpen,
  onAboutDataOpenChange,
  caption,
  initialLimit = INITIAL_LIMIT,
  isUpdating = false,
  minPercentage = 1,
  displayMode = "percent",
  searchQuery,
  chartMonths,
  emptyNotice,
  hideLoadingIndicator = false,
}: TargetsViewProps) {
  const [showAll, setShowAll] = useState(false);
  const selectedMonths = useSettingsStore((s) => s.targetMonths);
  const setSelectedMonths = useSettingsStore((s) => s.setTargetMonths);
  const { taxonomyMap } = useTaxonomyMap();
  const lifelist = useSettingsStore((s) => s.lifelist);
  const lifelistExclusions = useSettingsStore((s) => s.lifelistExclusions);
  const lifelistPromptDismissed = useSettingsStore((s) => s.lifelistPromptDismissed);
  const setLifelistPromptDismissed = useSettingsStore((s) => s.setLifelistPromptDismissed);
  const showAllSpecies = useSettingsStore((s) => s.showAllSpecies);
  const { data: installedPacks, isLoading: isLoadingInstalledPacks } = useInstalledPacks();
  const hasNoLifeList = !lifelist || lifelist.length === 0;
  const router = useRouter();
  const { openMenu } = useFloatingMenu();
  const { pinnedTargets, togglePin } = usePinnedTargets(hotspotId);

  useEffect(() => {
    setShowAll(false);
  }, [resetKey]);

  // Stable reference so the memoized rows aren't invalidated by unrelated re-renders.
  const handleSpeciesPress = useCallback(
    (speciesCode: string) => {
      router.push({
        pathname: "/species/[code]",
        params: { code: speciesCode, lat: String(lat), lng: String(lng), ...(hotspotId ? { hotspotId } : {}) },
      });
    },
    [router, lat, lng, hotspotId]
  );

  // Long-pressing a row opens the actions that used to live in the per-row "..." menu.
  const handleSpeciesLongPress = useCallback(
    (speciesCode: string, anchorRef: RefObject<View>) => {
      const sections = buildRowMenuSections(speciesCode, {
        name: taxonomyMap.get(speciesCode) ?? speciesCode,
        lat,
        lng,
        isPinned: pinnedTargets.includes(speciesCode),
        onTogglePin: hotspotId ? togglePin : undefined,
        lifeListProps: getLifeListMenuProps(speciesCode, lifelist, lifelistExclusions),
      });
      openMenu(sections, anchorRef);
    },
    [openMenu, taxonomyMap, lat, lng, pinnedTargets, hotspotId, togglePin, lifelist, lifelistExclusions]
  );

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
  const effectiveChartMonths = chartMonths ?? selectedMonths;

  // Stable across unrelated re-renders so the memoized rows can skip work — this is what
  // keeps the month strip responsive while the list catches up in a deferred render.
  const filteredTargets = useMemo(() => {
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
  }, [data, query, lifelist, lifelistExclusions, pinnedTargets, showAllSpecies, minPercentage, taxonomyMap]);

  // Even without a life list the list still renders (as all species); this banner nudges
  // toward importing one and stays dismissed once closed. Installing packs is the more
  // fundamental setup step, so the banner waits until at least one pack is installed.
  const importBanner =
    hasNoLifeList && !lifelistPromptDismissed && !isLoadingInstalledPacks && installedPacks.size > 0 ? (
      <View style={tw`mt-3 bg-sky-50 border border-sky-200/80 rounded-lg flex-row items-start`}>
        <Pressable
          onPress={() => router.push("/settings-import-life-list" as Href)}
          style={tw`flex-1 flex-row items-center p-4 pr-1`}
        >
          <View style={tw`flex-1`}>
            <Text style={tw`text-base font-semibold text-sky-900 mb-1`}>Import Life List</Text>
            <Text style={tw`text-sm text-sky-700 mt-0.5`}>See personalized targets based on species you need.</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setLifelistPromptDismissed(true)} hitSlop={8} style={tw`p-3`}>
          <Ionicons name="close" size={18} color={tw.color("sky-400")} />
        </Pressable>
      </View>
    ) : null;

  if (isLoading) {
    return (
      <View>
        {importBanner}
        <View style={tw`mt-3`}>
          <MonthStrip
            selectedMonths={selectedMonths}
            onToggleMonth={handleToggleMonth}
            onSelectAllYear={handleSelectAllYear}
          />
        </View>
        {!hideLoadingIndicator && <SpinnerPill style={tw`mt-10`} />}
      </View>
    );
  }

  const pinnedSet = new Set(pinnedTargets);
  const pinnedFilteredTargets = filteredTargets.filter((t) => pinnedSet.has(t.speciesCode));
  const unpinnedFilteredTargets = filteredTargets.filter((t) => !pinnedSet.has(t.speciesCode));
  const displayedTargets = showAll
    ? filteredTargets
    : [...pinnedFilteredTargets, ...unpinnedFilteredTargets.slice(0, initialLimit)];
  const hasMore = unpinnedFilteredTargets.length > initialLimit;

  const hasNoTargetData = !data;
  const hasNoSpeciesData = hasNoTargetData || data.targets.length === 0;
  const hasSeenAllTargets = lifelist && filteredTargets.length === 0 && data?.targets && data.targets.length > 0;

  const renderEmptyState = () => {
    if (hasNoSpeciesData) {
      if (!isLoadingInstalledPacks && installedPacks.size === 0) {
        return (
          <View style={tw`mt-3`}>
            <PacksNotice variant="inline" />
          </View>
        );
      }

      if (emptyNotice) {
        return <View style={tw`mt-3`}>{emptyNotice}</View>;
      }

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

  // Keep the strip visible when a month selection is what emptied the list, so the user
  // can always toggle back; hide it when there's genuinely no data for this area.
  const showMonthStrip = !hasNoTargetData && (data.targets.length > 0 || selectedMonths.length > 0);

  return (
    <View>
      {importBanner}

      {showMonthStrip && (
        <View style={tw`mt-3`}>
          <MonthStrip selectedMonths={selectedMonths} onToggleMonth={handleToggleMonth} onSelectAllYear={handleSelectAllYear} />
        </View>
      )}

      <View style={isUpdating ? tw`opacity-40` : undefined} pointerEvents={isUpdating ? "none" : "auto"}>
      {caption ? <View style={tw`mt-3`}>{caption}</View> : null}

      {renderEmptyState()}

      {filteredTargets.length > 0 && (
        <>
          <View style={tw`${caption ? "mt-1" : "mt-3"} -mx-4`}>
            {displayedTargets.map((t, idx) => {
              const isPinned = pinnedTargets.includes(t.speciesCode);
              const prevIsPinned = idx > 0 && pinnedTargets.includes(displayedTargets[idx - 1].speciesCode);
              const showOtherHeader = pinnedFilteredTargets.length > 0 && !isPinned && (idx === 0 || prevIsPinned);
              return (
                <TargetRow
                  key={t.speciesCode}
                  target={t}
                  name={taxonomyMap.get(t.speciesCode) || "Unknown species"}
                  isPinned={isPinned}
                  showPinnedHeader={isPinned && idx === 0}
                  showOtherHeader={showOtherHeader}
                  showDivider={idx > 0 && !showOtherHeader}
                  displayMode={displayMode}
                  chartMonths={effectiveChartMonths}
                  onSpeciesPress={handleSpeciesPress}
                  onSpeciesLongPress={handleSpeciesLongPress}
                />
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
      </View>

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

type TargetRowProps = {
  target: AggregatedHotspotTarget;
  name: string;
  isPinned: boolean;
  showPinnedHeader: boolean;
  showOtherHeader: boolean;
  showDivider: boolean;
  displayMode: TargetsDisplayMode;
  chartMonths: number[];
  onSpeciesPress: (speciesCode: string) => void;
  onSpeciesLongPress: (speciesCode: string, anchorRef: RefObject<View>) => void;
};

// Memoized so re-renders that don't change the data (e.g. the urgent render of a month
// toggle, where only the strip and spinner change) skip all 100 rows.
const TargetRow = memo(function TargetRow({
  target,
  name,
  isPinned,
  showPinnedHeader,
  showOtherHeader,
  showDivider,
  displayMode,
  chartMonths,
  onSpeciesPress,
  onSpeciesLongPress,
}: TargetRowProps) {
  const anchorRef = useRef<View>(null!);

  return (
    <View>
      {showPinnedHeader && (
        <Text style={tw`px-5 pt-2 pb-0 text-xs font-medium text-gray-500 uppercase tracking-wide`}>Pinned</Text>
      )}
      {showOtherHeader && (
        <Text style={tw`px-5 pt-3 pb-0 text-xs font-medium text-gray-500 uppercase tracking-wide`}>Other Targets</Text>
      )}
      {showDivider && <View style={tw`h-px bg-gray-100`} />}

      <Pressable
        onPress={() => onSpeciesPress(target.speciesCode)}
        onLongPress={() => onSpeciesLongPress(target.speciesCode, anchorRef)}
        style={({ pressed }) => [tw`px-5 py-3`, pressed ? tw`bg-gray-100` : null]}
      >
        <View ref={anchorRef} style={tw`flex-row items-center`}>
          <View style={tw`w-20 h-15 mr-3`}>
            {avicommons[target.speciesCode as keyof typeof avicommons] ? (
              <Image
                source={{
                  uri: `https://static.avicommons.org/${target.speciesCode}-${
                    avicommons[target.speciesCode as keyof typeof avicommons][0]
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
                  {name}
                </Text>
              </View>

              <Text style={tw`text-xs font-semibold text-gray-600 tabular-nums`}>
                {target.percentage < 1 ? target.percentage.toFixed(1) : target.percentage.toFixed(0)}%
              </Text>
            </View>

            {displayMode === "chart" ? (
              <MonthlyBarChart monthly={target.monthly} variant="mini" selectedMonths={chartMonths} style={tw`mt-1.5`} />
            ) : (
              <View style={tw`mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden`}>
                <View
                  style={[tw`h-full bg-emerald-600 rounded-full`, { width: `${Math.min(target.percentage, 100)}%` }]}
                />
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={tw.color("gray-300")} style={tw`ml-2`} />
        </View>
      </Pressable>
    </View>
  );
});

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
  name: string;
  lat: number;
  lng: number;
  isPinned: boolean;
  /** Omitted when there's no hotspot to pin against (e.g. Nearby Species). */
  onTogglePin?: (code: string, isPinned: boolean) => void | Promise<void>;
  lifeListProps: LifeListMenuProps;
};

// The row long-press menu: the same actions the per-row "..." kebab used to offer.
function buildRowMenuSections(code: string, ctx: RowMenuCtx): FloatingMenuSection[] {
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

  if (ctx.onTogglePin) {
    const onTogglePin = ctx.onTogglePin;
    firstSectionItems.push({
      label: ctx.isPinned ? "Unpin Target" : "Pin Target",
      icon: <IconSymbol name={ctx.isPinned ? "pin.fill" : "pin"} size={18} color={tw.color("gray-700") ?? "#374151"} />,
      onPress: () => {
        void onTogglePin(code, ctx.isPinned);
      },
    });
  }

  return [
    { items: firstSectionItems },
    {
      items: [
        {
          label: ctx.lifeListProps.label,
          icon: (
            <Ionicons
              name={ctx.lifeListProps.icon === "plus.circle" ? "add-circle-outline" : "remove-circle-outline"}
              size={18}
              color={ctx.lifeListProps.isDestructive ? tw.color("red-600") : tw.color("gray-700")}
            />
          ),
          destructive: ctx.lifeListProps.isDestructive,
          onPress: () => handleLifeListAction(code, ctx.name),
        },
      ],
    },
  ];
}
