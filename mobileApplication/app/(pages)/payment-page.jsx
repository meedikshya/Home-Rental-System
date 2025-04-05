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
  StyleSheet,
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20319D" />
        <Text style={styles.loadingText}>Checking payment status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {isPaymentCompleted ? (
          // PAYMENT COMPLETED UI
          <View style={styles.completedCard}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={56} color="#10b981" />
              </View>
              <Text style={styles.successTitle}>Payment Complete</Text>
              <Text style={styles.successSubtitle}>
                Your payment has been successfully processed
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Payment Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount Paid</Text>
                <Text style={styles.detailValue}>
                  Rs. {paymentData?.amount || price}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(paymentData?.paymentDate)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailValue}>
                  {paymentData?.paymentGateway || "eSewa"}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.statusValue}>
                  {paymentData?.paymentStatus || "Completed"}
                </Text>
              </View>
            </View>

            {/* Agreement Details */}
            <View style={styles.propertyDetailsCard}>
              <Text style={styles.sectionTitle}>Property Details</Text>
              <View style={styles.propertyInfo}>
                {address && (
                  <Text style={styles.propertyAddress}>{address}</Text>
                )}
              </View>
            </View>

            {/* Return Button */}
            <TouchableOpacity
              style={styles.returnButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.buttonText}>Return to Agreements</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // PAYMENT NOT COMPLETED UI - SHOW REGULAR PAYMENT PAGE
          <>
            {/* Payment details card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Details</Text>

              {address && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={20} color="#666" />
                  <Text style={styles.infoText}>{address}</Text>
                </View>
              )}

              {price && (
                <View style={styles.amountContainer}>
                  <Text style={styles.amountLabel}>Total Amount</Text>
                  <Text style={styles.amountValue}>Rs. {price}</Text>
                  <Text style={styles.amountSubtext}>per month</Text>
                </View>
              )}
            </View>

            {/* Payment method section */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Select Payment Method</Text>

              <TouchableOpacity
                style={styles.paymentMethodButton}
                onPress={initiateEsewaPayment}
                disabled={isLoading}
              >
                <Image
                  source={{
                    uri: "https://esewa.com.np/common/images/esewa_logo.png",
                  }}
                  style={styles.esewaLogo}
                />
                <Text style={styles.paymentMethodText}>Pay with eSewa</Text>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#60bb46" />
                ) : (
                  <Ionicons name="chevron-forward" size={24} color="#60bb46" />
                )}
              </TouchableOpacity>
            </View>

            {/* Payment information */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Information</Text>
              <View style={styles.infoContainer}>
                <View style={styles.infoItem}>
                  <Ionicons
                    name="shield-checkmark"
                    size={20}
                    color="#20319D"
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoItemText}>
                    Payment will be processed securely through eSewa
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons
                    name="swap-horizontal"
                    size={20}
                    color="#20319D"
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoItemText}>
                    You'll be redirected to the official eSewa login page
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons
                    name="log-in"
                    size={20}
                    color="#20319D"
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoItemText}>
                    Use your eSewa credentials to complete the payment
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons
                    name="help-circle"
                    size={20}
                    color="#20319D"
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoItemText}>
                    For any issues, please contact customer support
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },

  // Header Styles - matched with details-page.jsx
  headerContainer: {
    backgroundColor: "#20319D",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  headerRight: {
    width: 40,
  },

  // ScrollView Styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },

  // Card Styles
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },

  // Info Row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#4B5563",
    marginLeft: 10,
    flex: 1,
  },

  // Amount Container
  amountContainer: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#20319D",
  },
  amountSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  // Payment Method Button
  paymentMethodButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  esewaLogo: {
    width: 80,
    height: 40,
    resizeMode: "contain",
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4B5563",
    flex: 1,
    marginLeft: 16,
  },

  // Info Items
  infoContainer: {
    marginTop: 8,
  },
  infoItem: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoItemText: {
    fontSize: 15,
    color: "#4B5563",
    flex: 1,
    lineHeight: 22,
  },

  // Completed Payment
  completedCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successIconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#10B981",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 24,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981",
  },
  propertyDetailsCard: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  propertyInfo: {
    marginTop: 8,
  },
  propertyAddress: {
    fontSize: 16,
    color: "#4B5563",
    lineHeight: 24,
  },
  returnButton: {
    backgroundColor: "#20319D",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});

export default PaymentPage;
