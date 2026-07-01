import tw from "@/lib/tw";
import React from "react";
import { Text, View } from "react-native";

export default function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <View
      style={tw`absolute -top-1 -right-1 min-w-5 h-5 bg-blue-500 rounded-full items-center justify-center px-1.5 border-2 border-white`}
    >
      <Text style={tw`text-white text-xs font-bold`}>{count}</Text>
    </View>
  );
}
