import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import WebView from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ApiHandler from "../../api/ApiHandler";

const PaymentBridge = ({
  pid,
  amount,
  scd,
  agreementId,
  propertyId,
  landlordId,
  renterId,
  address,
  apiBaseUrl,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const paymentId = pid || params.pid;
  const paymentAmount = amount || params.amount;
  const productCode = scd || params.scd;

  // Extra params
  const propId = propertyId || params.propertyId;
  const landId = landlordId || params.landlordId;
  const rentId = renterId || params.renterId;
  const propAddress = address || params.address;
  const agreeId = agreementId || params.agreementId;

  useEffect(() => {
    fetchPaymentParams();
  }, [paymentId, paymentAmount, productCode]);

  const fetchPaymentParams = async () => {
    try {
      setLoading(true);

      if (!paymentId || !paymentAmount || !productCode) {
        throw new Error("Missing required payment parameters");
      }

      if (apiBaseUrl) {
        console.log("Using API Base URL:", apiBaseUrl);
        const response = await fetch(
          `${apiBaseUrl}/esewa/payment-params?pid=${encodeURIComponent(
            paymentId
          )}&amount=${encodeURIComponent(
            paymentAmount
          )}&scd=${encodeURIComponent(productCode)}`
        );

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.formParams) {
          setFormData(data.formParams);
        } else {
          const errorMsg = data.message || "Failed to get payment parameters";
          setError(errorMsg);
          if (onError) onError({ message: errorMsg });
        }
      } else {
        console.log("Using ApiHandler for payment params");
        const response = await ApiHandler.get(
          `/esewa/payment-params?pid=${encodeURIComponent(
            paymentId
          )}&amount=${encodeURIComponent(
            paymentAmount
          )}&scd=${encodeURIComponent(productCode)}`
        );

        if (response.success && response.formParams) {
          setFormData(response.formParams);
        } else {
          const errorMsg =
            response.message || "Failed to get payment parameters";
          setError(errorMsg);
          if (onError) onError({ message: errorMsg });
        }
      }
    } catch (error) {
      console.error("Error fetching payment parameters:", error);
      const errorMsg = error.message || "Network error. Please try again.";
      setError(errorMsg);
      if (onError) onError({ message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentCancel = () => {
    if (!processingPayment) {
      if (onCancel) {
        onCancel();
      } else {
        router.back();
      }
    }
  };

  const handleNavigationStateChange = (navState) => {
    const url = navState.url;
    console.log("WebView navigating to:", url);

    if (url.includes("esewa.com.np")) {
      setProcessingPayment(true);
    }

    if (url.includes("/complete-payment") || url.includes("/payment-success")) {
      try {
        const dataParam = url.includes("?data=")
          ? decodeURIComponent(url.split("?data=")[1].split("&")[0])
          : null;

        const paymentResult = {
          paymentId: paymentId,
          transactionId: dataParam ? "pending-verification" : "pending",
          amount: paymentAmount,
          agreementId: agreeId,
          propertyId: propId,
          landlordId: landId,
          renterId: rentId,
          address: propAddress,
          paymentDate: new Date().toISOString(),
          paymentStatus: "Completed",
          paymentGateway: "eSewa",
        };

        if (onSuccess) {
          onSuccess(paymentResult);
        } else {
          router.push({
            pathname: "/(pages)/payment-success",
            params: {
              paymentId: paymentId,
              transactionId: dataParam ? "pending-verification" : "pending",
              amount: paymentAmount,
              data: dataParam,
              agreementId: agreeId,
              propertyId: propId,
              landlordId: landId,
              renterId: rentId,
              address: propAddress,
            },
          });
        }
      } catch (e) {
        console.error("Error handling success navigation:", e);
        router.push({
          pathname: "/(pages)/payment-success",
          params: {
            paymentId: paymentId,
            amount: paymentAmount,
            agreementId: agreeId,
          },
        });
      }
      return false;
    }

    if (url.includes("/payment-failed") || url.includes("/payment-error")) {
      let errorMsg = "Payment was unsuccessful. Please try again.";

      try {
        if (url.includes("message=")) {
          errorMsg = decodeURIComponent(url.split("message=")[1].split("&")[0]);
        }
      } catch (err) {
        console.error("Error parsing error message from URL:", err);
      }

      if (onError) {
        onError({ message: errorMsg, paymentId: paymentId });
      } else {
        router.push({
          pathname: "/(pages)/payment-error",
          params: {
            paymentId: paymentId,
            message: errorMsg,
            agreementId: agreeId,
          },
        });
      }
      return false;
    }

    return true;
  };

  const generateWebViewContent = () => {
    if (!formData) return "";

    const {
      formAction,
      amount,
      tax_amount,
      total_amount,
      transaction_uuid,
      product_code,
      product_service_charge,
      product_delivery_charge,
      success_url,
      failure_url,
      signed_field_names,
      signature,
    } = formData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>eSewa Payment</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background-color: #f8f8f8;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .loading { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
          }
          .spinner { 
            border: 5px solid #f3f3f3; 
            border-top: 5px solid #60bb46; 
            border-radius: 50%; 
            width: 50px; 
            height: 50px; 
            animation: spin 1s linear infinite; 
          }
          @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
          }
        </style>
      </head>
      <body>
        <div class="loading">
          <img src="https://esewa.com.np/common/images/esewa_logo.png" width="120" style="margin-bottom: 20px;">
          <h2>Connecting to eSewa</h2>
          <div class="spinner"></div>
          <p>Please wait while we connect you to eSewa...</p>
        </div>
        
        <form id="esewaForm" action="${formAction}" method="POST">
          <input type="hidden" name="amount" value="${amount}" />
          <input type="hidden" name="tax_amount" value="${tax_amount}" />
          <input type="hidden" name="total_amount" value="${total_amount}" />
          <input type="hidden" name="transaction_uuid" value="${transaction_uuid}" />
          <input type="hidden" name="product_code" value="${product_code}" />
          <input type="hidden" name="product_service_charge" value="${product_service_charge}" />
          <input type="hidden" name="product_delivery_charge" value="${product_delivery_charge}" />
          <input type="hidden" name="success_url" value="${success_url}" />
          <input type="hidden" name="failure_url" value="${failure_url}" />
          <input type="hidden" name="signed_field_names" value="${signed_field_names}" />
          <input type="hidden" name="signature" value="${signature}" />
        </form>
        
        <script>
          // Submit form automatically
          window.onload = function() {
            setTimeout(function() {
              document.getElementById('esewaForm').submit();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handlePaymentCancel}
            disabled={processingPayment}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>eSewa Payment</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#60bb46" />
          <Text style={styles.loadingText}>Preparing secure payment...</Text>
          <Text style={styles.loadingSubtext}>Amount: Rs. {paymentAmount}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handlePaymentCancel}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Error</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#e53e3e" />
          <Text style={styles.errorTitle}>Payment Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={handlePaymentCancel}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchPaymentParams}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main component with WebView
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handlePaymentCancel}
          disabled={processingPayment}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>eSewa Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.webViewContainer}>
        <WebView
          source={{ html: generateWebViewContent() }}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color="#60bb46" />
              <Text style={styles.loadingText}>Loading eSewa...</Text>
            </View>
          )}
          onError={(e) => {
            console.error("WebView error:", e);
            setError(`Connection error: ${e.nativeEvent.description}`);
          }}
        />
      </View>

      {processingPayment && <View style={styles.processingOverlay}></View>}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "white",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e53e3e",
    marginTop: 16,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#60bb46",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#60bb46",
  },
  retryButtonText: {
    color: "#60bb46",
    fontSize: 16,
    fontWeight: "600",
  },
  webViewContainer: {
    flex: 1,
  },
  webViewLoading: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  processingOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
  },
  processingText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  processingSubtext: {
    color: "white",
    fontSize: 14,
  },
});

export default PaymentBridge;
