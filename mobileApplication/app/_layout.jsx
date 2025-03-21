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

import { useColorScheme } from "../hooks/useColorScheme";
// Import notification functionality using * as syntax
import * as NotificationHelper from "../firebaseNotification.js";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Initialize notifications system - similar to web version
  useEffect(() => {
    // Initialize notification system and get unsubscribe function
    const initNotifications = async () => {
      try {
        console.log("Initializing notification system...");

        // Initialize notifications - this will handle permissions and setup
        const unsubscribe = await NotificationHelper.initializeNotifications();

        console.log("Notification system initialized successfully");

        // Return the unsubscribe function for cleanup
        return unsubscribe;
      } catch (error) {
        console.error("Error initializing notifications:", error);
        return () => {};
      }
    };

    // Call initialization and store the cleanup function
    const notificationCleanup = initNotifications();

    // Clean up on component unmount - handle both synchronous and Promise returns
    return () => {
      if (
        notificationCleanup &&
        typeof notificationCleanup.then === "function"
      ) {
        // If it's a Promise, wait for it to resolve then call the returned function
        notificationCleanup.then((cleanup) => {
          if (typeof cleanup === "function") {
            console.log("Cleaning up notification listeners");
            cleanup();
          }
        });
      } else if (typeof notificationCleanup === "function") {
        // If it's already a function, call it directly
        console.log("Directly cleaning up notification listeners");
        notificationCleanup();
      }
    };
  }, []); // Empty dependency array means this runs once on mount

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
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(pages)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
