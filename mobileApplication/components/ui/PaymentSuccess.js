import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { sendNotificationToUser } from "../../firebaseNotification.js";

const PaymentSuccess = ({
  paymentId,
  transactionId,
  amount,
  landlordId,
  renterId,
  propertyId,
  agreementId,
  address,
}) => {
  const router = useRouter();

  useEffect(() => {
    // Send notifications when component mounts
    sendPaymentNotifications();
  }, []);

  // Send payment notifications to landlord and renter
  const sendPaymentNotifications = async () => {
    try {
      console.log("Sending payment notifications with data:", {
        paymentId,
        amount,
        landlordId,
        renterId,
        propertyId,
        agreementId,
        address,
      });

      // Validate required fields before sending notifications
      if (!paymentId || !amount || !propertyId || !agreementId) {
        console.warn("Missing required fields for notification:", {
          paymentId,
          amount,
          propertyId,
          agreementId,
        });
        return;
      }

      // Format amount correctly (ensure it's a string with proper formatting)
      const formattedAmount =
        typeof amount === "number" ? amount.toFixed(2) : String(amount);

      // Send notification to landlord
      if (landlordId) {
        const notificationTitle = "Payment Received";
        const notificationBody = `Payment of Rs. ${formattedAmount} has been received for your property${
          address ? ` at ${address}` : ""
        }.`;

        const additionalData = {
          propertyId,
          agreementId,
          paymentId,
          screen: "Notification",
          action: "view_payment",
          timestamp: new Date().toISOString(),
        };

        await sendNotificationToUser(
          landlordId,
          notificationTitle,
          notificationBody,
          additionalData
        );

        console.log("Payment notification sent to landlord:", landlordId);
      }

      // Send confirmation notification to renter
      if (renterId) {
        const notificationTitle = "Payment Successful";
        const notificationBody = `Your payment of Rs. ${formattedAmount} for property${
          address ? ` at ${address}` : ""
        } has been successfully processed.`;

        const additionalData = {
          propertyId,
          agreementId,
          paymentId,
          screen: "Notification",
          action: "view_payment_receipt",
          timestamp: new Date().toISOString(),
        };

        await sendNotificationToUser(
          renterId,
          notificationTitle,
          notificationBody,
          additionalData
        );

        console.log("Payment confirmation sent to renter:", renterId);
      }
    } catch (error) {
      console.error("Error sending payment notifications:", error);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString)
      return new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
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
              <Text style={styles.detailValue}>Rs. {amount || ""}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Date</Text>
              <Text style={styles.detailValue}>
                {formatDate(new Date().toISOString())}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>eSewa</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.statusValue}>Completed</Text>
            </View>
          </View>

          {/* Agreement Details */}
          {address && (
            <View style={styles.propertyDetailsCard}>
              <Text style={styles.sectionTitle}>Property Details</Text>
              <View style={styles.propertyInfo}>
                <Text style={styles.propertyAddress}>{address}</Text>
              </View>
            </View>
          )}

          {/* Return Button */}
          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.buttonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  card: {
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

export default PaymentSuccess;
