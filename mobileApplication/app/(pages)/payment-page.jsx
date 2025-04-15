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
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import ApiHandler from "../../api/ApiHandler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendNotificationToUser } from "../../firebaseNotification.js";
import PaymentBridge from "../../components/ui/PaymentBridge.js";
import PaymentSuccess from "../../components/ui/PaymentSuccess.js";
import PaymentError from "../../components/ui/PaymentError.js";

const PAYMENT_STATES = {
  INITIAL: "initial",
  PROCESSING: "processing",
  SUCCESS: "success",
  ERROR: "error",
};

const API_BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:5001/api"
    : "http://100.64.246.118:5001/api";

const PaymentPage = () => {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // UI state management
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(true);

  // Payment flow state management
  const [paymentState, setPaymentState] = useState(PAYMENT_STATES.INITIAL);
  const [paymentData, setPaymentData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // For eSewa payment parameters
  const [esewaParams, setEsewaParams] = useState(null);

  // Extract parameters from URL
  const {
    agreementId,
    price,
    address,
    landlordId,
    renterId,
    propertyId,
    bookingId,
  } = params;

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
        setPaymentState(PAYMENT_STATES.SUCCESS);
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
        price,
        "and booking id:",
        bookingId
      );

      const response = await fetch(
        `${API_BASE_URL}/esewa/initialize-agreement-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agreementId: agreementId,
            amount: parseFloat(price),
            uniqueSuffix: Date.now().toString().slice(-6),
            bookingId: bookingId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Payment initialization response:", data);

      if (data.success) {
        setEsewaParams({
          pid: data.paymentParams.pid,
          amount: data.paymentParams.amt,
          scd: data.paymentParams.scd,
          signature: data.payment.signature,
          signed_field_names: data.payment.signed_field_names,
          agreementId,
          propertyId,
          landlordId,
          renterId,
          bookingId,
          address,
          apiBaseUrl: API_BASE_URL,
        });

        // Show payment bridge component
        setPaymentState(PAYMENT_STATES.PROCESSING);
      } else {
        setErrorMessage(data.message || "Failed to initialize payment");
        setPaymentState(PAYMENT_STATES.ERROR);
      }
    } catch (error) {
      console.error("Payment error:", error);
      setErrorMessage(error.message || "Failed to process payment");
      setPaymentState(PAYMENT_STATES.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPaymentStatus = async (paymentId) => {
    try {
      console.log(
        "Checking payment status for id:",
        paymentId,
        "using agreement:",
        agreementId
      );

      if (!agreementId) {
        console.warn("No agreement ID available for payment verification");
        return null;
      }

      // Get payments data directly using ApiHandler
      // ApiHandler already handles response status internally, so we get data directly
      const payments = await ApiHandler.get(
        `/Payments/byAgreementId/${agreementId}`,
        {
          status: "Completed",
        }
      );

      console.log("Payments found for agreement:", payments);

      if (payments && payments.length > 0) {
        // Try to find the specific payment we're looking for
        const targetPayment = payments.find((p) => p.paymentId == paymentId);

        // If found, use it, otherwise use the most recent payment
        const verifiedPayment = targetPayment || payments[0];

        console.log("Verified payment:", verifiedPayment);
        setPaymentData(verifiedPayment);
        setPaymentState(PAYMENT_STATES.SUCCESS);
        return verifiedPayment;
      }

      console.log("No payments found for agreement:", agreementId);
      return null;
    } catch (error) {
      console.error("Payment status check error:", error);
      return null;
    }
  };
  // For direct booking status update if needed
  const updateBookingStatusDirectly = async (bookingId) => {
    try {
      if (!bookingId) {
        console.warn("No booking ID provided for direct update");
        return false;
      }

      console.log("Directly updating booking status for ID:", bookingId);

      // Use the direct endpoint we created
      const response = await fetch(
        `${API_BASE_URL}/esewa/updateBookingStatus`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: bookingId,
            status: "Approved",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Booking status update result:", result);
      return true;
    } catch (error) {
      console.error("Error updating booking status directly:", error);
      return false;
    }
  };

  const handlePaymentSuccess = async (paymentResult) => {
    console.log("Payment successful:", paymentResult);

    // Verify payment with backend if we have payment ID
    if (paymentResult && paymentResult.paymentId) {
      const verifiedPayment = await checkPaymentStatus(paymentResult.paymentId);
      if (verifiedPayment) {
        setPaymentData({
          ...paymentResult,
          ...verifiedPayment,
          // Ensure paymentId is set
          paymentId: verifiedPayment.paymentId || paymentResult.paymentId,
        });

        // Update booking status if needed - though it should already be done in backend
        if (bookingId) {
          // Only as a backup if backend fails
          await updateBookingStatusDirectly(bookingId);
        }
      } else {
        setPaymentData(paymentResult);
      }
    } else {
      setPaymentData(paymentResult);
    }

    setPaymentState(PAYMENT_STATES.SUCCESS);
  };

  // Handle payment error from PaymentBridge component
  const handlePaymentError = (error) => {
    console.error("Payment failed:", error);
    setErrorMessage(error.message || "Payment failed");
    setPaymentState(PAYMENT_STATES.ERROR);
  };

  // Go back to initial payment state
  const handleReturnToPayment = () => {
    setPaymentState(PAYMENT_STATES.INITIAL);
  };

  // Loading state
  if (isCheckingPayment) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20319D" />
        <Text style={styles.loadingText}>Checking payment status...</Text>
      </View>
    );
  }

  // Render based on payment state
  if (paymentState === PAYMENT_STATES.PROCESSING && esewaParams) {
    return (
      <PaymentBridge
        {...esewaParams}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        onCancel={handleReturnToPayment}
      />
    );
  }

  if (paymentState === PAYMENT_STATES.SUCCESS && paymentData) {
    // Log what we're passing to the success component
    console.log("Rendering PaymentSuccess with data:", {
      paymentId: paymentData?.paymentId || "",
      transactionId:
        paymentData?.transactionId || paymentData?.referenceId || "",
      amount: paymentData?.amount || price,
      landlordId,
      renterId,
      propertyId,
      agreementId,
      bookingId,
      address,
    });

    return (
      <PaymentSuccess
        paymentId={paymentData?.paymentId || ""}
        transactionId={
          paymentData?.transactionId || paymentData?.referenceId || ""
        }
        amount={paymentData?.amount || price}
        landlordId={landlordId}
        renterId={renterId}
        propertyId={propertyId}
        agreementId={agreementId}
        bookingId={bookingId}
        address={address}
      />
    );
  }

  // Show Error component
  if (paymentState === PAYMENT_STATES.ERROR) {
    return (
      <PaymentError
        message={errorMessage}
        paymentId={paymentData?.paymentId || ""}
        agreementId={agreementId}
      />
    );
  }

  // Default view - Payment options and initial info
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
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
});

export default PaymentPage;
