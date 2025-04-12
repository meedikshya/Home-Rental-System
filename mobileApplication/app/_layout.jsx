import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAgreementExpirationCheck } from "../hooks/useAgreementExpirationCheck.js";

import { useColorScheme } from "../hooks/useColorScheme";
import * as NotificationHelper from "../firebaseNotification.js";
import { NotificationProvider } from "../context/NotificationContext.js";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const { lastCheckTime } = useAgreementExpirationCheck();

  // Initialize notifications system - simplified
  useEffect(() => {
    let cleanup = null;

    // Initialize and store cleanup function
    NotificationHelper.initializeNotifications()
      .then((unsubscribe) => {
        cleanup = unsubscribe;
      })
      .catch((error) => {
        console.error("Notification init error:", error);
      });

    // Clean up function
    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, []);

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <NotificationProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(pages)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </NotificationProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
