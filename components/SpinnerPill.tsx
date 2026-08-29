import tw from "@/lib/tw";
import { ActivityIndicator, StyleProp, View, ViewStyle } from "react-native";

type SpinnerPillProps = {
  style?: StyleProp<ViewStyle>;
};

/** The app's standard loading indicator: a small spinner on a white pill. */
export default function SpinnerPill({ style }: SpinnerPillProps) {
  return (
    <View style={[tw`bg-white rounded-full p-2.5 shadow-md border border-gray-100 self-center`, style]}>
      <ActivityIndicator size="small" color={tw.color("gray-500")} />
    </View>
  );
}
