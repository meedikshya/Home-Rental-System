import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";

const PaymentPage = () => {
  const { agreementId, amount } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [showWebView, setShowWebView] = useState(false);
  const webViewRef = useRef(null);

  // Hardcoded renter ID for testing - replace with actual user ID in production
  const renterId = 30;

  const initiatePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:5001/api/payments/initiate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agreementId: parseInt(agreementId),
            renterId: renterId,
            amount: parseFloat(amount),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("Payment initiated:", data);
        setPaymentData(data);
        setShowWebView(true);
      } else {
        Alert.alert("Error", data.error || "Could not initiate payment");
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      Alert.alert("Error", "Payment service unavailable");
    } finally {
      setLoading(false);
    }
  };

  // Handle WebView navigation changes
  const handleNavigationStateChange = (navState) => {
    const { url } = navState;
    console.log("WebView navigating to:", url);

    if (url.includes("/api/payments/success")) {
      setShowWebView(false);
      Alert.alert("Success", "Payment completed successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } else if (url.includes("/api/payments/failure")) {
      setShowWebView(false);
      Alert.alert("Failed", "Payment was not successful", [
        { text: "Try Again", onPress: () => setShowWebView(false) },
        { text: "Cancel", onPress: () => router.back() },
      ]);
    }
  };

  // Generate HTML for eSewa form submission
  const generateHtml = (esewaParams, esewaUrl) => {
    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial; text-align: center; padding-top: 50px; }
          </style>
        </head>
        <body>
          <p>Connecting to eSewa...</p>
          
          <form id="esewaForm" method="POST" action="${esewaUrl}">
            <input type="hidden" name="amt" value="${esewaParams.amt}" />
            <input type="hidden" name="psc" value="${esewaParams.psc}" />
            <input type="hidden" name="pdc" value="${esewaParams.pdc}" />
            <input type="hidden" name="txAmt" value="${esewaParams.txAmt}" />
            <input type="hidden" name="tAmt" value="${esewaParams.tAmt}" />
            <input type="hidden" name="pid" value="${esewaParams.pid}" />
            <input type="hidden" name="scd" value="${esewaParams.scd}" />
            <input type="hidden" name="su" value="${esewaParams.su}" />
            <input type="hidden" name="fu" value="${esewaParams.fu}" />
          </form>
          
          <script>
            document.getElementById('esewaForm').submit();
          </script>
        </body>
      </html>
    `;
  };

  if (showWebView && paymentData) {
    return (
      <WebView
        source={{
          html: generateHtml(paymentData.esewaParams, paymentData.esewaUrl),
        }}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        )}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Details</Text>

      <View style={styles.detailsContainer}>
        <View style={styles.row}>
          <Text style={styles.label}>Agreement ID:</Text>
          <Text style={styles.value}>#{agreementId}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Amount:</Text>
          <Text style={styles.value}>Rs. {parseFloat(amount).toFixed(2)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Payment Method:</Text>
          <Text style={styles.value}>eSewa</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.payButton}
        onPress={initiatePayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.payButtonText}>Pay Now</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f9f9f9",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  detailsContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  label: {
    fontSize: 16,
    color: "#666",
  },
  value: {
    fontSize: 16,
    fontWeight: "bold",
  },
  payButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 5,
    width: "90%",
    alignItems: "center",
    marginBottom: 15,
  },
  payButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 5,
    width: "90%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 18,
  },
  loaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
});

export default PaymentPage;
