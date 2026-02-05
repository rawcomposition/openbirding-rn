import { useTaxonomyMap } from "@/hooks/useTaxonomy";
import { getTargetsForHotspot } from "@/lib/database";
import tw from "@/lib/tw";
import { useSettingsStore } from "@/stores/settingsStore";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

const INITIAL_LIMIT = 10;

type HotspotTargetsProps = {
  hotspotId: string;
};

export default function HotspotTargets({ hotspotId }: HotspotTargetsProps) {
  const [showAll, setShowAll] = useState(false);
  const { taxonomyMap } = useTaxonomyMap();
  const lifelist = useSettingsStore((s) => s.lifelist);

  useEffect(() => {
    setShowAll(false);
  }, [hotspotId]);

  const { data, isLoading } = useQuery({
    queryKey: ["hotspotTargets", hotspotId],
    queryFn: () => getTargetsForHotspot(hotspotId),
    enabled: !!hotspotId,
  });

  const filteredTargets = useMemo(() => {
    if (!data) return [];
    const lifelistCodes = lifelist ? new Set(lifelist.map((e) => e.code)) : null;
    return data.targets.filter(
      (t) => t.percentage >= 1 && (!lifelistCodes || !lifelistCodes.has(t.speciesCode))
    );
  }, [data, lifelist]);

  if (isLoading || !data || filteredTargets.length === 0) {
    return null;
  }

  const displayedTargets = showAll ? filteredTargets : filteredTargets.slice(0, INITIAL_LIMIT);
  const hasMore = filteredTargets.length > INITIAL_LIMIT;

  return (
    <View style={tw`mt-4`}>
      <Text style={tw`text-base font-semibold text-gray-900`}>Targets</Text>
      <Text style={tw`text-sm text-gray-500 mt-1`}>Based on {data.samples.toLocaleString()} checklists</Text>

      {/* Full-bleed list */}
      <View style={tw`mt-3 -mx-4`}>
        {displayedTargets.map((t, idx) => (
          <View key={t.speciesCode}>
            {idx > 0 && <View style={tw`h-px bg-gray-100`} />}

            <View style={tw`pl-5 pr-6 py-3`}>
              <View style={tw`flex-row items-center`}>
                <Text style={tw`w-7 text-sm font-semibold text-gray-400 tabular-nums`}>{idx + 1}</Text>

                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-baseline justify-between`}>
                    <Text style={tw`text-base text-gray-900 flex-1 mr-3`} numberOfLines={1}>
                      {taxonomyMap.get(t.speciesCode) || "Unknown species"}
                    </Text>

                    <Text style={tw`text-xs font-semibold text-gray-600 tabular-nums`}>{t.percentage.toFixed(0)}%</Text>
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
    </View>
  );
}
