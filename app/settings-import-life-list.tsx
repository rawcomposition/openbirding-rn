import tw from "@/lib/tw";
import { get } from "@/lib/utils";
import { devLifeList } from "@/lifelist";
import { LifeListEntry, useSettingsStore } from "@/stores/settingsStore";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type TaxonomyEntry = {
  sciName: string;
  code: string;
};

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
        <View style={tw`w-7 h-7 rounded-full bg-blue-500 items-center justify-center mr-3`}>
          <Text style={tw`text-white font-semibold text-sm`}>{stepNumber}</Text>
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

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

export default function ImportLifeListPage() {
  const router = useRouter();
  const setLifelist = useSettingsStore((state) => state.setLifelist);
  const lifelist = useSettingsStore((state) => state.lifelist);
  const [isLoading, setIsLoading] = useState(false);

  const processCSV = async (csvText: string): Promise<void> => {
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      Alert.alert("Error", "No data found in the CSV file.");
      return;
    }

    const countableRows = rows.filter((row) => row["Countable"] === "1");

    if (countableRows.length === 0) {
      Alert.alert("Error", "No countable species found in the life list.");
      return;
    }

    const taxonomyResponse = (await get("/taxonomy")) as unknown as TaxonomyEntry[];

    if (!Array.isArray(taxonomyResponse)) {
      Alert.alert("Error", "Failed to fetch taxonomy data.");
      return;
    }

    const sciNameToCode = new Map<string, string>();
    taxonomyResponse.forEach((entry) => {
      sciNameToCode.set(entry.sciName, entry.code);
    });

    const lifeListEntries: LifeListEntry[] = [];
    let unmatchedCount = 0;

    countableRows.forEach((row) => {
      const sciName = row["Scientific Name"];
      const code = sciNameToCode.get(sciName);

      if (code) {
        lifeListEntries.push({
          code,
          date: row["Date"] || "",
          location: row["Location"] || "",
          checklistId: row["SubID"] || "",
        });
      } else {
        unmatchedCount++;
      }
    });

    if (lifeListEntries.length === 0) {
      Alert.alert("Error", "Could not match any species to the taxonomy.");
      return;
    }

    setLifelist(lifeListEntries);

    let message = `Successfully imported ${lifeListEntries.length} species.`;
    if (unmatchedCount > 0) {
      message += ` (${unmatchedCount} species could not be matched)`;
    }

    Alert.alert("Success", message, [{ text: "OK", onPress: () => router.back() }]);
  };

  const handleDownloadPress = async () => {
    const url = "https://ebird.org/lifelist?r=world&time=life&fmt=csv";
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Unable to open eBird. Please visit ebird.org manually.");
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
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      Alert.alert("Error", `Failed to import life list: ${errorMessage}`);
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
      <StepCard stepNumber={1} title="Download your life list">
        <Text style={tw`text-gray-600 text-sm mb-3`}>
          Download your eBird life list as a CSV file. You must be logged in to eBird.
        </Text>
        <TouchableOpacity
          style={tw`bg-blue-500 rounded-lg py-3 px-4 flex-row items-center justify-center`}
          onPress={handleDownloadPress}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={20} color="white" style={tw`mr-2`} />
          <Text style={tw`text-white font-semibold text-base`}>Download from eBird</Text>
        </TouchableOpacity>
      </StepCard>

      <StepCard stepNumber={2} title="Select your downloaded file">
        <Text style={tw`text-gray-600 text-sm mb-3`}>After downloading, select the CSV file from your device.</Text>
        <TouchableOpacity
          style={tw`bg-green-600 rounded-lg py-3 px-4 flex-row items-center justify-center`}
          onPress={handleSelectFile}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="document-outline" size={20} color="white" style={tw`mr-2`} />
              <Text style={tw`text-white font-semibold text-base`}>Select File</Text>
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

      {lifelist && (
        <View style={tw`mt-2 px-1`}>
          <Text style={tw`text-gray-500 text-sm text-center`}>Current life list: {lifelist.length} species</Text>
        </View>
      )}
    </ScrollView>
  );
}
