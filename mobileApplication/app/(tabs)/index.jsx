// filepath: d:\Development\Node-React\FypAuth\mobileApplication\app\(tabs)\index.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import Search from "../../components/ui/search";
import ApiHandler from "../../api/ApiHandler";
import ProtectedRoute from "../(auth)/protectedRoute";
import { getUserDataFromFirebase } from "../../context/AuthContext";
import ImageSlider from "../../components/ui/ImageSlider";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Import

const Home = () => {
  const [properties, setProperties] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        Alert.alert("Error", "Unable to fetch user data.");
      }
    };

    fetchCurrentUserId();
  }, []);

  // Function to fetch properties and their images
  const fetchProperties = async () => {
    try {
      console.log("Fetching properties...");
      const [propertiesResponse, imagesResponse] = await Promise.all([
        ApiHandler.get("/Properties"),
        ApiHandler.get("/PropertyImages"),
      ]);

      const propertiesData = propertiesResponse;
      const imagesData = imagesResponse;

      // Group images by property ID
      const imagesByPropertyId = {};
      imagesData.forEach((img) => {
        if (!imagesByPropertyId[img.propertyId]) {
          imagesByPropertyId[img.propertyId] = [];
        }
        imagesByPropertyId[img.propertyId].push(img.imageUrl);
      });

      const propertiesWithImages = propertiesData.map((property) => {
        const propertyImages = imagesByPropertyId[property.propertyId] || [];

        return {
          ...property,
          // Use all images for the slider
          images:
            propertyImages.length > 0
              ? propertyImages
              : ["https://via.placeholder.com/300.png"],
          // Keep the first image as the main image for backwards compatibility
          image: propertyImages[0] || "https://via.placeholder.com/300.png",
        };
      });

      setProperties(propertiesWithImages);
      return true;
    } catch (error) {
      console.error("Error fetching properties:", error);
      setError("Failed to load properties.");
      return false;
    }
  };

  // Function to fetch user favorites
  const fetchFavorites = async () => {
    if (!currentUserId) return;

    try {
      console.log("Fetching favorites for user ID:", currentUserId);
      const favoritesResponse = await ApiHandler.get(
        `/Favourites/user/${currentUserId}`
      );
      console.log("Favorites Response:", favoritesResponse);
      const favoritePropertyIds = favoritesResponse.map(
        (favorite) => favorite.propertyId
      );
      setFavorites(favoritePropertyIds);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProperties();
    await fetchFavorites();
    setRefreshing(false);
  }, [currentUserId]);

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchProperties();
      setLoading(false);
    };

    loadInitialData();
  }, []);

  // Fetch favorites when user ID changes
  useEffect(() => {
    if (currentUserId) {
      fetchFavorites();
    }
  }, [currentUserId]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        console.log("Screen focused, refreshing data...");
        await fetchProperties();
        if (currentUserId) {
          await fetchFavorites();
        }
      };

      refreshData();
    }, [currentUserId])
  );

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
      console.log("Property ID to remove:", propertyId);

      if (!propertyId) {
        throw new Error("Invalid propertyId.");
      }

      // Send DELETE request to remove the favorite
      await ApiHandler.delete(
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
      <View className="flex-1 items-center justify-center bg-gray-100">
        <ActivityIndicator size="large" color="#20319D" />
        <Text className="mt-3 text-gray-600">Loading properties...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <Text className="text-red-500 text-lg">{error}</Text>
      </View>
    );
  }

  const { width } = Dimensions.get("window");
  const isLargeScreen = width > 768;

  // Helper function to determine status color
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

  return (
    <SafeAreaView className="bg-white flex-1">
      <View
        style={{
          // paddingTop: insets.top,
          paddingBottom: insets.bottom,
          flex: 1,
        }}
      >
        <View className="flex-row items-center py-4 px-3 border-b border-gray-200 bg-white">
          <Text className="text-lg font-semibold text-gray-800 ml-3">
            Properties
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Search Bar */}
          <View className="mb-4 p-3 mx-4">
            <View className="bg-white rounded-full shadow-md">
              <Search />
            </View>
          </View>

          {/* Property List */}
          <View className="px-5 pt-1">
            {properties.map((item) => {
              // Handle image press (moved inside the map function)
              const handleImagePress = (imageUri) => {
                // Navigate to the details page with the selected image
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
                    imagesData: JSON.stringify(item.images),
                  },
                });
              };

              return (
                <View
                  key={item.propertyId.toString()}
                  className="mb-4 bg-white rounded-xl shadow-md overflow-hidden"
                >
                  {/* Property Image */}
                  <View className="relative">
                    <ImageSlider
                      images={item.images}
                      imageHeight={400}
                      onImagePress={handleImagePress}
                    />
                    <TouchableOpacity
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                      style={{ backgroundColor: "rgba(255,255,255,0.8)" }} // Add a semi-transparent white background
                      onPress={() => handleFavoritePress(item.propertyId)}
                    >
                      <Ionicons
                        name={
                          favorites.includes(item.propertyId)
                            ? "heart"
                            : "heart-outline"
                        }
                        size={24}
                        color="#20319D"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Property Details */}
                  <View className="p-4">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-lg font-semibold text-gray-800">
                        {item.title}
                      </Text>
                      <View
                        className={`py-1 px-2 rounded-full border text-sm font-semibold ${getStatusBgColor(
                          item.status
                        )}`}
                      >
                        <Text className="text-gray-800">{item.status}</Text>
                      </View>
                    </View>
                    <Text className="text-gray-600 text-sm">
                      {item.city}, {item.municipality}
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      Property Type: {item.roomType}
                    </Text>

                    {/* Price and Details Button */}
                    <View className="mt-3 flex-row justify-between items-center">
                      <Text className="text-base font-bold text-[#20319D]">
                        Rs. {item.price}
                      </Text>
                      <TouchableOpacity
                        className="bg-[#20319D] py-2 px-4 rounded-full"
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
                              imagesData: JSON.stringify(item.images),
                            },
                          })
                        }
                      >
                        <Text className="text-white text-sm font-semibold">
                          Details
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const HomeWithProtectedRoute = () => (
  <ProtectedRoute>
    <Home />
  </ProtectedRoute>
);

export default HomeWithProtectedRoute;
