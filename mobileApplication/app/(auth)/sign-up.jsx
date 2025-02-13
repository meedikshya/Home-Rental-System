import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { FIREBASE_AUTH } from "../../firebaseConfig";
import ApiHandler from "../../api/ApiHandler";

const SignUp = () => {
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const router = useRouter();

  const submit = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setSubmitting(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        FIREBASE_AUTH,
        form.email,
        form.password
      );

      const response = await ApiHandler.post("/Users", {
        email: form.email,
        passwordHash: form.password,
        userRole: "Renter",
      });

      if (response && response.userId) {
        Alert.alert("Success", "User registered successfully");
        router.replace({
          pathname: "/(auth)/info-page",
          params: { userId: response.userId },
        });
      } else {
        throw new Error("Unexpected API response format.");
      }
    } catch (error) {
      console.error("API Error:", error);
      Alert.alert("Error", error.response?.data?.message || error.message);
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
            Register in to Gharbhada
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
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={submit}
            className="bg-[#20319D] p-3 rounded-lg flex-row items-center mt-7"
            disabled={isSubmitting}
          >
            <Text className="text-white text-lg text-center mr-2">Sign Up</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="flex justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-700">
              Already have an account?
            </Text>
            <Link
              href="/(auth)/sign-in"
              className="text-lg font-semibold text-[#20319D]"
            >
              Sign in
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;
