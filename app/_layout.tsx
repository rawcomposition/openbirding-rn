import tw from "@/lib/tw";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import DownloadOverlay from "@/components/DownloadOverlay";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useManagedSplashScreen } from "@/hooks/useManagedSplashScreen";
import { initializeDatabase } from "@/lib/database";
import { queryClient } from "@/lib/queryClient";
import { ensureTaxonomyLoaded } from "@/lib/taxonomy";
import { useLocationPermissionStore } from "@/stores/locationPermissionStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        await initializeDatabase();
        setDbInitialized(true);
      } catch (error) {
        console.error("Database initialization failed:", error);
        setDbError(error instanceof Error ? error.message : "Database initialization failed");
      }
    };

    initDatabase();
    ensureTaxonomyLoaded();

    const permissionTimeout = setTimeout(() => {
      void useLocationPermissionStore.getState().requestPermission();
    }, 300);

    return () => {
      clearTimeout(permissionTimeout);
    };
  }, []);

  useManagedSplashScreen(loaded && (dbInitialized || dbError !== null), 500);

  if (!loaded) {
    return null;
  }

  if (!dbInitialized && !dbError) return null;

  if (dbError) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50 p-4`}>
        <Text style={tw`text-red-500 text-center text-lg font-semibold`}>Database Error</Text>
        <Text style={tw`text-gray-600 text-center mt-2 text-base`}>{dbError}</Text>
      </View>
    );
  }

  const toastStyles = tw`bg-white rounded-full pr-4 pl-3 py-2 mx-4 shadow-lg border border-gray-100 flex-row items-center justify-center`;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="index" options={{ title: "Map", headerShown: false }} />
              <Stack.Screen
                name="packs"
                options={{
                  title: "Hotspot Packs",
                  headerStyle: { backgroundColor: "#f9fafb" },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  title: "Settings",
                  headerStyle: { backgroundColor: "#f9fafb" },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="settings-map-provider"
                options={{
                  title: "Directions Provider",
                  headerBackButtonDisplayMode: "minimal",
                  headerStyle: { backgroundColor: "#f9fafb" },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="settings-import-life-list"
                options={{
                  title: "Import Life List",
                  headerBackButtonDisplayMode: "minimal",
                  headerStyle: { backgroundColor: "#f9fafb" },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="settings-view-life-list"
                options={{
                  title: "Life List",
                  headerBackButtonDisplayMode: "minimal",
                  headerStyle: { backgroundColor: "#f9fafb" },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="settings-life-list-exclusions"
                options={{
                  title: "Exclusions",
                  headerBackButtonDisplayMode: "minimal",
                  headerStyle: { backgroundColor: "#f9fafb" },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="settings-birdplan"
                options={{
                  title: "BirdPlan.app Trips",
                  headerBackButtonDisplayMode: "minimal",
                  headerStyle: { backgroundColor: "#f9fafb" },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="settings-birdplan-import"
                options={{
                  title: "Import Trip",
                  headerBackButtonDisplayMode: "minimal",
                  headerStyle: { backgroundColor: "#f9fafb" },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen name="+not-found" />
            </Stack>
            <Toast
              config={{
                success: ({ text1 }) => (
                  <View style={toastStyles}>
                    <View style={tw`mr-1.5`}>
                      <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                    </View>
                    <Text style={tw`text-gray-800 font-medium text-base`}>{text1}</Text>
                  </View>
                ),
                error: ({ text1 }) => (
                  <View style={toastStyles}>
                    <View style={tw`mr-1.5`}>
                      <Ionicons name="alert-circle" size={20} color="#DC2626" />
                    </View>
                    <Text style={tw`text-gray-800 font-medium text-base`}>{text1}</Text>
                  </View>
                ),
                info: ({ text1 }) => (
                  <View style={toastStyles}>
                    <View style={tw`mr-1.5`}>
                      <Ionicons name="information-circle" size={20} color="#2563EB" />
                    </View>
                    <Text style={tw`text-gray-800 font-medium text-base`}>{text1}</Text>
                  </View>
                ),
              }}
              position="top"
              topOffset={65}
            />
            <DownloadOverlay />
            <StatusBar style="auto" />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
