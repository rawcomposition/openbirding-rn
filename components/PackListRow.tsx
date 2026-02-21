import { useInstalledPacks } from "@/hooks/useInstalledPacks";
import { useManagePack } from "@/hooks/useManagePack";
import tw from "@/lib/tw";
import { StaticPack } from "@/lib/types";
import { formatSize } from "@/lib/utils";
import React, { memo, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Swipeable, { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";

type PackListRowProps = {
  pack: StaticPack;
};

const PackListRow = memo(({ pack }: PackListRowProps) => {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const { install, uninstall, isDownloading, isInstalling, isUninstalling } = useManagePack(pack.id);
  const { data: installedPacks } = useInstalledPacks();
  const installedPack = installedPacks.get(pack.id);

  const handleUninstall = () => {
    swipeableRef.current?.close();
    uninstall();
  };

  const isInstalled = installedPack !== undefined;
  const canUpdate = isInstalled && installedPack.version !== pack.v;
  const canInstall = !isInstalled || canUpdate;
  const installDisabled = isInstalling || isUninstalling || isDownloading;

  const getButtonText = () => {
    if (isUninstalling) return "Uninstalling";
    if (isDownloading) return "Downloading";
    if (isInstalling) return "Installing";
    return isInstalled ? "Update" : "Install";
  };

  const renderRightActions = () => {
    if (!isInstalled) return null;

    return (
      <View style={tw`w-20 bg-red-500 justify-center items-center`}>
        <Pressable onPress={handleUninstall} style={tw`w-full h-full justify-center items-center`}>
          <Text style={tw`text-white font-medium text-sm`}>Uninstall</Text>
        </Pressable>
      </View>
    );
  };

  const content = (
    <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200/50`}>
      <View style={tw`flex-1`}>
        <Text style={tw`text-gray-900 text-lg font-medium`}>{pack.name}</Text>
        <View style={tw`flex-row items-center`}>
          <Text style={tw`text-gray-600 text-sm`}>
            {pack.hotspots.toLocaleString()} hotspots · {formatSize(pack.size)}
          </Text>
          {isInstalled && (
            <View style={tw`ml-2 px-2 py-0.5 rounded-full bg-emerald-50/80`}>
              <Text style={tw`text-emerald-600 text-xs font-medium`}>Installed</Text>
            </View>
          )}
        </View>
      </View>
      {canInstall && (
        <View style={tw`flex-row items-center`}>
          <View style={tw`relative`}>
            <Pressable
              onPress={() => install(pack)}
              disabled={installDisabled}
              style={[
                tw`py-2 rounded-xl border`,
                canUpdate ? tw`border-blue-500 bg-blue-500` : tw`border-gray-200`,
                installDisabled && tw`opacity-60`,
              ]}
            >
              <Text
                style={tw.style(`font-medium text-center mx-4 text-sm`, canUpdate ? `text-white` : `text-gray-700`)}
              >
                {getButtonText()}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

  if (isInstalled) {
    return (
      <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} enabled={isInstalled}>
        {content}
      </Swipeable>
    );
  }

  return content;
});

PackListRow.displayName = "PackListRow";

export default PackListRow;
