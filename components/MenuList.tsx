import tw from "@/lib/tw";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

const ICON_COLOR = tw.color("gray-500");

type MenuOption = {
  id: string;
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
  badge?: number;
};

type MenuListProps = {
  onNavigateToPacks: () => void;
  onNavigateToNearbySpecies: () => void;
  onNavigateToSettings: () => void;
  packUpdateCount?: number;
};

export default function MenuList({
  onNavigateToPacks,
  onNavigateToNearbySpecies,
  onNavigateToSettings,
  packUpdateCount = 0,
}: MenuListProps) {
  const menuOptions: MenuOption[] = [
    {
      id: "packs",
      title: "Hotspot Packs",
      icon: <Ionicons name="location-outline" size={24} color={ICON_COLOR} />,
      onPress: onNavigateToPacks,
      badge: packUpdateCount > 0 ? packUpdateCount : undefined,
    },
    {
      id: "nearby-species",
      title: "Nearby Species",
      icon: <Feather name="feather" size={24} color={ICON_COLOR} />,
      onPress: onNavigateToNearbySpecies,
    },
    {
      id: "settings",
      title: "Settings",
      icon: <Ionicons name="settings-outline" size={24} color={ICON_COLOR} />,
      onPress: onNavigateToSettings,
    },
  ];

  const renderMenuItem = ({ item }: { item: MenuOption }) => (
    <TouchableOpacity
      style={tw`flex-row items-center px-4 py-3 border-b border-gray-200`}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={tw`w-8 h-8 items-center justify-center mr-4`}>{item.icon}</View>
      <Text style={tw`text-gray-900 text-lg flex-1`}>{item.title}</Text>
      {item.badge !== undefined && (
        <View style={tw`bg-blue-500 rounded-full min-w-5 h-5 px-1.5 items-center justify-center mr-2`}>
          <Text style={tw`text-white text-xs font-semibold`}>{item.badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={tw.color("gray-400")} />
    </TouchableOpacity>
  );

  return (
    <View>
      {menuOptions.map((item) => (
        <React.Fragment key={item.id}>{renderMenuItem({ item })}</React.Fragment>
      ))}
    </View>
  );
}
