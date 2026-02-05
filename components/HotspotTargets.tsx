import { getTargetsForHotspot } from "@/lib/database";
import tw from "@/lib/tw";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

const INITIAL_LIMIT = 10;

type HotspotTargetsProps = {
  hotspotId: string;
};

export default function HotspotTargets({ hotspotId }: HotspotTargetsProps) {
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setShowAll(false);
  }, [hotspotId]);

  const { data, isLoading } = useQuery({
    queryKey: ["hotspotTargets", hotspotId],
    queryFn: () => getTargetsForHotspot(hotspotId),
    enabled: !!hotspotId,
  });

  if (isLoading || !data || data.targets.length === 0) {
    return null;
  }

  const displayedTargets = showAll ? data.targets : data.targets.slice(0, INITIAL_LIMIT);
  const hasMore = data.targets.length > INITIAL_LIMIT;

  return (
    <View style={tw`mt-4`}>
      <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Targets</Text>
      <Text style={tw`text-xs text-gray-500 mb-3`}>Based on {data.samples.toLocaleString()} checklists</Text>
      <View style={tw`gap-2`}>
        {displayedTargets.map((target) => (
          <View key={target.speciesCode} style={tw`flex-row items-center gap-2`}>
            <Text style={tw`text-xs text-gray-700 w-16`}>{target.speciesCode}</Text>
            <View style={tw`flex-1 h-4 bg-gray-200 rounded-full overflow-hidden`}>
              <View style={[tw`h-full bg-green-500 rounded-full`, { width: `${Math.min(target.percentage, 100)}%` }]} />
            </View>
            <Text style={tw`text-xs text-gray-600 w-12 text-right`}>{target.percentage.toFixed(0)}%</Text>
          </View>
        ))}
      </View>
      {hasMore && !showAll && (
        <TouchableOpacity onPress={() => setShowAll(true)} style={tw`mt-3 py-2`}>
          <Text style={tw`text-sm text-blue-600 text-center`}>View All ({data.targets.length} species)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
