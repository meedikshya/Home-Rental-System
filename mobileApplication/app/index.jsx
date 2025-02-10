import { StatusBar } from "expo-status-bar";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons"; // Import Ionicons for the arrow icon
import { useRouter } from "expo-router"; // Use `useRouter` instead of Link

import "nativewind";

const Welcome = () => {
  const router = useRouter(); // Initialize router

  return (
    <SafeAreaView className="bg-[#20319D] flex-1">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="bg-[#20319D]"
      >
        <View className="w-full flex justify-center items-center flex-1 px-4">
          <View className="relative mt-20">
            <Text className="text-3xl text-white font-extrabold text-center tracking-wide">
              GHARBHADA
            </Text>
            <Text className="text-white text-center mt-4 text-lg">
              Your trusted rental platform for finding the best rental
              properties.
            </Text>
          </View>

          <View className="w-full flex justify-center items-center px-4 mt-6">
            <TouchableOpacity
              className="bg-white p-3 rounded-lg flex-row items-center"
              onPress={() => router.push("/(auth)/sign-in")} // Navigate correctly
            >
              <Text className="text-blue-500 text-lg text-center mr-2">
                Sign In
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <StatusBar backgroundColor="#161622" style="light" />
    </SafeAreaView>
  );
};

export default Welcome;