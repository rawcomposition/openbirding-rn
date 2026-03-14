import tw from "@/lib/tw";
import { GlassContainer, isLiquidGlassAvailable } from "expo-glass-effect";
import React, { ReactNode } from "react";
import { Platform, View } from "react-native";

const GAP = 8;

type IconButtonGroupProps = {
  children: ReactNode;
};

export default function IconButtonGroup({ children }: IconButtonGroupProps) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  return useGlass ? (
    <GlassContainer style={[tw`flex-row items-center`, { gap: GAP }]} spacing={GAP}>
      {children}
    </GlassContainer>
  ) : (
    <View style={[tw`flex-row items-center`, { gap: GAP }]}>{children}</View>
  );
}
