import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";

type MenuOption = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type MenuListProps = {
  onNavigateToPacks: () => void;
  onNavigateToSettings: () => void;
};

export default function MenuList({ onNavigateToPacks, onNavigateToSettings }: MenuListProps) {
  const menuOptions: MenuOption[] = [
    {
      id: "packs",
      title: "Hotspot Packs",
      icon: "location-outline",
      onPress: onNavigateToPacks,
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
      style={tw`flex-row items-center p-4 border-b border-gray-200`}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={tw`w-8 h-8 items-center justify-center mr-4`}>
        <Ionicons name={item.icon} size={24} color={tw.color("gray-500")} />
      </View>
      <Text style={tw`text-gray-900 text-lg flex-1`}>{item.title}</Text>
      <Ionicons name="chevron-forward" size={20} color={tw.color("gray-400")} />
    </TouchableOpacity>
  );

  return (
    <View style={tw`flex-1`}>
      <FlatList
        data={menuOptions}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
