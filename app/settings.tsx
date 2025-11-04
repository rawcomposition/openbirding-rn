import GoogleMapsIcon from "@/components/icons/GoogleMapsIcon";
import OrganicMapsIcon from "@/components/icons/OrganicMapsIcon";
import QuestionMarkIcon from "@/components/icons/QuestionMarkIcon";
import WazeIcon from "@/components/icons/WazeIcon";
import { useDefaultMapProvider } from "@/hooks/useDefaultMapProvider";
import { getExternalMapProviders } from "@/lib/utils";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";

export default function SettingsPage() {
  const { defaultProvider, setDefaultProvider, isLoading } = useDefaultMapProvider();
  const providers = getExternalMapProviders();

  const renderProviderIcon = (providerId: string) => {
    switch (providerId) {
      case "google":
        return <GoogleMapsIcon size={18} />;
      case "apple":
        return <Ionicons name="logo-apple" size={26} color={getProviderColor(providerId)} />;
      case "organic":
        return <OrganicMapsIcon size={30} />;
      case "waze":
        return <WazeIcon size={26} />;
      default:
        return <Ionicons name="map" size={26} color={getProviderColor(providerId)} />;
    }
  };

  const getProviderColor = (providerId: string) => {
    switch (providerId) {
      case "google":
        return "#4285F4";
      case "apple":
        return tw.color("gray-800");
      case "organic":
        return tw.color("green-600");
      case "waze":
        return tw.color("gray-700");
      default:
        return tw.color("gray-500");
    }
  };

  if (isLoading) {
    return (
      <View style={tw`flex-1 bg-gray-50 justify-center items-center`}>
        <Text style={tw`text-gray-600`}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={tw`flex-1 bg-gray-50`} showsVerticalScrollIndicator={false}>
      <View style={tw`p-4`}>
        <View style={tw`bg-white rounded-lg shadow-sm mb-4`}>
          <View style={tw`p-4 border-b border-gray-200`}>
            <Text style={tw`text-gray-900 text-lg font-semibold`}>Map Provider</Text>
            <Text style={tw`text-gray-600 text-sm mt-1`}>Choose your default map provider for getting directions</Text>
          </View>
          <View style={tw`p-2`}>
            {providers.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={tw`flex-row items-center px-3 py-2 rounded-lg ${
                  defaultProvider === provider.id ? "bg-blue-50" : ""
                }`}
                onPress={() => setDefaultProvider(provider.id)}
                activeOpacity={0.7}
              >
                <View style={tw`w-10 h-10 items-center justify-center mr-3`}>{renderProviderIcon(provider.id)}</View>
                <Text style={tw`text-gray-800 text-base font-medium flex-1`}>{provider.name}</Text>
                {defaultProvider === provider.id && (
                  <Ionicons name="checkmark-circle" size={24} color={tw.color("blue-500")} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={tw`flex-row items-center px-3 py-2 rounded-lg ${!defaultProvider ? "bg-blue-50" : ""}`}
              onPress={() => setDefaultProvider("")}
              activeOpacity={0.7}
            >
              <View style={tw`w-10 h-10 items-center justify-center mr-3`}>
                <QuestionMarkIcon size={30} color={tw.color("gray-700")} />
              </View>
              <Text style={tw`text-gray-800 text-base font-medium flex-1`}>Always ask</Text>
              {!defaultProvider && <Ionicons name="checkmark-circle" size={24} color={tw.color("blue-500")} />}
            </TouchableOpacity>
          </View>
        </View>
        <View style={tw`mt-6 mb-4 items-center`}>
          <Text style={tw`text-gray-500 text-xs`}>
            Version {Constants.expoConfig?.version || "Unknown"}
            {Constants.nativeBuildVersion && ` (${Constants.nativeBuildVersion})`}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
