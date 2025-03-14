import { StatusBar } from "expo-status-bar";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import "nativewind";

const Welcome = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-[#20319D] flex-1" style={{ paddingTop: insets.top }}>
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
              onPress={() => router.push("/(auth)/sign-in")}
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
    </View>
  );
};

export default Welcome;
