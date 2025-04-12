import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
  Image, // Import Image component
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import ApiHandler from "../../api/ApiHandler";
import { getUserDataFromFirebase } from "../../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

const ExpiredAgreementsScreen = ({ standalonePage = true }) => {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Fetch on initial mount
  useEffect(() => {
    fetchExpiredAgreements();
  }, []);

  // Refresh when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchExpiredAgreements();
      return () => {}; // cleanup
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpiredAgreements();
  };

  const fetchExpiredAgreements = async () => {
    try {
      if (!refreshing) setLoading(true);

      const renterId = await getUserDataFromFirebase();

      if (!renterId) {
        console.log("Could not retrieve user ID");
        setLoading(false);
        setRefreshing(false);
        setAgreements([]);
        return;
      }

      console.log("Fetching expired agreements for renter ID:", renterId);

      const expiredAgreements = await ApiHandler.get(
        `/Agreements/expired-by-renter/${renterId}`
      );

      if (!expiredAgreements || expiredAgreements.length === 0) {
        console.log("No expired agreements found for this user");
        setAgreements([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log(`Found ${expiredAgreements.length} expired agreements`);

      const imagesResponse = await ApiHandler.get("/PropertyImages");
      const imagesByPropertyId = {};
      if (imagesResponse && Array.isArray(imagesResponse)) {
        imagesResponse.forEach((img) => {
          if (img && img.propertyId && img.imageUrl) {
            if (!imagesByPropertyId[img.propertyId]) {
              imagesByPropertyId[img.propertyId] = [];
            }
            imagesByPropertyId[img.propertyId].push(img.imageUrl);
          }
        });
      }

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

            const propertyImages =
              imagesByPropertyId[property.propertyId] || [];
            const defaultImage = "https://via.placeholder.com/150.png";
            const enhancedProperty = {
              ...property,
              images:
                propertyImages.length > 0
                  ? propertyImages
                  : [property.image || defaultImage],
              image: propertyImages[0] || property.image || defaultImage,
            };

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
              property: enhancedProperty,
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
    } catch (error) {
      console.error("Error fetching expired agreements:", error);
      Alert.alert("Error", "Failed to load expired agreements.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short", // Use short month name
        day: "numeric",
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

  const renderContent = () => {
    if (loading && !refreshing) {
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
          renderItem={({ item }) => {
            const imageUrl =
              item.property.image || "https://via.placeholder.com/150.png";

            return (
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
                      image: imageUrl,
                      address: item.address,
                      landlordName: item.landlordName || "Property Owner",
                      bedrooms: item.property.totalBedrooms || 0,
                      bathrooms: item.property.totalWashrooms || 0,
                      kitchen: item.property.totalKitchens || 0,
                      price: item.property.price || 0,
                      agreementId: item.agreementId,
                      startDate: item.startDate,
                      endDate: item.endDate,
                      status: "Expired",
                    },
                  })
                }
              >
                <View style={styles.cardContentRow}>
                  <Image source={{ uri: imageUrl }} style={styles.thumbnail} />
                  <View style={styles.detailsColumn}>
                    <Text style={styles.propertyTitleText} numberOfLines={1}>
                      {item.property.title || "Unnamed Property"}
                    </Text>
                    <Text style={styles.propertyAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Expired</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.separator} />

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#4B5563"
                    />
                    <Text style={styles.detailText}>
                      {formatDate(item.startDate)} - {formatDate(item.endDate)}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="cash-outline" size={16} color="#4B5563" />
                    <Text style={styles.detailText}>
                      Rs. {item.property.price || 0} / month
                    </Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => {
                      const defaultImage =
                        "https://via.placeholder.com/300.png";
                      const mainImage = item.property.image || defaultImage;
                      const images = item.property.images || [mainImage];

                      router.push({
                        pathname: "/(pages)/details-page",
                        params: {
                          propertyId: item.property.propertyId,
                          landlordId: item.property.landlordId,
                          title: item.property.title || "Property",
                          description:
                            item.property.description ||
                            "No description available",
                          district: item.property.district || "",
                          city: item.property.city || "",
                          municipality: item.property.municipality || "",
                          ward: item.property.ward || "",
                          nearestLandmark: item.property.nearestLandmark || "",
                          price: item.property.price || 0,
                          roomType: item.property.roomType || "Room",
                          status: item.property.status || "Available",
                          createdAt:
                            item.property.createdAt || new Date().toISOString(),
                          totalBedrooms: item.property.totalBedrooms || 0,
                          totalLivingRooms: item.property.totalLivingRooms || 0,
                          totalWashrooms: item.property.totalWashrooms || 0,
                          totalKitchens: item.property.totalKitchens || 0,
                          image: mainImage,
                          imagesData: JSON.stringify(images),
                        },
                      });
                    }}
                  >
                    <Text style={styles.viewButtonText}>
                      View Property Details
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={[
            styles.listContainer,
            !standalonePage && { paddingTop: 20 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#20319D"]}
            />
          }
        />
      );
    } else {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="file-tray-outline" size={60} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Expired Agreements</Text>
          <Text style={styles.emptyText}>
            You don't have any expired lease agreements yet.
          </Text>
        </View>
      );
    }
  };

  if (standalonePage) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
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
    return renderContent();
  }
};

// Enhanced Stylesheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Slightly lighter background
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
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden", // Ensures children don't overflow rounded corners
  },
  cardContentRow: {
    flexDirection: "row",
    padding: 16, // Add padding around the top content
  },
  thumbnail: {
    width: 72, // Slightly smaller thumbnail
    height: 72,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: "#F1F5F9", // Lighter placeholder background
  },
  detailsColumn: {
    flex: 1,
    justifyContent: "center", // Center content vertically
  },
  propertyTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B", // Darker title
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B", // Slightly muted address color
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12, // More rounded badge
    borderWidth: 1,
    borderColor: "#FEE2E2",
    alignSelf: "flex-start",
  },
  statusText: {
    color: "#DC2626", // Stronger red
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase", // Uppercase status
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F5F9", // Lighter separator
    marginHorizontal: 16, // Add horizontal margin to separator
  },
  infoRow: {
    paddingVertical: 12, // Add padding around info rows
    paddingHorizontal: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#334155", // Slightly darker detail text
    fontWeight: "500",
  },
  actionRow: {
    backgroundColor: "#F8FAFC", // Light background for action area
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewButton: {
    backgroundColor: "#4F46E5", // Primary button color
    paddingHorizontal: 20, // More horizontal padding
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  viewButtonText: {
    color: "#FFFFFF", // White text on primary button
    fontWeight: "600",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8FAFC",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    maxWidth: "85%",
    lineHeight: 22,
  },
});

export default ExpiredAgreementsScreen;
