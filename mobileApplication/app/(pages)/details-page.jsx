import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import ApiHandler from "../../api/ApiHandler";

import { getUserDataFromFirebase } from "../../context/AuthContext";
import ImageSlider from "../../components/ui/ImageSlider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const Details = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    propertyId,
    landlordId,
    title,
    description,
    city,
    municipality,
    ward,
    nearestLandmark,
    price,
    roomType,
    status,
    totalBedrooms,
    totalLivingRooms,
    totalWashrooms,
    totalKitchens,
    image,
    imagesData,
  } = route.params;

  // Parse the images array or use a fallback with better error handling
  let initialImages = [];
  try {
    if (imagesData) {
      const parsedImages = JSON.parse(imagesData);
      initialImages =
        Array.isArray(parsedImages) && parsedImages.length > 0
          ? parsedImages
          : [image || "https://via.placeholder.com/300.png"];
    } else {
      initialImages = [image || "https://via.placeholder.com/300.png"];
    }
  } catch (error) {
    console.error("ERROR: Failed to parse imagesData:", error);
    initialImages = [image || "https://via.placeholder.com/300.png"];
  }

  const [landlordName, setLandlordName] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isBooked, setIsBooked] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [renterName, setRenterName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [propertyStatus, setPropertyStatus] = useState(status || "Available");
  const [propertyImages, setPropertyImages] = useState(initialImages);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const { width, height } = Dimensions.get("window");
  const [hasFoundExpiredAgreement, setHasFoundExpiredAgreement] = useState({});

  // Fetch current user ID from Firebase
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const userId = await getUserDataFromFirebase();
        if (userId) {
          setCurrentUserId(userId);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert("Error", "Unable to fetch user data.");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUserId();
  }, []);

  // Fetch latest property details
  const fetchPropertyDetails = async () => {
    try {
      if (!propertyId) return false;

      const propertyResponse = await ApiHandler.get(
        `/Properties/${propertyId}`
      );

      if (propertyResponse) {
        setPropertyStatus(propertyResponse.status);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching property details:", error);
      return false;
    }
  };

  // Fetch renter's full name
  const fetchRenterName = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const response = await ApiHandler.get(
        `/UserDetails/userId/${currentUserId}`
      );
      if (response) {
        const { firstName, lastName } = response;
        setRenterName(`${firstName} ${lastName}`);
      }
    } catch (error) {
      console.error("Error fetching renter's details:", error);
    }
  }, [currentUserId]);

  // Fetch landlord's name
  const fetchLandlordName = async () => {
    try {
      if (!landlordId) return;

      const userDetailsResponse = await ApiHandler.get(
        `/UserDetails/userId/${landlordId}`
      );
      if (userDetailsResponse) {
        const { firstName, lastName } = userDetailsResponse;
        setLandlordName(`${firstName} ${lastName}`);
      }
    } catch (error) {
      console.error("Error fetching landlord details:", error);
    }
  };

  // Check booking status
  const checkBookingStatus = async (userId) => {
    if (!userId || !propertyId) return;

    try {
      const response = await ApiHandler.get(
        `/bookings?userId=${userId}&propertyId=${propertyId}`
      );

      if (response && response.length > 0) {
        const userBooking = response.find(
          (booking) =>
            Number(booking.userId) === Number(userId) &&
            Number(booking.propertyId) === Number(propertyId)
        );

        if (userBooking) {
          const bookingId = userBooking.bookingId;

          // Check if there's an agreement for this booking and if it's expired
          try {
            const agreementResponse = await ApiHandler.get(
              `/Agreements/byBookingId/${bookingId}`
            );

            if (agreementResponse && agreementResponse.status === "Expired") {
              // Only log if this is the first time we've seen this expired agreement
              if (!hasFoundExpiredAgreement[bookingId]) {
                console.log("Found expired agreement for booking", bookingId);
                setHasFoundExpiredAgreement((prev) => ({
                  ...prev,
                  [bookingId]: true,
                }));
              }
              setIsBooked(false);
              setBookingId(null);
            } else {
              // If agreement exists and is not expired, show the booking
              setIsBooked(true);
              setBookingId(bookingId);
            }
          } catch (error) {
            // If no agreement exists or other error
            // ...existing error handling code...
          }
        } else {
          setIsBooked(false);
          setBookingId(null);
        }
      } else {
        setIsBooked(false);
        setBookingId(null);
      }
    } catch (error) {
      console.error("Error checking booking status:", error);
      setIsBooked(false);
      setBookingId(null);
    }
  };

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchPropertyDetails(),
        currentUserId ? checkBookingStatus(currentUserId) : Promise.resolve(),
        fetchLandlordName(),
        currentUserId ? fetchRenterName() : Promise.resolve(),
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [currentUserId, propertyId]);

  // Load initial data
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Check booking status on screen focus
  useFocusEffect(
    useCallback(() => {
      refreshAllData();
    }, [refreshAllData])
  );

  useEffect(() => {
    if (!propertyId) return;

    // Check immediately once
    if (currentUserId) {
      checkBookingStatus(currentUserId);
    }

    const interval = setInterval(() => {
      fetchPropertyDetails();

      if (currentUserId && Object.keys(hasFoundExpiredAgreement).length === 0) {
        checkBookingStatus(currentUserId);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [propertyId, currentUserId, hasFoundExpiredAgreement]);

  // Handle "Book Now" button press
  const handleBookNow = async () => {
    if (!currentUserId) {
      Alert.alert("Error", "You need to be logged in to make a booking.");
      return;
    }

    if (!propertyId) {
      Alert.alert("Error", "Property ID is missing.");
      return;
    }

    try {
      const bookingData = {
        userId: currentUserId,
        propertyId,
        status: "Pending",
        bookingDate: new Date().toISOString(),
      };

      const response = await ApiHandler.post("/bookings", bookingData);

      if (response && response.bookingId) {
        const newBookingId = response.bookingId;
        Alert.alert("Success", "Booking has been made successfully!");
        setIsBooked(true);
        setBookingId(newBookingId);

        router.push({
          pathname: "agreement-page",
          params: {
            propertyId,
            image: propertyImages[0] || image,
            imagesData: JSON.stringify(propertyImages),
            address: `${city}, ${municipality} - ${ward}`,
            bedrooms: totalBedrooms,
            bathrooms: totalWashrooms,
            kitchen: totalKitchens,
            price,
            bookingId: newBookingId,
            renterId: currentUserId,
            landlordId,
            landlordName,
          },
        });
      } else {
        Alert.alert("Error", "Failed to make booking. Please try again.");
      }
    } catch (error) {
      console.error("Error making booking:", error);
      Alert.alert("Error", "Failed to make booking. Please try again.");
    }
  };

  // Handle "View Booking" button press
  const handleViewBooking = () => {
    if (!bookingId) {
      Alert.alert("Error", "No booking found.");
      return;
    }

    router.push({
      pathname: "agreement-page",
      params: {
        propertyId,
        image: propertyImages[0] || image,
        imagesData: JSON.stringify(propertyImages),
        address: `${city}, ${municipality} - ${ward}`,
        bedrooms: totalBedrooms,
        bathrooms: totalWashrooms,
        kitchen: totalKitchens,
        price,
        bookingId,
        renterId: currentUserId,
        landlordId,
        landlordName,
      },
    });
  };

  // Handle "Chat" button press
  const handleChat = () => {
    router.push({
      pathname: "/(pages)/chat-page",
      params: {
        landlordId,
        landlordName,
      },
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Rented":
        return "#DC2626";
      case "Available":
        return "#16A34A";
      case "Inactive":
        return "#6B7280";
      default:
        return "#20319D";
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case "Rented":
        return "#FEE2E2";
      case "Available":
        return "#DCFCE7";
      case "Inactive":
        return "#F3F4F6";
      default:
        return "#EFF6FF";
    }
  };

  const openImageModal = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setModalVisible(false);
  };

  const handleImagePress = (imageUri) => {
    openImageModal(imageUri);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Property Details</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image slider */}
        <View style={styles.imageSliderContainer}>
          {loading ? (
            <View style={styles.loadingImageContainer}>
              <ActivityIndicator size="large" color="#20319D" />
              <Text style={styles.loadingText}>Loading images...</Text>
            </View>
          ) : (
            <ImageSlider
              key={`slider-${propertyImages.length}`}
              images={propertyImages}
              imageHeight={320}
              onImagePress={handleImagePress}
              cardWidth={width - 24}
            />
          )}
        </View>

        <View style={styles.contentContainer}>
          {/* Property title and status */}
          <View style={styles.titleContainer}>
            <Text style={styles.propertyTitle}>{title}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusBgColor(propertyStatus) },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(propertyStatus) },
                ]}
              >
                {propertyStatus}
              </Text>
            </View>
          </View>

          {/* Loading indicator when refreshing */}
          {refreshing && (
            <View style={styles.refreshingContainer}>
              <ActivityIndicator size="small" color="#20319D" />
              <Text style={styles.refreshingText}>Updating...</Text>
            </View>
          )}

          {/* Location */}
          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color="#666" />
            <Text style={styles.infoText}>
              {city}, {municipality} - {ward}
            </Text>
          </View>

          {/* Property type */}
          <View style={styles.infoRow}>
            <MaterialIcons name="house" size={18} color="#666" />
            <Text style={styles.infoText}>Property Type: {roomType}</Text>
          </View>

          {/* Nearest landmark */}
          {nearestLandmark && (
            <View style={styles.landmarkContainer}>
              <Ionicons name="navigate-outline" size={22} color="#20319D" />
              <Text style={styles.landmarkText}>
                Nearest Landmark: {nearestLandmark}
              </Text>
            </View>
          )}

          {/* Property features */}
          <View style={styles.featuresContainer}>
            {totalBedrooms > 0 && (
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="bed-outline" size={24} color="#20319D" />
                </View>
                <Text style={styles.featureText}>
                  {totalBedrooms} {totalBedrooms > 1 ? "Bedrooms" : "Bedroom"}
                </Text>
              </View>
            )}

            {totalWashrooms > 0 && (
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="water-outline" size={24} color="#20319D" />
                </View>
                <Text style={styles.featureText}>
                  {totalWashrooms}{" "}
                  {totalWashrooms > 1 ? "Bathrooms" : "Bathroom"}
                </Text>
              </View>
            )}

            {totalKitchens > 0 && (
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <MaterialIcons name="kitchen" size={24} color="#20319D" />
                </View>
                <Text style={styles.featureText}>
                  {totalKitchens} {totalKitchens > 1 ? "Kitchens" : "Kitchen"}
                </Text>
              </View>
            )}

            {totalLivingRooms > 0 && (
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="tv-outline" size={24} color="#20319D" />
                </View>
                <Text style={styles.featureText}>
                  {totalLivingRooms}{" "}
                  {totalLivingRooms > 1 ? "Living Rooms" : "Living Room"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>

          <View style={styles.divider} />

          {/* Landlord info */}
          <View style={styles.landlordContainer}>
            <View style={styles.landlordInfo}>
              <View style={styles.landlordIconContainer}>
                <Ionicons name="person" size={24} color="white" />
              </View>
              <View>
                <Text style={styles.landlordLabel}>Owner</Text>
                <Text style={styles.landlordName}>
                  {landlordName || "Loading..."}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
              <Ionicons name="chatbubble-outline" size={22} color="white" />
              <Text style={styles.chatButtonText}>Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Price and booking section */}
          <View style={styles.bookingContainer}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceValue}>Rs. {price}</Text>
              <Text style={styles.priceLabel}>per month</Text>
            </View>

            {propertyStatus !== "Rented" ? (
              isBooked ? (
                <TouchableOpacity
                  style={styles.viewBookingButton}
                  onPress={handleViewBooking}
                >
                  <Text style={styles.bookButtonText}>View Booking</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.bookButton,
                    propertyStatus !== "Available" && styles.disabledButton,
                  ]}
                  onPress={handleBookNow}
                  disabled={propertyStatus !== "Available"}
                >
                  <Text style={styles.bookButtonText}>Book Now</Text>
                </TouchableOpacity>
              )
            ) : (
              <View style={styles.rentedButton}>
                <FontAwesome5
                  name="calendar-check"
                  size={16}
                  color="white"
                  style={styles.rentedIcon}
                />
                <Text style={styles.rentedText}>Already Rented</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Full-screen image modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeImageModal}
          />
          <View style={styles.modalContent}>
            <Image
              style={styles.modalImage}
              source={{ uri: selectedImage }}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={closeImageModal}
            >
              <Ionicons name="close-circle" size={40} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  // Header Styles
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

  // ScrollView Styles
  scrollView: {
    flex: 1,
    marginTop: 10,
  },
  scrollContent: {
    paddingBottom: 30,
  },

  // Image Slider Styles
  imageSliderContainer: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30,
    overflow: "hidden",
    marginTop: 15,
    marginHorizontal: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  loadingImageContainer: {
    height: 300,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },

  // Content Container Styles
  contentContainer: {
    padding: 20,
    borderRadius: 10,
    backgroundColor: "white",
    marginTop: -5,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Title and Status Styles
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  propertyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Refreshing Indicator Styles
  refreshingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  refreshingText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
  },

  // Info Row Styles
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: "#4B5563",
    marginLeft: 10,
  },

  // Landmark Styles
  landmarkContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },
  landmarkText: {
    fontSize: 16,
    color: "#1F2937",
    marginLeft: 12,
    flex: 1,
  },

  // Features Styles
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },
  featureItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: "#4B5563",
    fontWeight: "500",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 20,
  },

  // Description Styles
  descriptionContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4B5563",
  },

  // Landlord Styles
  landlordContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  landlordInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  landlordIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#20319D",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  landlordLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  landlordName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#20319D",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  chatButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 6,
  },

  // Booking Styles
  bookingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  priceContainer: {
    flex: 1,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#20319D",
  },
  priceLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  bookButton: {
    backgroundColor: "#20319D",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#20319D",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  viewBookingButton: {
    backgroundColor: "#4B5563",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  bookButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  rentedButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  rentedIcon: {
    marginRight: 8,
  },
  rentedText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  modalContent: {
    width: width * 0.95,
    height: width * 1.3,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  closeModalButton: {
    position: "absolute",
    top: -30,
    right: 20,
    zIndex: 20,
    padding: 5,
    borderRadius: 25,
  },
});

export default Details;
