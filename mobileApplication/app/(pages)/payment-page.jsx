import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";

const PaymentPage = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Extract parameters passed from agreement page
  const { agreementId, price, address, landlordName } = params;

  // Use appropriate API URL based on platform and environment
  const API_BASE_URL =
    Platform.OS === "android"
      ? "http://10.0.2.2:5001/api/esewa"
      : "http://192.168.1.70:5001/api/esewa";

  // Only update the initiateEsewaPayment function:

  const initiateEsewaPayment = async () => {
    try {
      setIsLoading(true);
      console.log(
        "Starting payment process for agreement:",
        agreementId,
        "with amount:",
        price
      );

      // Call your backend API to initialize payment
      const response = await fetch(
        `${API_BASE_URL}/initialize-agreement-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agreementId: agreementId,
            amount: parseFloat(price),
            uniqueSuffix: Date.now().toString(),
          }),
        }
      );

      const data = await response.json();
      console.log("Payment initialization response:", data);

      if (data.success) {
        // Get base URL without the '/api/esewa' part
        const baseUrl = API_BASE_URL.replace("/api/esewa", "");

        // Create URL to our bridge page with necessary parameters
        const bridgeUrl =
          `${baseUrl}/api/esewa/mobile-payment-bridge?` +
          `amount=${encodeURIComponent(data.paymentParams.amt)}` +
          `&pid=${encodeURIComponent(data.paymentParams.pid)}` +
          `&scd=${encodeURIComponent(data.paymentParams.scd)}` +
          `&signature=${encodeURIComponent(data.payment.signature)}` +
          `&signed_field_names=${encodeURIComponent(
            data.payment.signed_field_names
          )}`;

        console.log("Opening bridge URL:", bridgeUrl);

        // Different approach for different platforms
        let result;
        if (Platform.OS === "ios") {
          // For iOS, Safari works better with form submission
          await Linking.openURL(bridgeUrl);
          // Since we can't get the result from Linking, we'll check status later
          setTimeout(() => checkPaymentStatus(agreementId), 10000);
        } else {
          // For Android, WebBrowser works better
          result = await WebBrowser.openBrowserAsync(bridgeUrl);
          console.log("Browser result:", result);

          // Check payment status if not canceled
          if (result.type !== "cancel" && result.type !== "dismiss") {
            setTimeout(() => checkPaymentStatus(agreementId), 2000);
          }
        }
      } else {
        Alert.alert("Error", data.message || "Failed to initialize payment");
      }
    } catch (error) {
      console.error("Payment error:", error);
      Alert.alert(
        "Error",
        `Failed to process payment. Please check your network connection. (${error.message})`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const checkPaymentStatus = async (agreementId) => {
    try {
      console.log("Checking payment status for agreement:", agreementId);
      const response = await fetch(
        `${API_BASE_URL}/agreement-payment-status/${agreementId}`
      );
      const data = await response.json();
      console.log("Payment status response:", data);

      if (data.success && data.payment && data.payment.status === "Completed") {
        Alert.alert("Success", "Your payment was successful!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert(
          "Payment Pending",
          "Your payment is still being processed. Please check back later.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Payment status check error:", error);
      Alert.alert(
        "Error",
        "Could not verify payment status. Please contact support."
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header with back button */}
      <View className="flex-row items-center p-4 bg-white shadow-md">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-2xl font-semibold ml-4">Payment</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Payment details card */}
        <View className="bg-white p-4 rounded-lg shadow-lg mb-4">
          <Text className="text-xl font-semibold mb-4">Payment Details</Text>

          {agreementId && (
            <Text className="text-base mb-2">
              Agreement ID: <Text className="font-bold">{agreementId}</Text>
            </Text>
          )}

          {address && (
            <Text className="text-base mb-2">
              Property: <Text className="font-bold">{address}</Text>
            </Text>
          )}

          {price && (
            <Text className="text-base mb-2">
              Amount: <Text className="font-bold">Rs. {price}</Text>
            </Text>
          )}
        </View>

        {/* Payment method section */}
        <View className="bg-white p-4 rounded-lg shadow-lg mb-4">
          <Text className="text-xl font-semibold mb-4">
            Select Payment Method
          </Text>

          <TouchableOpacity
            className="flex-row items-center p-4 border border-gray-200 rounded-lg mb-2"
            onPress={initiateEsewaPayment}
            disabled={isLoading}
          >
            <Image
              source={{
                uri: "https://esewa.com.np/common/images/esewa_logo.png",
              }}
              style={{ width: 80, height: 40, resizeMode: "contain" }}
            />
            <Text className="ml-4 text-base font-medium flex-1">
              Pay with eSewa
            </Text>
            {isLoading ? (
              <ActivityIndicator size="small" color="#60bb46" />
            ) : (
              <Ionicons name="chevron-forward" size={24} color="#60bb46" />
            )}
          </TouchableOpacity>
        </View>

        {/* Payment information */}
        <View className="bg-white p-4 rounded-lg shadow-lg mb-4">
          <Text className="text-xl font-semibold mb-2">
            Payment Information
          </Text>
          <Text className="text-sm text-gray-600 mb-2">
            • Payment will be processed securely through eSewa
          </Text>
          <Text className="text-sm text-gray-600 mb-2">
            • You'll be redirected to the official eSewa login page
          </Text>
          <Text className="text-sm text-gray-600 mb-2">
            • Use your eSewa credentials to complete the payment
          </Text>
          <Text className="text-sm text-gray-600">
            • For any issues, please contact customer support
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentPage;
