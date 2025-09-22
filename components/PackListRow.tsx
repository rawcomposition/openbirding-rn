import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import tw from "twrnc";
import { useInstallPack } from "@/hooks/useInstallPack";
import { useInstalledPacks } from "@/hooks/useInstalledPacks";

type PackListRowProps = {
  id: number;
  name: string;
  hotspots: number;
};

const PackListRow = memo(({ id, name, hotspots }: PackListRowProps) => {
  const { installPack, uninstallPack, installingId, operationType } = useInstallPack();
  const { data: installedPackIds } = useInstalledPacks();

  const isInstalled = installedPackIds?.has(id) ?? false;
  const isCurrentlyInstalling = installingId === id;
  const isUninstalling = isCurrentlyInstalling && operationType === "uninstall";
  const isDownloading = isCurrentlyInstalling && operationType === "install";

  const getButtonText = () => {
    if (isUninstalling) return "Updating";
    if (isDownloading) return "Downloading";
    return isInstalled ? "Update" : "Install";
  };

  const renderRightActions = () => {
    if (!isInstalled) return null;

    return (
      <View style={tw`w-20 bg-red-500 justify-center items-center`}>
        <Pressable onPress={() => uninstallPack(id)} style={tw`w-full h-full justify-center items-center`}>
          <Text style={tw`text-white font-medium text-sm`}>Uninstall</Text>
        </Pressable>
      </View>
    );
  };

  const content = (
    <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200/70 bg-white`}>
      <View style={tw`flex-1`}>
        <Text style={tw`text-gray-900 text-lg font-medium`}>{name}</Text>
        <Text style={tw`text-gray-600 text-sm`}>{hotspots.toLocaleString()} hotspots</Text>
      </View>
      <View style={tw`flex-row items-center`}>
        <View style={tw`relative`}>
          <Pressable
            onPress={() => installPack({ id, name, hotspots })}
            disabled={isCurrentlyInstalling}
            style={[tw`py-2 rounded-lg border border-gray-200`, isCurrentlyInstalling && tw`opacity-60`]}
          >
            <Text style={tw`font-medium text-center mx-4 text-gray-700`}>{getButtonText()}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (isInstalled) {
    return (
      <Swipeable renderRightActions={renderRightActions} enabled={isInstalled}>
        {content}
      </Swipeable>
    );
  }

  return content;
});

PackListRow.displayName = "PackListRow";

export default PackListRow;
