import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import ApiHandler from "../../api/ApiHandler";
import { getUserDataFromFirebase } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

const MyAgreements = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [properties, setProperties] = useState({});
  const [landlords, setLandlords] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  // Fetch agreements when user ID is available
  const fetchAgreements = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const response = await ApiHandler.get(
        `/Agreements/User/${currentUserId}`
      );

      if (response && Array.isArray(response)) {
        setAgreements(response);

        // Fetch property details for each agreement using booking ID
        const bookingPromises = response.map((agreement) =>
          ApiHandler.get(`/Bookings/${agreement.bookingId}`)
        );

        const bookingsData = await Promise.all(bookingPromises);

        // Now fetch property details using propertyId from bookings
        const propertyPromises = bookingsData.map((booking) =>
          booking ? ApiHandler.get(`/Properties/${booking.propertyId}`) : null
        );

        const propertiesData = await Promise.all(propertyPromises);

        // Fetch property images
        const imagesResponse = await ApiHandler.get("/PropertyImages");

        // Group images by property ID
        const imagesByPropertyId = {};
        if (imagesResponse && Array.isArray(imagesResponse)) {
          imagesResponse.forEach((img) => {
            if (!imagesByPropertyId[img.propertyId]) {
              imagesByPropertyId[img.propertyId] = [];
            }
            imagesByPropertyId[img.propertyId].push(img.imageUrl);
          });
        }

        const propertyMap = {};
        const landlordIds = new Set();

        // Map properties and their bookings together
        propertiesData.forEach((property, index) => {
          if (property && bookingsData[index]) {
            const booking = bookingsData[index];
            const propertyId = booking.propertyId;
            const propertyImages = imagesByPropertyId[propertyId] || [];

            // Create enhanced property object with images
            const enhancedProperty = {
              ...property,
              bookingId: booking.bookingId,
              images:
                propertyImages.length > 0
                  ? propertyImages
                  : [property.image || "https://via.placeholder.com/300.png"],
              image:
                propertyImages[0] ||
                property.image ||
                "https://via.placeholder.com/300.png",
              imagesData: JSON.stringify(
                propertyImages.length > 0
                  ? propertyImages
                  : [property.image || "https://via.placeholder.com/300.png"]
              ),
            };

            propertyMap[propertyId] = enhancedProperty;

            if (property.landlordId) {
              landlordIds.add(property.landlordId);
            }
          }
        });

        setProperties(propertyMap);

        // Fetch landlord details
        const landlordPromises = Array.from(landlordIds).map((id) =>
          ApiHandler.get(`/UserDetails/userId/${id}`)
        );

        const landlordsData = await Promise.all(landlordPromises);

        const landlordMap = {};
        landlordsData.forEach((landlord, index) => {
          if (landlord) {
            landlordMap[Array.from(landlordIds)[index]] = landlord;
          }
        });

        setLandlords(landlordMap);
      } else {
        setAgreements([]);
      }
    } catch (error) {
      console.error("Error fetching agreements:", error);
      Alert.alert("Error", "Failed to fetch agreements. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  // Fetch data when component mounts or when user ID changes
  useEffect(() => {
    if (currentUserId) {
      fetchAgreements();
    }
  }, [currentUserId, fetchAgreements]);

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        fetchAgreements();
      }
    }, [currentUserId, fetchAgreements])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAgreements();
  }, [fetchAgreements]);

  const handleViewAgreement = (agreement) => {
    // Find the associated property using the booking ID
    const property = Object.values(properties).find(
      (p) => p.bookingId === agreement.bookingId
    );

    if (!property) {
      Alert.alert("Error", "Property details not available.");
      return;
    }

    // Get landlord information
    const landlord = landlords[property.landlordId];
    const landlordName = landlord
      ? `${landlord.firstName || ""} ${landlord.lastName || ""}`.trim()
      : "Unknown Owner";

    // Parse property images
    let propertyImages = [];
    try {
      if (property.imagesData) {
        const parsedImages = JSON.parse(property.imagesData);
        propertyImages =
          Array.isArray(parsedImages) && parsedImages.length > 0
            ? parsedImages
            : [property.image || "https://via.placeholder.com/300.png"];
      } else {
        propertyImages = [
          property.image || "https://via.placeholder.com/300.png",
        ];
      }
    } catch (error) {
      propertyImages = [
        property.image || "https://via.placeholder.com/300.png",
      ];
    }

    // Navigate directly to agreement-page with all necessary parameters
    router.push({
      pathname: "agreement-page",
      params: {
        propertyId: property.propertyId,
        image: propertyImages[0],
        imagesData: JSON.stringify(propertyImages),
        address: `${property.city}, ${property.municipality} - ${property.ward}`,
        bedrooms: property.totalBedrooms,
        bathrooms: property.totalWashrooms,
        kitchen: property.totalKitchens,
        price: property.price,
        bookingId: agreement.bookingId,
        agreementId: agreement.agreementId,
        renterId: agreement.renterId,
        landlordId: property.landlordId,
        landlordName: landlordName,
        startDate: agreement.startDate,
        endDate: agreement.endDate,
      },
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "active":
        return "#16A34A";
      case "expired":
        return "#DC2626";
      case "terminated":
        return "#6B7280";
      case "pending":
        return "#F59E0B";
      default:
        return "#20319D";
    }
  };

  const getStatusBgColor = (status) => {
    switch (status.toLowerCase()) {
      case "active":
        return "#DCFCE7";
      case "expired":
        return "#FEE2E2";
      case "terminated":
        return "#F3F4F6";
      case "pending":
        return "#FEF3C7";
      default:
        return "#EFF6FF";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#20319D" barStyle="light-content" />
        <ActivityIndicator size="large" color="#20319D" />
        <Text style={styles.loadingText}>Loading your agreements...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#20319D" barStyle="light-content" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Agreements</Text>
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
        {agreements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <FontAwesome5 name="file-contract" size={40} color="#20319D" />
            </View>
            <Text style={styles.emptyTitle}>No Agreements Found</Text>
            <Text style={styles.emptyText}>
              You don't have any rental agreements yet. Agreements will appear
              here once they are created.
            </Text>
          </View>
        ) : (
          agreements.map((agreement) => {
            // Find the associated property using the booking ID
            const property = Object.values(properties).find(
              (p) => p.bookingId === agreement.bookingId
            );
            if (!property) return null;

            // Get landlord information
            const landlord = landlords[property.landlordId];
            const landlordName = landlord
              ? `${landlord.firstName || ""} ${landlord.lastName || ""}`.trim()
              : "Unknown Owner";

            // Parse property images
            let propertyImage = "https://via.placeholder.com/300.png";
            try {
              if (property.imagesData) {
                const parsedImages = JSON.parse(property.imagesData);
                propertyImage =
                  Array.isArray(parsedImages) && parsedImages.length > 0
                    ? parsedImages[0]
                    : property.image || propertyImage;
              } else if (property.image) {
                propertyImage = property.image;
              }
            } catch (error) {
              propertyImage = property.image || propertyImage;
            }

            return (
              <View key={agreement.agreementId} style={styles.agreementCard}>
                <View style={styles.agreementHeader}>
                  {/* Status badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBgColor(agreement.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(agreement.status) },
                      ]}
                    >
                      {agreement.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.dateRangeContainer}>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Start Date</Text>
                    <Text style={styles.dateValue}>
                      {formatDate(agreement.startDate)}
                    </Text>
                  </View>
                  <View style={styles.dateSeparator}>
                    <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
                  </View>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>End Date</Text>
                    <Text style={styles.dateValue}>
                      {formatDate(agreement.endDate)}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.propertyInfoContainer}>
                  {/* Property Image */}
                  <Image
                    source={{ uri: propertyImage }}
                    style={styles.propertyImage}
                  />
                  <View style={styles.propertyDetails}>
                    <Text style={styles.propertyTitle} numberOfLines={2}>
                      {property.title}
                    </Text>
                    <View style={styles.locationContainer}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {property.city}, {property.municipality}
                      </Text>
                    </View>
                    <View style={styles.ownerContainer}>
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={styles.ownerText}>{landlordName}</Text>
                    </View>
                    <Text style={styles.priceText}>
                      Rs. {property.price}/month
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={styles.viewAgreementButton}
                    onPress={() => handleViewAgreement(agreement)}
                  >
                    <Text style={styles.viewAgreementText}>View Agreement</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
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
  agreementCard: {
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
  },
  agreementHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  dateSeparator: {
    paddingHorizontal: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
  },
  propertyInfoContainer: {
    flexDirection: "row",
    paddingBottom: 16,
  },
  propertyImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  propertyDetails: {
    flex: 1,
    marginLeft: 12,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  locationText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
  ownerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  ownerText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#20319D",
  },
  actionButtonsContainer: {
    marginTop: 16,
  },
  viewAgreementButton: {
    backgroundColor: "#20319D",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  viewAgreementText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default MyAgreements;
