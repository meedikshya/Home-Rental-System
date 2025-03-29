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

const MyBookings = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [bookings, setBookings] = useState([]);
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

  // Fetch bookings when user ID is available

  const fetchBookings = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const response = await ApiHandler.get(`/Bookings/User/${currentUserId}`);

      if (response && Array.isArray(response)) {
        // Only get approved bookings
        const approvedBookings = response.filter(
          (booking) =>
            booking.status.toLowerCase() === "approved" ||
            booking.status.toLowerCase() === "accepted"
        );

        setBookings(approvedBookings);

        // Fetch property details for each booking
        const propertyPromises = approvedBookings.map((booking) =>
          ApiHandler.get(`/Properties/${booking.propertyId}`)
        );

        const propertiesData = await Promise.all(propertyPromises);

        // Also fetch property images - this is what's missing
        const imagesResponse = await ApiHandler.get("/PropertyImages");

        // Group images by property ID like in index.jsx
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

        propertiesData.forEach((property, index) => {
          if (property) {
            // Add images to the property object
            const propertyId = approvedBookings[index].propertyId;
            const propertyImages = imagesByPropertyId[propertyId] || [];

            // Create enhanced property object with images
            const enhancedProperty = {
              ...property,
              images:
                propertyImages.length > 0
                  ? propertyImages
                  : [property.image || "https://via.placeholder.com/300.png"],
              image:
                propertyImages[0] ||
                property.image ||
                "https://via.placeholder.com/300.png",
              // Convert imagesData to string format for compatibility
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

        // Rest of your landlord fetching code...
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
        setBookings([]);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      Alert.alert("Error", "Failed to fetch bookings. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  // Fetch data when component mounts or when user ID changes
  useEffect(() => {
    if (currentUserId) {
      fetchBookings();
    }
  }, [currentUserId, fetchBookings]);

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        fetchBookings();
      }
    }, [currentUserId, fetchBookings])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  const handleViewBooking = (booking, property) => {
    if (!property) {
      Alert.alert("Error", "Property details not available.");
      return;
    }

    const landlord = landlords[property.landlordId];
    const landlordName = landlord
      ? `${landlord.firstName || ""} ${landlord.lastName || ""}`.trim()
      : "Unknown Owner";

    // Parse images array
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
      console.error("Failed to parse property images:", error);
      propertyImages = [
        property.image || "https://via.placeholder.com/300.png",
      ];
    }

    // Navigate to details page instead of agreement page
    router.push({
      pathname: "details-page",
      params: {
        propertyId: property.propertyId,
        landlordId: property.landlordId,
        title: property.title,
        description: property.description,
        city: property.city,
        municipality: property.municipality,
        ward: property.ward,
        nearestLandmark: property.nearestLandmark,
        price: property.price,
        roomType: property.roomType,
        status: property.status,
        totalBedrooms: property.totalBedrooms,
        totalLivingRooms: property.totalLivingRooms || 0,
        totalWashrooms: property.totalWashrooms,
        totalKitchens: property.totalKitchens,
        image: propertyImages[0],
        imagesData: JSON.stringify(propertyImages),
        bookingId: booking.bookingId,
        // bookingDate: booking.bookingDate,
        bookingStatus: booking.status,
      },
    });
  };

  const handleCancelBooking = async (bookingId) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              // Send a request to cancel the booking
              await ApiHandler.delete(`/Bookings/${bookingId}`);
              Alert.alert("Success", "Booking cancelled successfully");
              fetchBookings(); // Refresh the bookings list
            } catch (error) {
              console.error("Error cancelling booking:", error);
              Alert.alert(
                "Error",
                "Failed to cancel booking. Please try again."
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "#16A34A";
      case "rejected":
        return "#DC2626";
      case "cancelled":
        return "#6B7280";
      case "pending":
        return "#F59E0B";
      default:
        return "#20319D";
    }
  };

  const getStatusBgColor = (status) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "#DCFCE7";
      case "rejected":
        return "#FEE2E2";
      case "cancelled":
        return "#F3F4F6";
      case "pending":
        return "#FEF3C7";
      default:
        return "#EFF6FF";
    }
  };

  // Filter for approved/accepted bookings only
  const approvedBookings = bookings.filter(
    (booking) =>
      booking.status.toLowerCase() === "approved" ||
      booking.status.toLowerCase() === "accepted"
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#20319D" barStyle="light-content" />
        <ActivityIndicator size="large" color="#20319D" />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
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
          <Text style={styles.headerTitle}>My Bookings</Text>
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
        {approvedBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="calendar-times" size={60} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Approved Bookings</Text>
            <Text style={styles.emptyText}>
              You don't have any approved bookings yet. Check back later!
            </Text>
          </View>
        ) : (
          approvedBookings.map((booking) => {
            const property = properties[booking.propertyId];
            if (!property) return null;

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
              <View key={booking.bookingId} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingDateContainer}></View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBgColor(booking.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(booking.status) },
                      ]}
                    >
                      {booking.status}
                    </Text>
                  </View>
                </View>

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
                    <View style={styles.amenitiesContainer}>
                      {property.totalBedrooms > 0 && (
                        <View style={styles.amenity}>
                          <Ionicons
                            name="bed-outline"
                            size={16}
                            color="#4B5563"
                          />
                          <Text style={styles.amenityText}>
                            {property.totalBedrooms}
                          </Text>
                        </View>
                      )}
                      {property.totalWashrooms > 0 && (
                        <View style={styles.amenity}>
                          <Ionicons
                            name="water-outline"
                            size={16}
                            color="#4B5563"
                          />
                          <Text style={styles.amenityText}>
                            {property.totalWashrooms}
                          </Text>
                        </View>
                      )}
                      {property.totalKitchens > 0 && (
                        <View style={styles.amenity}>
                          <MaterialIcons
                            name="kitchen"
                            size={16}
                            color="#4B5563"
                          />
                          <Text style={styles.amenityText}>
                            {property.totalKitchens}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.priceText}>
                      Rs. {property.price}/month
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => handleViewBooking(booking, property)}
                  >
                    <Text style={styles.viewDetailsText}>View Details</Text>
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
    marginTop: 15,
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
    paddingTop: 16,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  bookingCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  bookingDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookingDate: {
    marginLeft: 6,
    fontSize: 14,
    color: "#4B5563",
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
  propertyInfoContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
  amenitiesContainer: {
    flexDirection: "row",
    marginBottom: 6,
  },
  amenity: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  amenityText: {
    fontSize: 14,
    color: "#4B5563",
    marginLeft: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#20319D",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: "#20319D",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  viewDetailsText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "white",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  cancelButtonText: {
    color: "#DC2626",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default MyBookings;
