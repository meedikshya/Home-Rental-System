import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import ApiHandler from "../../api/ApiHandler";
import { getUserDataFromFirebase } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

const MyPayments = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [payments, setPayments] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [landlordNames, setLandlordNames] = useState({});

  // Fetch user ID from Firebase
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const userId = await getUserDataFromFirebase();
        if (userId) {
          setCurrentUserId(userId);
        } else {
          Alert.alert("Error", "Unable to fetch user ID.");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert("Error", "Unable to fetch user data.");
      }
    };

    fetchCurrentUserId();
  }, []);

  // Fetch landlord name for a given landlord ID
  const fetchLandlordName = async (landlordId) => {
    try {
      if (!landlordId) return "Unknown Owner";

      const userDetailsResponse = await ApiHandler.get(
        `/UserDetails/userId/${landlordId}`
      );
      if (userDetailsResponse) {
        const { firstName, lastName } = userDetailsResponse;
        return `${firstName} ${lastName}`;
      }
      return "Unknown Owner";
    } catch (error) {
      console.error(
        `Error fetching landlord details for ID ${landlordId}:`,
        error
      );
      return "Unknown Owner";
    }
  };

  // Fetch payments with property details when user ID is available
  const fetchPayments = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // Use the API endpoint that returns both payment and property in one call
      const response = await ApiHandler.get(
        `/Payments/completed-by-renter-with-property/${currentUserId}`
      );

      if (response && Array.isArray(response)) {
        setPayments(response);

        // Fetch landlord names for all properties
        const landlordIds = [
          ...new Set(response.map((item) => item.property.landlordId)),
        ];
        const landlordNamePromises = {};

        for (const id of landlordIds) {
          landlordNamePromises[id] = fetchLandlordName(id);
        }

        // Resolve all promises
        const resolvedNames = {};
        for (const id of landlordIds) {
          resolvedNames[id] = await landlordNamePromises[id];
        }

        setLandlordNames(resolvedNames);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      Alert.alert(
        "Error",
        "Failed to fetch payment history. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  // Fetch data when component mounts or when user ID changes
  useEffect(() => {
    if (currentUserId) {
      fetchPayments();
    }
  }, [currentUserId, fetchPayments]);

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        fetchPayments();
      }
    }, [currentUserId, fetchPayments])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayments();
  }, [fetchPayments]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format short date for display
  const formatShortDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    const month = date.toLocaleString("default", { month: "short" });
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month} ${day}, ${year}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading your payment history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment History</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {payments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <FontAwesome5
                name="file-invoice-dollar"
                size={40}
                color="#4F46E5"
              />
            </View>
            <Text style={styles.emptyTitle}>No Payment History</Text>
            <Text style={styles.emptyText}>
              You haven't made any payments yet. Your payment history will
              appear here once you complete a payment.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Recent Payments{" "}
              <Text style={styles.paymentCount}>{payments.length}</Text>
            </Text>

            {payments.map((item) => {
              // The new API returns payment and property as separate objects
              const payment = item.payment;
              const property = item.property;
              const landlordName =
                landlordNames[property.landlordId] || "Loading...";

              return (
                <View key={payment.paymentId} style={styles.paymentCard}>
                  {/* Status badge */}
                  <View style={styles.statusTag}>
                    <Text style={styles.statusTagText}>
                      {payment.paymentStatus}
                    </Text>
                  </View>

                  {/* Payment Amount */}
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountValue}>Rs. {payment.amount}</Text>
                    <Text style={styles.dateText}>
                      {formatShortDate(payment.paymentDate)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  {/* Property Details */}
                  <View style={styles.detailsSection}>
                    <View style={styles.detailRow}>
                      <View style={styles.iconContainer}>
                        <Ionicons
                          name="home-outline"
                          size={18}
                          color="#4F46E5"
                        />
                      </View>
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Property</Text>
                        <Text style={styles.detailValue} numberOfLines={1}>
                          {property.title}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <View style={styles.iconContainer}>
                        <Ionicons
                          name="location-outline"
                          size={18}
                          color="#4F46E5"
                        />
                      </View>
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Location</Text>
                        <Text style={styles.detailValue} numberOfLines={1}>
                          {property.city}, {property.municipality}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <View style={styles.iconContainer}>
                        <Ionicons
                          name="person-outline"
                          size={18}
                          color="#4F46E5"
                        />
                      </View>
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Owner</Text>
                        <Text style={styles.detailValue}>{landlordName}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <View style={styles.iconContainer}>
                        <Ionicons
                          name="card-outline"
                          size={18}
                          color="#4F46E5"
                        />
                      </View>
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Payment Method</Text>
                        <Text style={styles.detailValue}>
                          {payment.paymentGateway || "eSewa"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* eSewa Logo */}
                  {payment.paymentGateway === "eSewa" && (
                    <Image
                      source={{
                        uri: "https://esewa.com.np/common/images/esewa_logo.png",
                      }}
                      style={styles.gatewayLogo}
                      resizeMode="contain"
                    />
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerContainer: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 3,
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
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginTop: 60,
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
    marginTop: 8,
  },
  paymentCount: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "600",
    backgroundColor: "#F3F4FF",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  paymentCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
  },
  statusTag: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  amountContainer: {
    marginBottom: 16,
    paddingBottom: 16,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: "#6B7280",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 16,
  },
  detailsSection: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F3F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  gatewayLogo: {
    width: 60,
    height: 24,
    alignSelf: "flex-end",
    marginTop: 8,
  },
});

export default MyPayments;
