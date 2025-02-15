import React, { useEffect, useState } from "react";
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
import ApiHandler from "../../api/ApiHandler";

const Details = () => {
  const navigation = useNavigation();
  const route = useRoute();
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
  const router = useRouter();

  const [landlordName, setLandlordName] = useState("");

  useEffect(() => {
    const fetchLandlordName = async () => {
      try {
        const userDetailsResponse = await ApiHandler.get(
          `/UserDetails?userId=${landlordId}`
        );
        const { firstName, lastName } = userDetailsResponse[0];
        setLandlordName(`${firstName} ${lastName}`);
      } catch (error) {
        console.error("Error fetching landlord name:", error);
      }
    };

    fetchLandlordName();
  }, [landlordId]);

  const handleBookNow = async () => {
    try {
      const bookingData = {
        userId: landlordId, // Assuming the userId is the landlordId, adjust as needed
        propertyId,
        status: "Pending",
        bookingDate: new Date().toISOString(),
      };

      await ApiHandler.post("/bookings", bookingData);

      Alert.alert("Success", "Booking has been made successfully!");
      router.push({
        pathname: "agreement-page",
        params: {
          propertyId,
          image,
          address: ` ${city}, ${municipality} - ${ward}`,
          bedrooms: totalBedrooms,
          bathrooms: totalWashrooms,
          kitchen: totalKitchens,
          price,
        },
      });
    } catch (error) {
      console.error("Error making booking:", error);
      Alert.alert("Error", "Failed to make booking. Please try again.");
    }
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
                Nearest Landmark : {nearestLandmark}
              </Text>
            </View>
          )}

          <View className="flex-row flex-wrap mt-4 ">
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
                  {totalLivingRooms} Living Rooms
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
            <TouchableOpacity
              onPress={() => alert(`Chat with landlord ${landlordName}`)}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#20319D" />
            </TouchableOpacity>
          </View>
          <View className="bg-gray-50  rounded-lg shadow-md mt-6">
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-bold text-gray-800">
                Rs. {price}{" "}
                <Text className="text-sm text-gray-500">/ per month</Text>
              </Text>
              <TouchableOpacity
                className="bg-[#20319D] p-3 px-6 rounded-lg"
                onPress={handleBookNow}
              >
                <Text className="text-white text-lg font-semibold">
                  Book Now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Details;
