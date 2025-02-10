import { useState } from "react";
import { Link, router } from "expo-router";
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

import "nativewind";

const SignIn = () => {
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const submit = async () => {
    if (form.email === "" || form.password === "") {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      Alert.alert("Success", "User signed in successfully");
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-white flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-white">
        <View className="w-full flex justify-center items-center flex-1 px-4 my-6">
          <Text className="text-3xl text-[#20319D] font-extrabold text-center tracking-wide mt-10">
            GHARBHADA
          </Text>

          <Text className="text-2xl font-semibold text-[#20319D] mt-10">
            Log in to Gharbhada
          </Text>

          <View className="w-full mt-7">
            <Text className="text-[#20319D] text-lg mb-2">Email</Text>
            <View className="bg-[#f0f0f0] p-2 rounded-lg">
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
            <View className="bg-[#f0f0f0] p-2 rounded-lg">
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
            <Text className="text-white text-lg text-center mr-2">Sign In</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="flex justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-700">
              Don't have an account?
            </Text>
            <Link
              href="/(auth)/sign-up"
              className="text-lg font-semibold text-[#20319D]"
            >
              Signup
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
