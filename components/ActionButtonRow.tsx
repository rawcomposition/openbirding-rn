import tw from "@/lib/tw";
import { GlassContainer, isLiquidGlassAvailable } from "expo-glass-effect";
import React, { ReactNode } from "react";
import { Platform, View } from "react-native";

const GAP = 12;

type ActionButtonRowProps = {
  children: ReactNode;
};

export default function ActionButtonRow({ children }: ActionButtonRowProps) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  return useGlass ? (
    <GlassContainer style={[tw`w-full flex-row mt-2`, { gap: GAP }]} spacing={GAP}>
      {children}
    </GlassContainer>
  ) : (
    <View style={[tw`w-full flex-row mt-2`, { gap: GAP }]}>{children}</View>
  );
}
