import React from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons"; // Import icons
import { useNavigation, useRoute } from "@react-navigation/native";
import { useRouter } from "expo-router"; // Import useRouter hook

const Details = () => {
  const navigation = useNavigation(); // Initialize navigation
  const route = useRoute(); // Initialize route
  const {
    propertyId,
    userId,
    address,
    city,
    price,
    propertyType,
    bedrooms,
    bathrooms,
    kitchen,
    status,
    createdAt,
    image,
  } = route.params; // Get individual property attributes from route params
  const router = useRouter(); // Initialize router

  return (
    <SafeAreaView className="bg-white flex-1">
      {/* Header with back button */}
      <View className="flex-row items-center p-4">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-2xl ml-4">Property Details</Text>
      </View>

      {/* Property details */}
      <View className="flex-1 p-5">
        <Image
          source={{ uri: image }}
          className="w-full h-[350px] rounded-md"
          resizeMode="cover"
        />
        <View className="mt-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-semibold">{address}</Text>
            <Text className="text-base font-bold text-[#20319D]">{status}</Text>
          </View>
          <Text className="text-base text-gray-600">{city}</Text>
          <View className="flex-row items-center mt-2">
            {bedrooms && (
              <View className="flex-row items-center mr-4">
                <Ionicons name="bed-outline" size={24} color="#20319D" />
                <Text className="text-base text-gray-600 ml-1">
                  {bedrooms} bedrooms
                </Text>
              </View>
            )}
            {bathrooms && (
              <View className="flex-row items-center mr-4">
                <Ionicons name="water-outline" size={24} color="#20319D" />
                <Text className="text-base text-gray-600 ml-1">
                  {bathrooms} bathrooms
                </Text>
              </View>
            )}
            {kitchen && (
              <View className="flex-row items-center">
                <MaterialIcons name="kitchen" size={24} color="#20319D" />
                <Text className="text-base text-gray-600 ml-1">
                  {kitchen} kitchen
                </Text>
              </View>
            )}
          </View>
          <View className="border-b border-gray-300 my-3" />
          <View className="flex-row justify-between items-center mt-1">
            <Text className="text-base text-gray-600">Property by: Ram</Text>
            <TouchableOpacity onPress={() => alert("Chat with Ram")}>
              <Ionicons name="chatbubble-outline" size={24} color="#20319D" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View className="p-0 absolute bottom-0 left-0 right-0">
        <View className="bg-white p-4 rounded-md shadow-md shadow-gray-400 flex-row justify-between items-center">
          <Text className="text-lg font-bold text-gray-800">
            Rs. {price} <Text className="text-sm">/ per month</Text>
          </Text>

          <TouchableOpacity
            className="bg-[#20319D] p-3 rounded-md"
            onPress={() =>
              router.push({
                pathname: "agreement-page",
                params: {
                  propertyId,
                  image,
                  address,
                  bedrooms,
                  bathrooms,
                  kitchen,
                  price,
                },
              })
            }
          >
            <Text className="text-white w-28 text-center text-base">
              Book Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Details;
