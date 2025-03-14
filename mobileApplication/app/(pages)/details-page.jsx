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
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import ApiHandler from "../../api/ApiHandler";
import { getUserDataFromFirebase } from "../../context/AuthContext";
import ImageSlider from "../../components/ui/ImageSlider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const [loading, setLoading] = useState(true); // Initially set loading to true
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Optimized property images fetching - use passed images from index.jsx
  // No API call needed here to avoid 404 errors

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
        setLoading(false); // Set loading to false after fetching user data
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
          setIsBooked(true);
          setBookingId(userBooking.bookingId);
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

  // Poll for updates every 3 seconds
  useEffect(() => {
    if (!propertyId) return;

    const interval = setInterval(() => {
      fetchPropertyDetails();
      if (currentUserId) {
        checkBookingStatus(currentUserId);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [propertyId, currentUserId]);

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
        return "text-red-600";
      case "Available":
        return "text-green-600";
      case "Inactive":
        return "text-gray-600";
      default:
        return "text-[#20319D]";
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case "Rented":
        return "bg-red-100 border-red-300";
      case "Available":
        return "bg-green-100 border-green-300";
      case "Inactive":
        return "bg-gray-100 border-gray-300";
      default:
        return "bg-blue-100 border-blue-300";
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
    <View className="bg-white flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center py-4 px-3 border-b border-gray-200 bg-white">
        <TouchableOpacity className="p-1" onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#20319D" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-800 ml-3">
          Property Details
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Image slider with elegant loading state */}
        <View className="mb-4 p-3 mx-4">
          <Text> </Text>
          {/* Added mx-4 for horizontal margin */}
          {loading ? (
            <View className="h-[350px] bg-gray-100 rounded-xl justify-center items-center">
              <ActivityIndicator size="large" color="#20319D" />
              <Text className="mt-2 text-gray-600">Loading images...</Text>
            </View>
          ) : (
            <ImageSlider
              key={`slider-${propertyImages.length}`}
              images={propertyImages}
              imageHeight={350}
              onImagePress={handleImagePress}
            />
          )}
        </View>

        <View className="px-5 pt-1">
          {/* Property title and status */}
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-2xl font-bold text-gray-800 flex-1 pr-2">
              {title}
            </Text>
            <View
              className={`py-1 px-2 rounded-full border text-sm font-semibold ${getStatusBgColor(
                propertyStatus
              )}`}
            >
              <Text className="text-gray-800">{propertyStatus}</Text>
            </View>
          </View>

          {/* Loading indicator when refreshing */}
          {refreshing && (
            <View className="flex-row items-center mt-1">
              <ActivityIndicator size="small" color="#20319D" />
              <Text className="text-gray-500 ml-1">Updating...</Text>
            </View>
          )}

          {/* Location */}
          <View className="flex-row items-center mt-2">
            <Ionicons name="location" size={18} color="#666" />
            <Text className="text-gray-600 ml-1">
              {city}, {municipality} - {ward}
            </Text>
          </View>

          {/* Property type */}
          <View className="flex-row items-center mt-1">
            <MaterialIcons name="house" size={18} color="#666" />
            <Text className="text-gray-600 ml-1">
              Property Type: {roomType}
            </Text>
          </View>

          {/* Nearest landmark */}
          {nearestLandmark && (
            <View className="flex-row items-center mt-4 bg-blue-50 p-3 rounded-md border-l-4 border-blue-400">
              <Ionicons name="navigate-outline" size={22} color="#20319D" />
              <Text className="text-gray-700 ml-2 flex-1">
                Nearest Landmark: {nearestLandmark}
              </Text>
            </View>
          )}

          {/* Property features */}
          <View className="flex-row flex-wrap mt-5 bg-gray-50 p-3 rounded-xl">
            {totalBedrooms && (
              <View className="flex-row items-center mr-4 mb-3 min-w-[40%]">
                <Ionicons name="bed-outline" size={24} color="#20319D" />
                <Text className="text-gray-700 ml-2">
                  {totalBedrooms} {totalBedrooms > 1 ? "Bedrooms" : "Bedroom"}
                </Text>
              </View>
            )}
            {totalWashrooms && (
              <View className="flex-row items-center mr-4 mb-3 min-w-[40%]">
                <Ionicons name="water-outline" size={24} color="#20319D" />
                <Text className="text-gray-700 ml-2">
                  {totalWashrooms}{" "}
                  {totalWashrooms > 1 ? "Bathrooms" : "Bathroom"}
                </Text>
              </View>
            )}
            {totalKitchens && (
              <View className="flex-row items-center mr-4 mb-3 min-w-[40%]">
                <MaterialIcons name="kitchen" size={24} color="#20319D" />
                <Text className="text-gray-700 ml-2">
                  {totalKitchens} {totalKitchens > 1 ? "Kitchens" : "Kitchen"}
                </Text>
              </View>
            )}
            {totalLivingRooms && (
              <View className="flex-row items-center mr-4 mb-3 min-w-[40%]">
                <Ionicons name="tv-outline" size={24} color="#20319D" />
                <Text className="text-gray-700 ml-2">
                  {totalLivingRooms}{" "}
                  {totalLivingRooms > 1 ? "Living Rooms" : "Living Room"}
                </Text>
              </View>
            )}
          </View>

          <View className="h-[1px] bg-gray-200 my-5" />

          {/* Description */}
          <Text className="text-gray-700 leading-7">{description}</Text>

          <View className="h-[1px] bg-gray-200 my-5" />

          {/* Landlord info */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <Ionicons
                name="person-circle-outline"
                size={24}
                color="#20319D"
              />
              <Text className="text-gray-700 ml-2">
                Property by: {landlordName || "Loading..."}
              </Text>
            </View>
            <TouchableOpacity
              className="p-2 bg-blue-50 rounded-full w-10 h-10 flex items-center justify-center"
              onPress={handleChat}
            >
              <Ionicons name="chatbubble-outline" size={22} color="#20319D" />
            </TouchableOpacity>
          </View>

          {/* Price and booking section */}
          <View className="flex-row justify-between items-center bg-gray-50 mt-5 p-4 rounded-xl shadow-sm">
            <View className="flex-1">
              <Text className="text-xl font-bold text-blue-900">
                Rs. {price}
                <Text className="text-sm font-normal text-gray-600">
                  {" "}
                  / per month
                </Text>
              </Text>
            </View>

            {propertyStatus !== "Rented" ? (
              isBooked ? (
                <TouchableOpacity
                  className="bg-gray-600 py-3 px-4 rounded-md items-center justify-center min-w-[120px]"
                  onPress={handleViewBooking}
                >
                  <Text className="text-white text-base font-semibold">
                    View Booking
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className={`py-3 px-4 rounded-md items-center justify-center min-w-[120px] ${
                    propertyStatus !== "Available"
                      ? "bg-gray-400"
                      : "bg-[#20319D]"
                  }`}
                  onPress={handleBookNow}
                  disabled={propertyStatus !== "Available"}
                >
                  <Text className="text-white text-base font-semibold">
                    Book Now
                  </Text>
                </TouchableOpacity>
              )
            ) : (
              <View className="bg-red-500 py-3 px-4 rounded-md flex-row items-center justify-center min-w-[140px]">
                <FontAwesome5
                  name="calendar-check"
                  size={16}
                  color="white"
                  className="mr-2"
                />
                <Text className="text-white text-base font-semibold">
                  Already Rented
                </Text>
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
            style={styles.closeButton}
            onPress={closeImageModal}
          >
            <Ionicons name="close-circle" size={30} color="white" />
          </TouchableOpacity>
          <Image
            style={styles.modalImage}
            source={{ uri: selectedImage }}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </View>
  );
};
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "90%",
    height: "90%",
  },
  closeButton: {
    position: "absolute",
    top: 80,
    right: 0,
    zIndex: 10,
    padding: 10,
  },
});

export default Details;
