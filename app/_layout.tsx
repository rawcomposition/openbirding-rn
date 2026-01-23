import tw from "@/lib/tw";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { initializeDatabase } from "@/lib/database";
import { get } from "@/lib/utils";
import { useDefaultMapProviderStore } from "@/stores/defaultMapProviderStore";
import { useLocationPermissionStore } from "@/stores/locationPermissionStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      gcTime: 24 * 24 * 60 * 60 * 1000,
      staleTime: 0,
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        return get(url, (queryKey[1] || {}) as Record<string, string | number | boolean>);
      },
    },
  },
});

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
    useDefaultMapProviderStore.getState().loadDefaultProvider();
    useLocationPermissionStore.getState().requestPermission();
  }, []);

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
        <ActionSheetProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="index" options={{ title: "Map", headerShown: false }} />
                <Stack.Screen name="packs" options={{ title: "Hotspot Packs" }} />
                <Stack.Screen name="settings" options={{ title: "Settings" }} />
                <Stack.Screen
                  name="place-edit"
                  options={{
                    title: "Edit Place",
                    presentation: "modal",
                    gestureEnabled: true,
                    animation: "slide_from_bottom",
                    headerShown: false,
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
              <StatusBar style="auto" />
            </ThemeProvider>
          </QueryClientProvider>
        </ActionSheetProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
