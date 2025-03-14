import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FIREBASE_AUTH } from "../../firebaseConfig";
import ApiHandler from "../../api/ApiHandler";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Function to decode JWT token and extract role
const getUserRoleFromToken = (token) => {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));

    // Check for role claim in the token
    return (
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
      null
    );
  } catch (error) {
    console.error("Error parsing token:", error);
    return null;
  }
};

const SignIn = () => {
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const router = useRouter();

  const submit = async () => {
    // Validation
    if (!form.email.trim() || !form.password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(form.email)) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }

    setSubmitting(true);

    try {
      // Firebase authentication - Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(
        FIREBASE_AUTH,
        form.email,
        form.password
      );

      // Get Firebase ID Token
      const firebaseToken = await userCredential.user.getIdToken(true);
      console.log("Firebase Token:", firebaseToken);

      // Send email to backend for JWT
      const response = await ApiHandler.post("/auth/login", {
        Email: form.email,
        firebaseUId: userCredential.user.uid,
      });

      // Get JWT from backend response
      const jwtToken = response.token;
      console.log("JWT Token:", jwtToken);

      // Extract user role from JWT
      const userRole = getUserRoleFromToken(jwtToken);
      console.log("User role:", userRole);

      // Check if user is a Renter
      if (userRole !== "Renter") {
        // Sign out from Firebase since this app is for Renters only
        await FIREBASE_AUTH.signOut();

        // Show error message
        Alert.alert(
          "Access Denied",
          "This app is for Renters only. Please use the appropriate application for your role."
        );

        // Don't store token for non-Renters
        ApiHandler.setAuthToken(null);
        setSubmitting(false);
        return;
      }

      // Store JWT token in AsyncStorage
      await AsyncStorage.setItem("jwtToken", jwtToken);

      // Save user data including role
      const userData = {
        email: form.email,
        role: userRole,
      };
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      // Set token for future API calls using ApiHandler
      ApiHandler.setAuthToken(jwtToken);

      // Show success alert
      Alert.alert("Success", "Signed in successfully as Renter");

      // Navigate to home page (or tabs)
      router.replace("/(tabs)");
    } catch (error) {
      let errorMessage = "An unexpected error occurred.";

      // Handle Firebase and API errors
      if (error.code) {
        // Firebase-specific error handling
        if (error.code === "auth/wrong-password") {
          errorMessage = "Incorrect password.";
        } else if (error.code === "auth/user-not-found") {
          errorMessage = "User not found.";
        } else if (error.code === "auth/too-many-requests") {
          errorMessage =
            "Too many failed login attempts. Please try again later.";
        } else {
          errorMessage = error.message || errorMessage;
        }
      } else if (error.response) {
        // API error handling (from backend)
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.request) {
        errorMessage = "Network error. Please try again.";
      }

      // Display error message
      Alert.alert("Error", errorMessage);

      // Ensure token is cleared if any error occurs
      ApiHandler.setAuthToken(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-white flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-white">
        <View className="w-full flex justify-center items-center flex-1 px-4 my-6">
          <Text className="text-3xl text-[#20319D] font-extrabold text-center tracking-wide">
            GHARBHADA
          </Text>
          <Text className="text-2xl font-semibold text-[#20319D] mt-5">
            Log in to Gharbhada
          </Text>

          <View className="w-full mt-7">
            <Text className="text-[#20319D] text-lg mb-2">Email</Text>
            <View className="bg-[#f0f0f0] p-4 rounded-lg">
              <TextInput
                value={form.email}
                onChangeText={(e) => setForm({ ...form, email: e })}
                keyboardType="email-address"
                className="text-black"
                placeholder="Enter your email"
                placeholderTextColor="#888"
              />
            </View>
          </View>

          <View className="w-full mt-7">
            <Text className="text-[#20319D] text-lg mb-2">Password</Text>
            <View className="bg-[#f0f0f0] p-4 rounded-lg">
              <TextInput
                value={form.password}
                onChangeText={(e) => setForm({ ...form, password: e })}
                secureTextEntry
                className="text-black"
                placeholder="Enter your password"
                placeholderTextColor="#888"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={submit}
            className="bg-[#20319D] p-3 rounded-lg flex-row items-center mt-7"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white text-lg text-center mr-2">
                Sign In
              </Text>
            )}
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="flex justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-700">
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={() => router.push("(auth)/sign-up")}>
              <Text className="text-lg font-semibold text-[#20319D]">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
