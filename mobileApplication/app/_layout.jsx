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
import AsyncStorage from "@react-native-async-storage/async-storage";
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

  const { lastCheckTime, forceCheck } = useAgreementExpirationCheck();

  useEffect(() => {
    const runStartupCheck = async () => {
      try {
        // Check if we've already done a startup check today
        const today = new Date().toISOString().split("T")[0];
        const startupCheckKey = `startup_check_${today}`;
        const hasCheckedToday = await AsyncStorage.getItem(startupCheckKey);

        if (hasCheckedToday === "true") {
          console.log("Already ran startup agreement check today");
          return;
        }

        console.log("Running startup agreement expiration check...");
        await forceCheck();
        console.log(
          "Startup agreement check completed at:",
          new Date().toISOString()
        );

        // Mark as checked for today
        await AsyncStorage.setItem(startupCheckKey, "true");
      } catch (error) {
        console.error("Error in startup agreement check:", error);
      }
    };

    // Run the check when app starts
    runStartupCheck();
  }, [forceCheck]);

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
