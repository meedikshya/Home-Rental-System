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
import ApiHandler from "../../api/ApiHandler";

const Favourites = () => {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        const response = await ApiHandler.get("/Favourites");
        const favouritesData = response.data;

        if (!Array.isArray(favouritesData)) {
          throw new Error("Invalid API response format");
        }

        const favouritesWithProperties = await Promise.all(
          favouritesData.map(async (favourite) => {
            const propertyResponse = await ApiHandler.get(
              `/Properties/${favourite.propertyId}`
            );
            const propertyImageResponse = await ApiHandler.get(
              `/PropertyImages?propertyId=${favourite.propertyId}`
            );
            const propertyImage =
              propertyImageResponse.data[0]?.imageUrl ||
              "https://via.placeholder.com/300.png";
            return {
              ...favourite,
              property: propertyResponse.data,
              imageUrl: propertyImage,
            };
          })
        );

        setFavourites(favouritesWithProperties);
      } catch (error) {
        console.error("Error fetching favourites:", error);
        setError("Failed to load favourites.");
      } finally {
        setLoading(false);
      }
    };

    fetchFavourites();
  }, []);

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
      <View className="flex-1 justify-center items-center p-4">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-red-500 text-lg">{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={favourites}
      keyExtractor={(item) => item.favouriteId.toString()}
      renderItem={({ item }) => {
        return (
          <View className="p-4 border-b border-gray-300 flex-row">
            <Image
              source={{ uri: item.imageUrl }}
              className="w-28 h-28 rounded-lg"
              resizeMode="cover"
            />
            <View className="ml-4 flex-1">
              <Text className="text-lg font-semibold">
                {item.property?.title}
              </Text>
              <Text className="text-gray-600">{item.property?.city}</Text>
              <Text className="text-green-600 font-bold">
                Rs. {item.property?.price}
              </Text>
            </View>
            <TouchableOpacity
              className="bg-red-500 p-2 rounded-lg"
              onPress={() => handleRemoveFavourite(item.favouriteId)}
            >
              <Text className="text-white">Remove</Text>
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
};

export default Favourites;
