import { BirdPlanError, fetchBirdPlanTrip } from "@/lib/birdplan";
import { getTripById, importTrip } from "@/lib/database";
import tw from "@/lib/tw";
import { BirdPlanTripData } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
  ViewStyle,
} from "react-native";
import Toast from "react-native-toast-message";

const CODE_LENGTH = 6;

function codeErrorMessage(error: unknown): string {
  if (error instanceof BirdPlanError) {
    if (error.status === 404) return "Code not found or already used";
    if (error.status === 410) return "This code has expired";
    return error.message;
  }
  return error instanceof Error ? error.message : "Import failed";
}

function Card({ children }: { children: React.ReactNode }) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const cardStyle: ViewStyle = { borderRadius: 12, overflow: "hidden" };

  if (useGlass) {
    return (
      <GlassView style={cardStyle} glassEffectStyle="regular" tintColor="rgba(255, 255, 255, 0.7)">
        {children}
      </GlassView>
    );
  }
  return <View style={[cardStyle, tw`bg-white`]}>{children}</View>;
}

export default function BirdPlanImportPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const firstSlotRef = useRef<TextInput | null>(null);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["trips"] });
    queryClient.invalidateQueries({ queryKey: ["savedHotspots"] });
    queryClient.invalidateQueries({ queryKey: ["savedPlaces"] });
    queryClient.invalidateQueries({ queryKey: ["hotspots"] });
  }, [queryClient]);

  const performImport = useCallback(
    async (data: BirdPlanTripData) => {
      try {
        setIsSaving(true);
        await importTrip(data);
        invalidate();
        Toast.show({ type: "success", text1: `Imported “${data.name}”` });
        router.back();
      } catch {
        Toast.show({ type: "error", text1: "Failed to save trip" });
      } finally {
        setIsSaving(false);
      }
    },
    [invalidate, router]
  );

  const importMutation = useMutation({
    mutationFn: async (codeValue: string) => {
      const data = await fetchBirdPlanTrip(codeValue);
      const existing = await getTripById(data.id);
      return { data, existing };
    },
    onSuccess: async ({ data, existing }) => {
      const proceed = () => {
        void performImport(data);
      };

      if (existing) {
        Alert.alert(
          "Replace Trip Content?",
          `This code is for “${existing.name}”, which you've already imported. All hotspots, pins, and notes from the previous import will be replaced.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Replace", style: "destructive", onPress: proceed },
          ]
        );
      } else {
        proceed();
      }
    },
    onError: (error: unknown) => {
      Toast.show({ type: "error", text1: codeErrorMessage(error) });
      setCode("");
      setTimeout(() => firstSlotRef.current?.focus(), 100);
    },
  });

  const handleSubmit = useCallback(
    (codeValue: string) => {
      if (codeValue.length !== CODE_LENGTH || importMutation.isPending || isSaving) return;
      importMutation.mutate(codeValue);
    },
    [importMutation, isSaving]
  );

  useEffect(() => {
    const timer = setTimeout(() => firstSlotRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, []);

  const hasCompleteCode = code.length === CODE_LENGTH;
  const busy = importMutation.isPending || isSaving;

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-50`}
      contentContainerStyle={tw`px-4 pt-6 pb-10`}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={tw`text-gray-500 text-xs uppercase px-4 pb-2 font-medium tracking-wide`}>Enter Code</Text>
      <Card>
        <View style={tw`px-4 pt-5 pb-4`}>
          <Text style={tw`text-gray-700 text-sm mb-4 text-center`}>
            Generate a one-time code in BirdPlan.app and enter it below.
          </Text>
          <CodeInput
            value={code}
            onChange={setCode}
            onComplete={handleSubmit}
            disabled={busy}
            firstSlotRef={firstSlotRef}
          />
          <Pressable
            onPress={() => handleSubmit(code)}
            disabled={!hasCompleteCode || busy}
            style={({ pressed }) => [
              tw`rounded-full py-3 mt-5 items-center justify-center flex-row`,
              hasCompleteCode && !busy ? tw`bg-blue-600` : tw`bg-gray-200`,
              pressed && hasCompleteCode && !busy ? tw`opacity-80` : null,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={[tw`font-semibold text-base`, hasCompleteCode ? tw`text-white` : tw`text-gray-500`]}>
                Import
              </Text>
            )}
          </Pressable>
        </View>
      </Card>
    </ScrollView>
  );
}

type CodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  disabled?: boolean;
  firstSlotRef: React.MutableRefObject<TextInput | null>;
};

function CodeInput({ value, onChange, onComplete, disabled, firstSlotRef }: CodeInputProps) {
  const refs = useRef<(TextInput | null)[]>([]);

  const handleChange = (index: number, text: string) => {
    const digit = text.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    next[index] = digit;
    const joined = next.join("").slice(0, CODE_LENGTH);
    onChange(joined);

    if (digit && index < CODE_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
    if (digit && joined.length === CODE_LENGTH) {
      Keyboard.dismiss();
      onComplete(joined);
    }
  };

  const handleKeyPress = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === "Backspace" && !value[index] && index > 0) {
      const next = value.split("");
      next[index - 1] = "";
      onChange(next.join(""));
      refs.current[index - 1]?.focus();
    }
  };

  const renderSlot = (index: number) => {
    const digit = value[index] ?? "";
    const focused = value.length === index;
    const filled = !!digit;
    return (
      <TextInput
        key={index}
        ref={(el) => {
          refs.current[index] = el;
          if (index === 0) firstSlotRef.current = el;
        }}
        value={digit}
        onChangeText={(text) => handleChange(index, text)}
        onKeyPress={(e) => handleKeyPress(index, e)}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={1}
        selectTextOnFocus
        editable={!disabled}
        textContentType="oneTimeCode"
        style={[
          tw`w-11 h-14 text-center bg-white rounded-lg border mx-1`,
          {
            fontSize: 22,
            fontWeight: "600",
            color: tw.color("gray-900"),
          },
          focused ? tw`border-blue-500` : filled ? tw`border-gray-300` : tw`border-gray-200`,
        ]}
      />
    );
  };

  return (
    <View style={tw`flex-row items-center justify-center`}>
      {[0, 1, 2].map(renderSlot)}
      <View style={tw`mx-1.5 w-2 h-0.5 rounded-full bg-gray-300`} />
      {[3, 4, 5].map(renderSlot)}
    </View>
  );
}
