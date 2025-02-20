import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ApiHandler from "../../api/ApiHandler";
import { getUserDataFromFirebase } from "../../context/AuthContext";

const Favourites = () => {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Fetch current user ID from Firebase
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const userId = await getUserDataFromFirebase();
        console.log("Fetched Firebase User ID:", userId);
        if (userId) {
          setCurrentUserId(userId);
        }
      } catch (error) {
        console.error("Error fetching user data from Firebase:", error);
        setError("Unable to fetch user data.");
      }
    };

    fetchCurrentUserId();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchFavourites = async () => {
      try {
        setLoading(true);
        const response = await ApiHandler.get(
          `/Favourites/user/${currentUserId}`
        );
        console.log("API Response:", response);

        const favouritesData = response || [];
        console.log("favourites items", favouritesData);

        const favouritesWithProperties = await Promise.all(
          favouritesData.map(async (favourite) => {
            try {
              const [propertyResponse, propertyImageResponse] =
                await Promise.all([
                  ApiHandler.get(`/Properties/${favourite.propertyId}`),
                  ApiHandler.get(
                    `/PropertyImages?propertyId=${favourite.propertyId}`
                  ),
                ]);

              return {
                ...favourite,
                property: propertyResponse || {},
                imageUrl:
                  propertyImageResponse?.[0]?.imageUrl ||
                  "https://via.placeholder.com/300.png",
              };
            } catch (error) {
              console.error(`Error fetching property details:`, error);
              return {
                ...favourite,
                property: {},
                imageUrl: "https://via.placeholder.com/300.png",
              };
            }
          })
        );

        setFavourites(favouritesWithProperties);
        setError(null);
      } catch (error) {
        console.error("Error fetching favourites:", error);
        setError("Failed to fetch favourites.");
      } finally {
        setLoading(false);
      }
    };

    fetchFavourites();
  }, [currentUserId]);

  const handleRemoveFavourite = async (favouriteId) => {
    try {
      await ApiHandler.delete(`/Favourites/${favouriteId}`);
      setFavourites((prevFavourites) =>
        prevFavourites.filter(
          (favourite) => favourite.favouriteId !== favouriteId
        )
      );
      Alert.alert("Success", "Favourite removed successfully.");
    } catch (error) {
      console.error("Error removing favourite:", error);
      Alert.alert("Error", "Failed to remove favourite.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center p-4 bg-white">
        <ActivityIndicator size="large" color="#20319D" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-4 bg-white">
        <Text className="text-red-500 text-lg">{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="bg-white flex-1">
      <Text className="text-2xl font-bold text-center text-[#20319D] py-4">
        Your Favourite Properties
      </Text>
      <FlatList
        data={favourites}
        keyExtractor={(item) => item.favouriteId.toString()}
        renderItem={({ item }) => (
          <View className="m-4 p-4 bg-white shadow-lg rounded-xl flex-row items-center">
            <Image
              source={{ uri: item.imageUrl }}
              className="w-32 h-32 rounded-lg shadow-md"
              resizeMode="cover"
            />
            <View className="ml-4 flex-1">
              <Text className="text-lg font-semibold text-[#20319D]">
                {item.property?.title || "No Title Available"}
              </Text>
              <Text className="text-gray-600">
                {item.property?.city || "Unknown City"}
              </Text>
              <Text className="text-green-600 font-bold">
                Rs. {item.property?.price || "N/A"}
              </Text>
            </View>
            <TouchableOpacity
              className="bg-red-500 p-2 rounded-lg"
              onPress={() => handleRemoveFavourite(item.favouriteId)}
            >
              <Text className="text-white">Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center p-4">
            <Text className="text-gray-500 text-lg">
              No favourites available.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default Favourites;
