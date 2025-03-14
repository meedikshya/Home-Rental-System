import { Text, View, TouchableOpacity, Image, Alert } from "react-native";
import React from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { FIREBASE_AUTH } from "../../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiHandler from "../../api/ApiHandler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Profile = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    try {
      await signOut(FIREBASE_AUTH);

      await AsyncStorage.removeItem("jwtToken");

      ApiHandler.setAuthToken(null);

      Alert.alert("Success", "User logged out successfully");

      router.replace("/(auth)/sign-in");
    } catch (error) {
      console.error("Logout failed: ", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="bg-[#20319D] p-4 items-center">
        <Text className="text-white text-2xl font-bold">Profile</Text>
      </View>
      <View className="items-center mt-8">
        <Image
          source={{ uri: "https://via.placeholder.com/150" }}
          className="w-36 h-36 rounded-full mb-4"
        />
        <Text className="text-2xl font-semibold text-gray-800">John Doe</Text>
        <Text className="text-gray-600">johndoe@example.com</Text>
      </View>
      <TouchableOpacity
        className="flex-row items-center bg-[#20319D] py-3 px-6 rounded-full mt-8 self-center"
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={24} color="white" />
        <Text className="text-white text-lg ml-2">Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Profile;
