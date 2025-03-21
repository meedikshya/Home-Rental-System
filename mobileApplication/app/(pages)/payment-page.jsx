import React, { useState, useEffect } from "react";
import {
  View,
  Text,
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
import ApiHandler from "../../api/ApiHandler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PaymentPage = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const insets = useSafeAreaInsets();

  const [isCheckingPayment, setIsCheckingPayment] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);

  const { agreementId, price, address, landlordName } = params;

  const API_BASE_URL =
    Platform.OS === "android"
      ? "http://10.0.2.2:5001/api/esewa"
      : "http://192.168.1.70:5001/api/esewa";

  useEffect(() => {
    if (agreementId) {
      checkPaymentCompletionStatus();
    } else {
      setIsCheckingPayment(false);
    }
  }, [agreementId]);

  const checkPaymentCompletionStatus = async () => {
    try {
      console.log("Checking payment completion for agreement:", agreementId);

      const data = await ApiHandler.get(
        `/Payments/byAgreementId/${agreementId}`,
        {
          status: "Completed",
        }
      );

      console.log("Payment data received:", data);

      if (data && data.length > 0) {
        console.log("Found completed payment:", data[0]);
        setPaymentData(data[0]);
        setIsPaymentCompleted(true);
      } else {
        console.log("No completed payments found");
      }
    } catch (error) {
      console.error("Payment status check error:", error);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const initiateEsewaPayment = async () => {
    try {
      setIsLoading(true);
      console.log(
        "Starting payment process for agreement:",
        agreementId,
        "with amount:",
        price
      );

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
        setIsPaymentCompleted(true);
        setPaymentData({
          paymentId: data.payment.id || 0,
          agreementId: agreementId,
          amount: data.payment.amount || price,
          paymentStatus: "Completed",
          paymentDate: data.payment.createdAt || new Date().toISOString(),
          transactionId: data.payment.referenceId || "N/A",
          referenceId: data.payment.referenceId || "N/A",
          paymentGateway: "eSewa",
        });

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

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isCheckingPayment) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#20319D" />
        <Text className="mt-4 text-gray-600">Checking payment status...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center py-4 px-3 border-b border-gray-200 bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#20319D" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-800 ml-3">
          Payment
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {isPaymentCompleted ? (
          // PAYMENT COMPLETED UI
          <View className="bg-white p-6 rounded-lg shadow-lg">
            {/* Success Icon */}
            <View className="items-center mb-6">
              <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center">
                <Ionicons name="checkmark-circle" size={56} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-green-600 mt-4">
                Payment Complete
              </Text>
              <Text className="text-base text-gray-600 text-center mt-1">
                Your payment has been successfully processed
              </Text>
            </View>

            {/* Divider */}
            <View className="h-0.5 bg-gray-100 my-4" />

            {/* Payment Details */}
            <View className="mt-4 space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Amount Paid</Text>
                <Text className="font-semibold">
                  Rs. {paymentData?.amount || price}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Payment Date</Text>
                <Text className="font-semibold">
                  {formatDate(paymentData?.paymentDate)}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Payment Method</Text>
                <Text className="font-semibold">
                  {paymentData?.paymentGateway || "eSewa"}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600">Status</Text>
                <Text className="font-bold text-green-600">
                  {paymentData?.paymentStatus || "Completed"}
                </Text>
              </View>
            </View>

            {/* Agreement Details */}
            <View className="bg-gray-50 p-4 rounded-lg mt-6">
              <Text className="font-semibold text-lg mb-2">
                Agreement Details
              </Text>
              <View className="space-y-2">
                {address && (
                  <Text className="text-gray-600">
                    Property: <Text className="font-semibold">{address}</Text>
                  </Text>
                )}
              </View>
            </View>

            {/* Return Button */}
            <TouchableOpacity
              className="bg-[#20319D] py-4 mt-6 rounded-lg items-center"
              onPress={() => navigation.goBack()}
            >
              <Text className="text-white font-semibold text-base">
                Return to Agreements
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // PAYMENT NOT COMPLETED UI - SHOW REGULAR PAYMENT PAGE
          <>
            {/* Payment details card */}
            <View className="bg-white p-4 rounded-lg shadow-lg mb-4">
              <Text className="text-xl font-semibold mb-4">
                Payment Details
              </Text>

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
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default PaymentPage;
