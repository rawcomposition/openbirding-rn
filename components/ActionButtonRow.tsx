import tw from "@/lib/tw";
import { GlassContainer, isLiquidGlassAvailable } from "expo-glass-effect";
import React, { Children, ReactNode } from "react";
import { Platform, View } from "react-native";

const GAP = 12;

type ActionButtonRowProps = {
  children: ReactNode;
  stacked?: boolean;
};

export default function ActionButtonRow({ children, stacked = false }: ActionButtonRowProps) {
  const useGlass = !stacked && Platform.OS === "ios" && isLiquidGlassAvailable();
  const items = Children.toArray(children).map((child, index) => (
    <View key={index} style={stacked ? { width: "100%" } : { flex: 1, flexBasis: 0 }}>
      {child}
    </View>
  ));
  const containerStyle = [tw`w-full mt-2`, stacked ? tw`flex-col` : tw`flex-row`, { gap: GAP }] as const;

  return useGlass ? (
    <GlassContainer style={containerStyle} spacing={GAP}>
      {items}
    </GlassContainer>
  ) : (
    <View style={containerStyle}>{items}</View>
  );
}
