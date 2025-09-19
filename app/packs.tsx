import React from "react";
import { View } from "react-native";
import tw from "twrnc";
import PacksList from "@/components/PacksList";

export default function PacksPage() {
  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <PacksList />
    </View>
  );
}
