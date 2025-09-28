import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import tw from "twrnc";
import { useManagePack } from "@/hooks/useManagePack";
import { useInstalledPacks } from "@/hooks/useInstalledPacks";
import { UPDATE_INTERVAL_LIMIT } from "@/lib/config";

type PackListRowProps = {
  id: number;
  name: string;
  hotspots: number;
};

const PackListRow = memo(({ id, name, hotspots }: PackListRowProps) => {
  const { install, uninstall, isInstalling, isUninstalling } = useManagePack(id);
  const installedPacks = useInstalledPacks();
  const installedPack = installedPacks.get(id);

  const isInstalled = installedPack !== undefined;
  const canInstall = !installedPack || new Date(installedPack).getTime() + UPDATE_INTERVAL_LIMIT < Date.now();
  const installDisabled = isInstalling || isUninstalling || !canInstall;

  const getButtonText = () => {
    if (isUninstalling) return "Uninstalling";
    if (isInstalling) return "Installing";
    return isInstalled ? "Update" : "Install";
  };

  const renderRightActions = () => {
    if (!isInstalled) return null;

    return (
      <View style={tw`w-20 bg-red-500 justify-center items-center`}>
        <Pressable onPress={uninstall} style={tw`w-full h-full justify-center items-center`}>
          <Text style={tw`text-white font-medium text-sm`}>Uninstall</Text>
        </Pressable>
      </View>
    );
  };

  const content = (
    <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200/70 bg-white`}>
      <View style={tw`flex-1`}>
        <Text style={tw`text-gray-900 text-lg font-medium`}>{name}</Text>
        <View style={tw`flex-row items-center`}>
          <Text style={tw`text-gray-600 text-sm`}>{hotspots.toLocaleString()} hotspots</Text>
          {isInstalled && (
            <View style={tw`ml-2 px-1.5 py-0.5 bg-green-100 rounded border border-green-200`}>
              <Text style={tw`text-green-700 text-xs font-medium`}>Installed</Text>
            </View>
          )}
        </View>
      </View>
      {canInstall && (
        <View style={tw`flex-row items-center`}>
          <View style={tw`relative`}>
            <Pressable
              onPress={() => install({ id, name, hotspots })}
              disabled={installDisabled}
              style={[tw`py-2 rounded-lg border border-gray-200`, installDisabled && tw`opacity-60`]}
            >
              <Text style={tw`font-medium text-center mx-4 text-gray-700`}>{getButtonText()}</Text>
            </Pressable>
          </View>
        </View>
      )}
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
