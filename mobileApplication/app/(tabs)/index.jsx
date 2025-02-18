import React, { useEffect, useState, useContext } from "react";
import {
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Search from "../../components/ui/search";
import ApiHandler from "../../api/ApiHandler";
import ProtectedRoute from "../(auth)/protectedRoute";
import { getUserDataFromFirebase } from "../../context/AuthContext";

const Home = () => {
  const [properties, setProperties] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const router = useRouter();

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

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        console.log("Fetching properties...");
        const [propertiesResponse, imagesResponse] = await Promise.all([
          ApiHandler.get("/Properties"),
          ApiHandler.get("/PropertyImages"),
        ]);

        const propertiesData = propertiesResponse;
        const imagesData = imagesResponse;

        const propertiesWithImages = propertiesData.map((property) => {
          const propertyImage = imagesData.find(
            (img) => img.propertyId === property.propertyId
          );
          return {
            ...property,
            image: propertyImage
              ? propertyImage.imageUrl
              : "https://via.placeholder.com/300.png",
          };
        });

        setProperties(propertiesWithImages);
      } catch (error) {
        console.error("Error fetching properties:", error);
        setError("Failed to load properties.");
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  useEffect(() => {
    const fetchFavorites = async () => {
      console.log("Fetching favorites for user ID:", currentUserId); // Add logging
      const favoritesResponse = await ApiHandler.get(
        `/Favourites/user/${currentUserId}`
      );
      console.log("Favorites Response:", favoritesResponse); // Log the full response
      const favoritePropertyIds = favoritesResponse.map(
        (favorite) => favorite.propertyId
      );
      setFavorites(favoritePropertyIds);
    };

    if (currentUserId) {
      fetchFavorites();
    }
  }, [currentUserId]);

  const handleAddToFavorites = async (propertyId) => {
    try {
      const favoriteData = {
        userId: currentUserId,
        propertyId: propertyId,
      };

      await ApiHandler.post("/Favourites", favoriteData);
      setFavorites([...favorites, propertyId]);
      Alert.alert("Success", "Property added to favorites.");
    } catch (error) {
      console.error("Error adding to favorites:", error);
      Alert.alert("Error", "Failed to add property to favorites.");
    }
  };

  const handleRemoveFromFavorites = async (propertyId) => {
    try {
      console.log("Removing favorite for user ID:", currentUserId);
      console.log("Property ID to remove:", propertyId); // Add logging to check the propertyId

      // Check if propertyId is valid
      if (!propertyId) {
        throw new Error("Invalid propertyId.");
      }

      // Send DELETE request to remove the favorite
      const response = await ApiHandler.delete(
        `/Favourites/remove?userId=${currentUserId}&propertyId=${propertyId}`
      );

      setFavorites((prevFavorites) =>
        prevFavorites.filter((fav) => fav !== propertyId)
      );
      Alert.alert("Success", "Property removed from favorites.");
    } catch (error) {
      console.error("Error removing from favorites:", error.message || error);
      Alert.alert("Error", "Failed to remove property from favorites.");
    }
  };

  const handleFavoritePress = (propertyId) => {
    if (favorites.includes(propertyId)) {
      Alert.alert(
        "Remove from Favorites",
        "Are you sure you want to remove this property from your favorites?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Yes",
            onPress: () => handleRemoveFromFavorites(propertyId),
          },
        ]
      );
    } else {
      handleAddToFavorites(propertyId);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-red-500 text-lg">{error}</Text>
      </View>
    );
  }

  const { width } = Dimensions.get("window");
  const isLargeScreen = width > 768;

  return (
    <View className="flex-1 bg-white p-2">
      <View className="flex-row justify-center items-center mb-5">
        <View className="bg-white rounded-full w-11/12 items-center shadow-lg text-white text-2xl p-2 text-center">
          <Search />
        </View>
      </View>

      <FlatList
        data={properties}
        keyExtractor={(item) => item.propertyId.toString()}
        numColumns={isLargeScreen ? 2 : 1}
        columnWrapperStyle={
          isLargeScreen ? { justifyContent: "center" } : undefined
        }
        renderItem={({ item }) => (
          <View
            className={`mb-4 ml-2 p-4 bg-white rounded-lg shadow-lg ${
              isLargeScreen ? "w-[45%]" : "w-[95%]"
            } justify-center`}
          >
            <Image
              source={{ uri: item.image }}
              className="w-full h-[300px] rounded-lg"
              resizeMode="cover"
            />
            <View className="flex-row justify-between items-center mt-4">
              <Text className="text-xl font-bold text-gray-800">
                {item.title}
              </Text>
              <Text className="text-base font-bold text-[#20319D]">
                {item.status}
              </Text>
            </View>
            {item.city && item.municipality && item.ward && (
              <Text className="text-lg text-gray-600 mt-1">
                {item.city}, {item.municipality} - {item.ward}
              </Text>
            )}
            {item.roomType && (
              <Text className="text-lg text-gray-600 mt-1">
                Property Type: {item.roomType}
              </Text>
            )}
            <View className="flex-row flex-wrap mt-2">
              {item.totalBedrooms && (
                <Text className="text-base text-gray-800 mr-2">
                  {item.totalBedrooms} bedrooms
                </Text>
              )}
              {item.totalLivingRooms && (
                <Text className="text-base text-gray-800 mr-2">
                  {item.totalLivingRooms} living rooms
                </Text>
              )}
              {item.totalWashrooms && (
                <Text className="text-base text-gray-800 mr-2">
                  {item.totalWashrooms} washrooms
                </Text>
              )}
              {item.totalKitchens && (
                <Text className="text-base text-gray-800 mr-2">
                  {item.totalKitchens} kitchens
                </Text>
              )}
            </View>
            {item.price && (
              <Text className="text-lg font-bold text-[#20319D] mt-2">
                Rs. {item.price}
              </Text>
            )}

            {/* Updated Button and Favorite Icon Layout */}
            <View className="mt-4 flex-row justify-between items-center">
              <TouchableOpacity
                className="bg-[#20319D] p-3 rounded-lg"
                style={{ width: "50%" }} // Adjust width here
                onPress={() =>
                  router.push({
                    pathname: "/(pages)/details-page",
                    params: {
                      propertyId: item.propertyId,
                      landlordId: item.landlordId,
                      title: item.title,
                      description: item.description,
                      district: item.district,
                      city: item.city,
                      municipality: item.municipality,
                      ward: item.ward,
                      nearestLandmark: item.nearestLandmark,
                      price: item.price,
                      roomType: item.roomType,
                      status: item.status,
                      createdAt: item.createdAt,
                      totalBedrooms: item.totalBedrooms,
                      totalLivingRooms: item.totalLivingRooms,
                      totalWashrooms: item.totalWashrooms,
                      totalKitchens: item.totalKitchens,
                      image: item.image,
                    },
                  })
                }
              >
                <Text className="text-white text-center text-base">
                  View Details
                </Text>
              </TouchableOpacity>

              {/* Favorite Icon */}
              <TouchableOpacity
                onPress={() => handleFavoritePress(item.propertyId)}
              >
                <Ionicons
                  name={
                    favorites.includes(item.propertyId)
                      ? "heart"
                      : "heart-outline"
                  }
                  size={30}
                  color="#20319D"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const HomeWithProtectedRoute = () => (
  <ProtectedRoute>
    <Home />
  </ProtectedRoute>
);

export default HomeWithProtectedRoute;
