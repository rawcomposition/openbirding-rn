import { TextInput, View } from "react-native";
import tw from "@/lib/tw";

type Props = {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  autoFocus?: boolean;
  returnKeyType: "next" | "done";
  clearButtonMode?: "while-editing" | "always" | "never";
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
};

export default function Input({
  placeholder,
  value,
  onChangeText,
  autoFocus,
  returnKeyType,
  clearButtonMode = "while-editing",
  autoCorrect = true,
  multiline,
  numberOfLines,
}: Props) {
  const lineHeight = 20;
  const paddingVertical = 12;
  const minHeight = multiline && numberOfLines ? numberOfLines * lineHeight + paddingVertical * 2 : undefined;

  return (
    <View
      style={[
        tw`bg-white ${multiline ? "rounded-2xl" : "rounded-full"} pl-4 pr-3 overflow-hidden`,
        minHeight ? { minHeight } : undefined,
      ]}
    >
      <TextInput
        style={tw`bg-white text-gray-900 text-base leading-5 flex-1 py-3`}
        placeholder={placeholder}
        placeholderTextColor={tw.color("gray-400")}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        clearButtonMode={clearButtonMode}
        autoCorrect={autoCorrect}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}
