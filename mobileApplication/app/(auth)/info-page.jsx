import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import ApiHandler from "../../api/ApiHandler";

const InfoPage = () => {
  const router = useRouter();
  const { userId } = useLocalSearchParams(); // Ensure this is correctly passed
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!firstName || !lastName || !phone || !address) {
      setError("Please fill in all fields.");
      return;
    }

    setError(""); // Clear previous errors

    try {
      const response = await ApiHandler.post("/UserDetails", {
        userId,
        firstName,
        lastName,
        phone,
        address,
      });

      console.log("User details saved:", response);
      Alert.alert("Success", "Your information has been saved successfully!");

      router.push("/(auth)/sign-in"); // Ensure correct redirection
    } catch (error) {
      console.error("Error saving user details:", error);
      setError(
        error.response?.data?.message ||
          "Failed to save user details. Please try again."
      );
    }
  };

  return (
    <SafeAreaView className="bg-white flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-white">
        <View className="w-full flex justify-center items-center flex-1 px-4 my-6">
          <Text className="text-3xl text-[#20319D] font-extrabold text-center tracking-wide">
            GHARBHADA
          </Text>

          {/* <Text className="text-2xl font-semibold text-[#20319D] mt-5">
            Fill Your Information
          </Text> */}

          <Text className="text-lg text-[#20319D] mt-4 text-center px-6">
            To complete your registration and sign in, please provide your first
            name, last name, phone number, and address.
          </Text>

          <View className="w-full mt-7">
            <Text className="text-[#20319D] text-lg mb-2">First Name</Text>
            <View className="bg-[#f0f0f0] p-4 rounded-lg">
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                className="text-black"
                placeholder="Enter your first name"
              />
            </View>
          </View>

          <View className="w-full mt-7">
            <Text className="text-[#20319D] text-lg mb-2">Last Name</Text>
            <View className="bg-[#f0f0f0] p-4 rounded-lg">
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                className="text-black"
                placeholder="Enter your last name"
              />
            </View>
          </View>

          <View className="w-full mt-7">
            <Text className="text-[#20319D] text-lg mb-2">Phone Number</Text>
            <View className="bg-[#f0f0f0] p-4 rounded-lg">
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                className="text-black"
                placeholder="Enter your phone number"
              />
            </View>
          </View>

          <View className="w-full mt-7">
            <Text className="text-[#20319D] text-lg mb-2">Address</Text>
            <View className="bg-[#f0f0f0] p-4 rounded-lg">
              <TextInput
                value={address}
                onChangeText={setAddress}
                className="text-black"
                placeholder="Enter your address"
              />
            </View>
          </View>

          {error && (
            <View className="w-full mt-4">
              <Text className="text-red-500 text-center">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-[#20319D] p-3 rounded-lg flex-row items-center mt-7"
          >
            <Text className="text-white text-lg text-center mr-2">Submit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default InfoPage;
