import tw from "@/lib/tw";
import { Ionicons } from "@expo/vector-icons";
import { GlassContainer, GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import React, { useRef, useState } from "react";
import { Platform, Pressable, TextInput, TextInputProps, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

type SearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
} & Pick<TextInputProps, "autoCorrect" | "autoCapitalize" | "autoComplete" | "returnKeyType">;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const INPUT_HEIGHT = 38;

const glassProps = {
  glassEffectStyle: "regular" as const,
  isInteractive: true,
};

export default function SearchInput({
  value,
  onChangeText,
  placeholder = "Search",
  autoCorrect = false,
  autoCapitalize = "none",
  autoComplete = "off",
  returnKeyType = "search",
}: SearchInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const showClear = value.length > 0 || isFocused;

  const handleClear = () => {
    onChangeText("");
    inputRef.current?.blur();
  };

  const inputContent = (
    <Pressable
      style={[tw`flex-row items-center px-3.5`, { height: INPUT_HEIGHT }]}
      onPress={() => inputRef.current?.focus()}
    >
      <Ionicons name="search" size={18} color={tw.color("gray-600")} style={tw`mr-1.5`} />
      <TextInput
        ref={inputRef}
        style={tw`flex-1 text-base text-gray-900 leading-5`}
        placeholder={placeholder}
        placeholderTextColor={tw.color("gray-600")}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCorrect={autoCorrect}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        returnKeyType={returnKeyType}
      />
    </Pressable>
  );

  const pill = useGlass ? (
    <GlassView style={tw`flex-1 rounded-full`} {...glassProps}>
      {inputContent}
    </GlassView>
  ) : (
    <View style={tw`flex-1 rounded-full bg-gray-100`}>{inputContent}</View>
  );

  const clearButton = (
    <AnimatedPressable
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      onPress={handleClear}
      hitSlop={8}
    >
      {useGlass ? (
        <GlassView
          style={[tw`rounded-full items-center justify-center`, { width: INPUT_HEIGHT, height: INPUT_HEIGHT }]}
          {...glassProps}
        >
          <Ionicons name="close" size={22} color={tw.color("gray-600")} />
        </GlassView>
      ) : (
        <View
          style={[
            tw`rounded-full items-center justify-center bg-gray-100`,
            { width: INPUT_HEIGHT, height: INPUT_HEIGHT },
          ]}
        >
          <Ionicons name="close" size={18} color={tw.color("gray-500")} />
        </View>
      )}
    </AnimatedPressable>
  );

  const content = (
    <>
      {pill}
      {showClear && clearButton}
    </>
  );

  return useGlass ? (
    <GlassContainer style={tw`flex-row items-center gap-2`} spacing={8}>
      {content}
    </GlassContainer>
  ) : (
    <View style={tw`flex-row items-center gap-2`}>{content}</View>
  );
}
