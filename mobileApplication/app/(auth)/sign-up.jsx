import { useState, useEffect } from "react";
import { Link, useRouter } from "expo-router";
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
import { createUserWithEmailAndPassword } from "firebase/auth";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import ApiHandler from "../../api/ApiHandler";
import { hashPassword } from "../../utils/passwordUtils.js";

const SignUp = () => {
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const router = useRouter();

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (!form.password) {
      setPasswordValidation({
        hasMinLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
      });
      setPasswordStrength(0);
      return;
    }

    const validation = {
      hasMinLength: form.password.length >= 8,
      hasUpperCase: /[A-Z]/.test(form.password),
      hasLowerCase: /[a-z]/.test(form.password),
      hasNumber: /[0-9]/.test(form.password),
      hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.password),
    };

    setPasswordValidation(validation);
    const strength = Object.values(validation).filter(Boolean).length;
    setPasswordStrength(strength);
  }, [form.password]);

  const submit = async () => {
    setEmailError("");
    setPasswordError("");

    if (!form.email.trim() || !form.password.trim()) {
      if (!form.email.trim()) {
        setEmailError("Email is required");
      }
      if (!form.password.trim()) {
        setPasswordError("Password is required");
      }
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(form.email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (passwordStrength < 3) {
      setPasswordError(
        "Your password must contain at least 8 characters, uppercase, lowercase, numbers, and special characters"
      );
      return;
    }

    setSubmitting(true);

    try {
      const finalHashedPassword = await hashPassword(form.password);

      const userCredential = await createUserWithEmailAndPassword(
        FIREBASE_AUTH,
        form.email,
        form.password
      );

      const firebaseUserId = userCredential.user.uid;

      await setDoc(doc(FIREBASE_DB, "users", firebaseUserId), {
        email: form.email,
        userRole: "Renter",
        firebaseUId: firebaseUserId,
        createdAt: new Date(),
      });

      const response = await ApiHandler.post("/Users", {
        email: form.email,
        passwordHash: finalHashedPassword,
        userRole: "Renter",
        firebaseUId: firebaseUserId,
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
      console.error("Error:", error);

      let errorMessage = "An error occurred during registration";

      if (error.code === "auth/email-already-in-use") {
        setEmailError("Email already in use");
        errorMessage = "This email is already registered";
      } else if (error.code === "auth/weak-password") {
        setPasswordError("Weak password");
        errorMessage = "Please choose a stronger password";
      } else if (error.code === "auth/invalid-email") {
        setEmailError("Invalid email");
        errorMessage = "Please enter a valid email address";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
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
            Register to Gharbhada
          </Text>

          <View className="w-full mt-7">
            <Text className="text-[#20319D] text-lg mb-2">Email</Text>
            <View
              className={`bg-[#f0f0f0] p-4 rounded-lg ${
                emailError ? "border border-red-500" : ""
              }`}
            >
              <TextInput
                value={form.email}
                onChangeText={(e) => {
                  setForm({ ...form, email: e });
                  setEmailError("");
                }}
                keyboardType="email-address"
                className="text-black"
                placeholder="Enter your email"
                placeholderTextColor="#888"
              />
            </View>
            {emailError ? (
              <Text className="text-red-500 mt-1 text-xs">{emailError}</Text>
            ) : null}
          </View>

          <View className="w-full mt-5">
            <Text className="text-[#20319D] text-lg mb-2">Password</Text>
            <View
              className={`bg-[#f0f0f0] p-4 rounded-lg ${
                passwordError ? "border border-red-500" : ""
              }`}
            >
              <TextInput
                value={form.password}
                onChangeText={(e) => {
                  setForm({ ...form, password: e });
                  setPasswordError("");
                }}
                secureTextEntry
                className="text-black"
                placeholder="Enter your password"
                placeholderTextColor="#888"
              />
            </View>
            {passwordError ? (
              <Text className="text-red-500 mt-1 text-xs">{passwordError}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={submit}
            className="bg-[#20319D] p-3 rounded-lg flex-row items-center justify-center w-full mt-7"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text className="text-white text-lg text-center mr-2">
                  Sign Up
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <View className="flex justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-700">
              Already have an account?
            </Text>
            <Link
              href="/(auth)/sign-in"
              className="text-lg font-semibold text-[#20319D]"
            >
              Sign In
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;
