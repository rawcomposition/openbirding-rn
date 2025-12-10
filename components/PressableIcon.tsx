import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, View } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import tw from "twrnc";

type PressableIconProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
};

const CONTAINER_SIZE = 34;
const DEFAULT_ICON_SIZE = 20;

export function PressableIcon({ icon, onPress, size = DEFAULT_ICON_SIZE, color = "#000000" }: PressableIconProps) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const baseStyle = [
    { width: CONTAINER_SIZE, height: CONTAINER_SIZE, borderRadius: CONTAINER_SIZE / 2 },
    tw`items-center justify-center`,
  ];

  if (useGlass) {
    return (
      <View style={{ marginLeft: 16 }}>
        <Pressable onPress={onPress} hitSlop={10} style={baseStyle}>
          <GlassView style={baseStyle} glassEffectStyle="regular">
            <Ionicons name={icon} size={size} color={color} />
          </GlassView>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ marginLeft: 16 }}>
      <Pressable onPress={onPress} hitSlop={10} style={[baseStyle, tw`bg-white shadow-lg`]}>
        <Ionicons name={icon} size={size} color={color} />
      </Pressable>
    </View>
  );
}
