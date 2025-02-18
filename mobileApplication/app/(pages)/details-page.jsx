import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import ApiHandler from "../../api/ApiHandler";
import { getUserDataFromFirebase } from "../../context/AuthContext";

const Details = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const router = useRouter();

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
  } = route.params;

  const [landlordName, setLandlordName] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isBooked, setIsBooked] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  // Fetch current user ID from Firebase
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const userId = await getUserDataFromFirebase();
        console.log("Fetched Firebase User ID:", userId); // Log user ID
        if (userId) {
          setCurrentUserId(userId);
        }
      } catch (error) {
        console.error("Error fetching user data from Firebase:", error);
        Alert.alert("Error", "Unable to fetch user data.");
      }
    };

    fetchCurrentUserId();
  }, []);

  console.log("Received Route Params:", route.params);
  console.log("Received Landlord ID:", route.params.landlordId);

  // Fetch landlord's name
  useEffect(() => {
    const fetchLandlordName = async () => {
      try {
        const userDetailsResponse = await ApiHandler.get(
          `/UserDetails/userId/${landlordId}`
        );
        console.log("User Details Response:", userDetailsResponse); // Log response
        if (userDetailsResponse) {
          const { firstName, lastName } = userDetailsResponse;
          setLandlordName(`${firstName} ${lastName}`);
          console.log("Landlord Name:", `${firstName} ${lastName}`); // Log landlord name
        } else {
          console.log("No user details found for the provided landlord ID.");
        }
      } catch (error) {
        console.error("Error fetching landlord name:", error);
        Alert.alert("Error", "Unable to fetch landlord data.");
      }
    };

    if (landlordId) {
      fetchLandlordName();
    }
  }, [landlordId]);

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
      Alert.alert("Error", "Unable to check booking status.");
    }
  };

  // Check booking status on screen focus
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        checkBookingStatus(currentUserId);
      }
    }, [currentUserId, propertyId])
  );

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
            image,
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
        image,
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
      pathname: "/(tabs)/chat",
      params: {
        landlordId,
        landlordName,
      },
    });
  };

  return (
    <SafeAreaView className="bg-white flex-1">
      <View className="flex-row items-center p-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-2xl ml-4 font-semibold">Property Details</Text>
      </View>

      <ScrollView className="p-5">
        <Image
          source={{ uri: image }}
          className="w-full h-[350px] rounded-lg"
          resizeMode="cover"
        />

        <View className="mt-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-xl font-bold">{title}</Text>
            <Text className="text-base font-bold text-[#20319D]">{status}</Text>
          </View>
          <Text className="text-lg text-gray-600 mt-1">
            {city}, {municipality} - {ward}
          </Text>
          <Text className="text-lg text-gray-600 mt-1">
            Property Type: {roomType}
          </Text>

          {nearestLandmark && (
            <View className="flex-row items-center mt-3">
              <Ionicons name="location-outline" size={24} color="#20319D" />
              <Text className="text-base text-gray-600 ml-1">
                Nearest Landmark: {nearestLandmark}
              </Text>
            </View>
          )}

          <View className="flex-row flex-wrap mt-4">
            {totalBedrooms && (
              <View className="flex-row items-center mr-5">
                <Ionicons name="bed-outline" size={24} color="#20319D" />
                <Text className="text-base text-gray-600 ml-1 mb-2">
                  {totalBedrooms} Bedrooms
                </Text>
              </View>
            )}
            {totalWashrooms && (
              <View className="flex-row items-center mr-5">
                <Ionicons name="water-outline" size={24} color="#20319D" />
                <Text className="text-base text-gray-600 ml-1">
                  {totalWashrooms} Bathrooms
                </Text>
              </View>
            )}
            {totalKitchens && (
              <View className="flex-row items-center mr-5">
                <MaterialIcons name="kitchen" size={24} color="#20319D" />
                <Text className="text-base text-gray-600 ml-1">
                  {totalKitchens} Kitchen
                </Text>
              </View>
            )}
            {totalLivingRooms && (
              <View className="flex-row items-center">
                <Ionicons name="tv-outline" size={24} color="#20319D" />
                <Text className="text-base text-gray-600 ml-1">
                  {totalLivingRooms} Living Room
                </Text>
              </View>
            )}
          </View>

          <View className="border-b border-gray-300 my-4" />
          <Text className="text-base text-gray-600 leading-relaxed">
            {description}
          </Text>
          <View className="border-b border-gray-300 my-4" />

          <View className="flex-row justify-between items-center mt-3">
            <Text className="text-base text-gray-600">
              Property by: {landlordName}
            </Text>
            <TouchableOpacity onPress={handleChat}>
              <Ionicons name="chatbubble-outline" size={24} color="#20319D" />
            </TouchableOpacity>
          </View>

          <View className="bg-gray-50 rounded-lg shadow-md mt-6">
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-bold text-[#20319D]">
                Rs. {price}{" "}
                <Text className="text-sm text-gray-500">/ per month</Text>
              </Text>
              {isBooked ? (
                <TouchableOpacity
                  className="bg-gray-400 p-3 px-6 rounded-lg"
                  onPress={handleViewBooking}
                >
                  <Text className="text-white text-lg font-semibold">
                    View Booking
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="bg-[#20319D] p-3 px-6 rounded-lg"
                  onPress={handleBookNow}
                >
                  <Text className="text-white text-lg font-semibold">
                    Book Now
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Details;
