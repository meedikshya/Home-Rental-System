import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PaymentError = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { message } = params;
  const errorMessage = message || "An error occurred during payment processing";

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)")}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Failed</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="close-circle" size={100} color="#ef4444" />
        </View>

        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.subtitle}>{errorMessage}</Text>

        <View style={styles.card}>
          <Text style={styles.errorInfo}>
            We couldn't process your payment. This could be due to:
          </Text>
          <View style={styles.bulletPoint}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>
              Insufficient balance in your eSewa account
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>
              Connection issues during the transaction
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>
              Your payment was declined by the payment service
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/(tabs)")}
        >
          <Text style={styles.secondaryButtonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#ef4444",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  errorIconContainer: {
    marginVertical: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 32,
  },
  errorInfo: {
    fontSize: 16,
    color: "#111827",
    marginBottom: 16,
  },
  bulletPoint: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    marginRight: 12,
  },
  bulletText: {
    fontSize: 15,
    color: "#4B5563",
    flex: 1,
  },
  button: {
    backgroundColor: "#20319D",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    color: "#4B5563",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default PaymentError;
