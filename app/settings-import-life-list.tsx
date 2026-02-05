import tw from "@/lib/tw";
import { processLifeListCSV } from "@/lib/utils";
import { devLifeList } from "@/lifelist";
import { useSettingsStore } from "@/stores/settingsStore";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Toast from "react-native-toast-message";

type StepCardProps = {
  stepNumber: number;
  title: string;
  children: React.ReactNode;
};

function StepCard({ stepNumber, title, children }: StepCardProps) {
  const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const cardStyle: ViewStyle = {
    borderRadius: 12,
    overflow: "hidden",
  };

  const content = (
    <View style={tw`p-4`}>
      <View style={tw`flex-row items-center mb-3`}>
        <View style={tw`w-7 h-7 rounded-full bg-gray-200 items-center justify-center mr-3`}>
          <Text style={tw`text-gray-600 font-semibold text-sm`}>{stepNumber}</Text>
        </View>
        <Text style={tw`text-gray-900 text-base font-semibold flex-1`}>{title}</Text>
      </View>
      {children}
    </View>
  );

  return (
    <View style={tw`mb-4`}>
      {useGlass ? (
        <GlassView style={cardStyle} glassEffectStyle="regular" tintColor="rgba(255, 255, 255, 0.7)">
          {content}
        </GlassView>
      ) : (
        <View style={[cardStyle, tw`bg-white`]}>{content}</View>
      )}
    </View>
  );
}

export default function ImportLifeListPage() {
  const router = useRouter();
  const setLifelist = useSettingsStore((state) => state.setLifelist);
  const [isLoading, setIsLoading] = useState(false);

  const processCSV = async (csvText: string): Promise<void> => {
    const result = await processLifeListCSV(csvText);

    if (!result.success) {
      Toast.show({ type: "error", text1: result.error });
      return;
    }

    setLifelist(result.entries);

    let message = `Imported ${result.entries.length} species`;
    if (result.unmatchedCount > 0) {
      message += ` (${result.unmatchedCount} unmatched)`;
    }

    Toast.show({ type: "success", text1: message });
    router.back();
  };

  const handleDownloadPress = async () => {
    const url = "https://ebird.org/lifelist?r=world&time=life&fmt=csv";
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Toast.show({ type: "error", text1: "Unable to open eBird" });
    }
  };

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setIsLoading(true);

      const response = await fetch(file.uri);
      const csvText = await response.text();

      await processCSV(csvText);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Toast.show({ type: "error", text1: error instanceof Error ? error.message : "Failed to import" });
    }
  };

  const handleDevImport = async () => {
    setIsLoading(true);
    await processCSV(devLifeList);
    setIsLoading(false);
  };

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-100`}
      contentContainerStyle={tw`px-4 pt-6 pb-10`}
      showsVerticalScrollIndicator={false}
    >
      <StepCard stepNumber={1} title="Download life list CSV">
        <Text style={tw`text-sm text-gray-700 mb-1.5`}>Download your eBird world life list CSV (login required).</Text>

        <TouchableOpacity
          style={tw`flex-row items-center self-start py-2`}
          onPress={handleDownloadPress}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={18} color="#1D4ED8" style={tw`mr-1.5`} />
          <Text style={tw`text-blue-700 font-semibold text-sm`}>Download CSV from eBird</Text>
        </TouchableOpacity>
      </StepCard>

      <StepCard stepNumber={2} title="Import file">
        <Text style={tw`text-sm text-gray-700 mb-3`}>Select the CSV file (usually in Downloads).</Text>

        <TouchableOpacity
          style={tw`bg-blue-600 rounded-lg py-3 px-4 flex-row items-center justify-center`}
          onPress={handleSelectFile}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <ActivityIndicator color="white" />
              <Text style={tw`text-white font-semibold text-base ml-2`}>Importing…</Text>
            </>
          ) : (
            <>
              <Ionicons name="document-outline" size={20} color="white" style={tw`mr-2`} />
              <Text style={tw`text-white font-semibold text-base`}>Select CSV to Import</Text>
            </>
          )}
        </TouchableOpacity>
      </StepCard>

      {__DEV__ && (
        <StepCard stepNumber={3} title="Dev: Import from bundled file">
          <Text style={tw`text-gray-600 text-sm mb-3`}>
            Import from lifelist.csv in the project root (development only).
          </Text>
          <TouchableOpacity
            style={tw`bg-gray-500 rounded-lg py-3 px-4 flex-row items-center justify-center`}
            onPress={handleDevImport}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="code-slash-outline" size={20} color="white" style={tw`mr-2`} />
                <Text style={tw`text-white font-semibold text-base`}>Import Dev File</Text>
              </>
            )}
          </TouchableOpacity>
        </StepCard>
      )}
    </ScrollView>
  );
}
