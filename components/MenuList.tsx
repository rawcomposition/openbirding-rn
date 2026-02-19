import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type MenuOption = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
};

type MenuListProps = {
  onNavigateToPacks: () => void;
  onNavigateToSettings: () => void;
  packUpdateCount?: number;
};

export default function MenuList({ onNavigateToPacks, onNavigateToSettings, packUpdateCount = 0 }: MenuListProps) {
  const menuOptions: MenuOption[] = [
    {
      id: "packs",
      title: "Hotspot Packs",
      icon: "location-outline",
      onPress: onNavigateToPacks,
      badge: packUpdateCount > 0 ? packUpdateCount : undefined,
    },
    {
      id: "settings",
      title: "Settings",
      icon: "settings-outline",
      onPress: onNavigateToSettings,
    },
  ];

  const renderMenuItem = ({ item }: { item: MenuOption }) => (
    <TouchableOpacity
      style={tw`flex-row items-center px-4 py-3 border-b border-gray-200`}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={tw`w-8 h-8 items-center justify-center mr-4`}>
        <Ionicons name={item.icon} size={24} color={tw.color("gray-500")} />
      </View>
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
    <View style={tw`border-t border-gray-200`}>
      {menuOptions.map((item) => (
        <React.Fragment key={item.id}>{renderMenuItem({ item })}</React.Fragment>
      ))}
    </View>
  );
}
