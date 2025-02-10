import React, { useEffect, useState } from "react";
import { Text, View, FlatList, Image, ActivityIndicator } from "react-native";
import axios from "axios";

const Favourites = () => {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        const response = await axios.get(
          "http://192.168.1.86:8000/api/Favourites"
        );
        const favouritesData = response.data;

        const favouritesWithProperties = await Promise.all(
          favouritesData.map(async (favourite) => {
            const propertyResponse = await axios.get(
              `http://192.168.1.86:8000/api/Properties/${favourite.propertyId}`
            );
            return {
              ...favourite,
              property: propertyResponse.data,
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
        const imageUrl =
          item.property?.image || "https://via.placeholder.com/300.png";

        return (
          <View className="p-4 border-b border-gray-300">
            <Image
              source={{
                uri: imageError
                  ? "https://via.placeholder.com/300.png"
                  : imageUrl,
              }}
              className="w-full h-48 rounded-lg mb-2"
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
            <Text className="text-lg font-semibold">
              {item.property?.address}
            </Text>
            <Text className="text-gray-600">{item.property?.city}</Text>
            <Text className="text-green-600 font-bold">
              ${item.property?.price}
            </Text>
          </View>
        );
      }}
    />
  );
};

export default Favourites;
