import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import ApiHandler from "../../api/ApiHandler";
import { getUserDataFromFirebase } from "../../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Add the standalonePage prop with default value true
const ExpiredAgreementsScreen = ({ standalonePage = true }) => {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchExpiredAgreements();
  }, []);

  const fetchExpiredAgreements = async () => {
    try {
      setLoading(true);

      // Get the current user's ID directly using the function from AuthContext
      const renterId = await getUserDataFromFirebase();

      if (!renterId) {
        console.log("Could not retrieve user ID");
        setLoading(false);
        setAgreements([]);
        return;
      }

      console.log("Fetching expired agreements for renter ID:", renterId);

      // Use the direct API endpoint that filters by renter ID
      const expiredAgreements = await ApiHandler.get(
        `/Agreements/expired-by-renter/${renterId}`
      );

      if (!expiredAgreements || expiredAgreements.length === 0) {
        console.log("No expired agreements found for this user");
        setAgreements([]);
        setLoading(false);
        return;
      }

      console.log(`Found ${expiredAgreements.length} expired agreements`);

      // Fetch additional data for each agreement
      const agreementsWithDetails = await Promise.all(
        expiredAgreements.map(async (agreement) => {
          try {
            const booking = await ApiHandler.get(
              `/Bookings/${agreement.bookingId}`
            );
            if (!booking) return null;

            const property = await ApiHandler.get(
              `/Properties/${booking.propertyId}`
            );
            if (!property) return null;

            // Fetch landlord name if available
            let landlordName = "Property Owner";
            if (property.landlordId) {
              try {
                const landlordDetails = await ApiHandler.get(
                  `/UserDetails/userId/${property.landlordId}`
                );
                if (landlordDetails) {
                  landlordName = `${landlordDetails.firstName || ""} ${
                    landlordDetails.lastName || ""
                  }`.trim();
                }
              } catch (error) {
                console.error("Error fetching landlord details:", error);
              }
            }

            return {
              ...agreement,
              property: property,
              booking: booking,
              address: `${property.city || ""}, ${
                property.municipality || ""
              } - ${property.ward || ""}`,
              landlordName: landlordName,
            };
          } catch (error) {
            console.error(
              `Error fetching details for agreement ${agreement.agreementId}:`,
              error
            );
            return null;
          }
        })
      );

      const validAgreements = agreementsWithDetails.filter(Boolean);
      console.log(
        `Successfully processed ${validAgreements.length} agreements with details`
      );

      setAgreements(validAgreements);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching expired agreements:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to load expired agreements.");
    }
  };

  // The rest of your code remains the same...
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Create a function to render content
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20319D" />
          <Text style={styles.loadingText}>Loading expired agreements...</Text>
        </View>
      );
    } else if (agreements.length > 0) {
      return (
        <FlatList
          data={agreements}
          keyExtractor={(item) => item.agreementId.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/(pages)/agreement-page",
                  params: {
                    propertyId: item.property.propertyId,
                    landlordId: item.property.landlordId,
                    bookingId: item.bookingId,
                    renterId: item.renterId,
                    image: item.property.image,
                    address: item.address,
                    landlordName: item.landlordName || "Property Owner",
                    bedrooms: item.property.totalBedrooms,
                    bathrooms: item.property.totalWashrooms,
                    kitchen: item.property.totalKitchens,
                    price: item.property.price,
                    agreementId: item.agreementId,
                    startDate: item.startDate,
                    endDate: item.endDate,
                    status: "Expired",
                  },
                })
              }
            >
              <View style={styles.cardHeader}>
                <Text style={styles.propertyAddress} numberOfLines={1}>
                  {item.address}
                </Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Expired</Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <Ionicons name="calendar" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {formatDate(item.startDate)} - {formatDate(item.endDate)}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <Ionicons name="cash" size={16} color="#666" />
                <Text style={styles.detailText}>
                  Rs. {item.property.price} / month
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() =>
                    router.push({
                      pathname: "/(pages)/property",
                      params: { id: item.property.propertyId },
                    })
                  }
                >
                  <Text style={styles.viewButtonText}>View Property</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={[
            styles.listContainer,
            !standalonePage && { paddingTop: 20 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      );
    } else {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Expired Agreements</Text>
          <Text style={styles.emptyText}>
            You don't have any expired lease agreements yet.
          </Text>
        </View>
      );
    }
  };

  // Conditional rendering based on standalonePage prop
  if (standalonePage) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header only shown in standalone mode */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expired Agreements</Text>
          <View style={styles.emptySpace} />
        </View>

        {renderContent()}
      </View>
    );
  } else {
    // Tab mode - just return the content
    return renderContent();
  }
};

// Your styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    backgroundColor: "#20319D",
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
    fontWeight: "bold",
    color: "white",
  },
  emptySpace: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  propertyAddress: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  statusBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "500",
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4B5563",
  },
  actionRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewButton: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButtonText: {
    color: "#4F46E5",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: "80%",
  },
});

export default ExpiredAgreementsScreen;
