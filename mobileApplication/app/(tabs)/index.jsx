import React, { useEffect, useState, useCallback } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import Search from "../../components/ui/search";
import ApiHandler from "../../api/ApiHandler";
import ProtectedRoute from "../(auth)/protectedRoute";
import { getUserDataFromFirebase } from "../../context/AuthContext";
import ImageSlider from "../../components/ui/ImageSlider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Home = () => {
  const [properties, setProperties] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [activeFilters, setActiveFilters] = useState(null);

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

      // Extract unique property types
      const uniquePropertyTypes = [
        ...new Set(propertiesData.map((property) => property.roomType)),
      ];
      setPropertyTypes(uniquePropertyTypes);

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
      setFilteredProperties(propertiesWithImages);
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

  useEffect(() => {
    // When properties change or filters change, apply filtering
    if (activeFilters) {
      applyFilters(activeFilters);
    } else {
      setFilteredProperties(properties);
    }
  }, [properties, activeFilters]);

  // Add this function to handle filter application
  const applyFilters = (filters) => {
    console.log("Index received filters:", filters);
    setActiveFilters(filters);

    if (!filters) {
      // Reset filters
      setFilteredProperties(properties);
      return;
    }

    // Apply filters
    let filtered = [...properties];

    // Filter by city
    if (filters.city) {
      filtered = filtered.filter((property) => property.city === filters.city);
    }

    // Filter by property type
    if (filters.roomType) {
      filtered = filtered.filter(
        (property) => property.roomType === filters.roomType
      );
    }

    // Filter by availability status
    if (filters.status) {
      filtered = filtered.filter(
        (property) => property.status === filters.status
      );
    }

    // Filter by price range
    if (filters.minPrice) {
      filtered = filtered.filter(
        (property) => parseInt(property.price) >= filters.minPrice
      );
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(
        (property) => parseInt(property.price) <= filters.maxPrice
      );
    }

    // Corrected property feature filters with proper property names
    if (filters.totalBedrooms) {
      filtered = filtered.filter(
        (property) => property.totalBedrooms >= filters.totalBedrooms
      );
    }

    if (filters.totalWashrooms) {
      filtered = filtered.filter(
        (property) => property.totalWashrooms >= filters.totalWashrooms
      );
    }

    if (filters.totalKitchens) {
      filtered = filtered.filter(
        (property) => property.totalKitchens >= filters.totalKitchens
      );
    }

    setFilteredProperties(filtered);
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
    <View style={styles.container}>
      {/* Modern Clean Header */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerContent, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="home" size={24} color="white" />
            <Text style={styles.headerTitle}>Properties</Text>
          </View>

          {/* Add some action buttons to balance the header */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push("/(pages)/move-in-assistance")}
            >
              {/* <Ionicons name="-outline" size={24} color="white" /> */}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Container */}
      <View style={styles.searchContainer}>
        <Search
          onFilterApplied={applyFilters}
          activeFilters={activeFilters}
          propertyTypes={propertyTypes}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Property Cards Section */}
        <View style={styles.propertiesSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="grid-outline" size={18} color="#20319D" />
            <Text style={styles.sectionTitle}>
              Properties
              {/* {activeFilters ? " (Filtered)" : ""} */}
            </Text>
          </View>

          {/* No Properties Message */}
          {filteredProperties.length === 0 && (
            <View className="px-5 pt-1 flex items-center justify-center py-10 bg-gray-50 rounded-xl mx-5 mb-4">
              <Ionicons name="search-outline" size={50} color="#CCCCCC" />
              <Text className="text-lg font-semibold text-gray-600 mt-4 text-center">
                No properties found
              </Text>
              <Text className="text-sm text-gray-500 mt-2 text-center px-5">
                {activeFilters
                  ? "No properties match your search criteria. Try adjusting your filters."
                  : "There are no properties available at the moment."}
              </Text>
              {activeFilters && (
                <TouchableOpacity
                  className="mt-5 bg-[#20319D] py-2 px-6 rounded-full"
                  onPress={() => applyFilters(null)}
                >
                  <Text className="text-white font-medium">Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Property Cards Section */}
          <View style={styles.propertiesSection}>
            <View style={styles.sectionHeader}></View>

            {/* Property List */}
            <View style={styles.propertiesGrid}>
              {filteredProperties.map((item) => {
                const handleImagePress = (imageUri) => {
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
                    style={styles.propertyCard}
                  >
                    {/* Property Image */}
                    <View style={styles.imageContainer}>
                      <ImageSlider
                        images={item.images}
                        imageHeight={220}
                        onImagePress={handleImagePress}
                      />
                      <TouchableOpacity
                        style={styles.favoriteButton}
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

                      {/* Add property type badge */}
                      <View style={styles.propertyTypeBadge}>
                        <Text style={styles.propertyTypeText}>
                          {item.roomType}
                        </Text>
                      </View>
                    </View>

                    {/* Property Details */}
                    <View style={styles.propertyDetails}>
                      <View style={styles.titleRow}>
                        <Text style={styles.propertyTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: getStatusBgColor(
                                item.status
                              ).includes("red")
                                ? "#FEE2E2"
                                : getStatusBgColor(item.status).includes(
                                    "green"
                                  )
                                ? "#DCFCE7"
                                : "#F3F4F6",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color: getStatusBgColor(item.status).includes(
                                  "red"
                                )
                                  ? "#DC2626"
                                  : getStatusBgColor(item.status).includes(
                                      "green"
                                    )
                                  ? "#16A34A"
                                  : "#6B7280",
                              },
                            ]}
                          >
                            {item.status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.locationRow}>
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color="#666"
                          style={styles.locationIcon}
                        />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {item.city}, {item.municipality}
                        </Text>
                      </View>

                      {/* Features row */}
                      <View style={styles.featuresRow}>
                        {item.totalBedrooms > 0 && (
                          <View style={styles.featureItem}>
                            <Ionicons
                              name="bed-outline"
                              size={16}
                              color="#666"
                            />
                            <Text style={styles.featureText}>
                              {item.totalBedrooms}
                            </Text>
                          </View>
                        )}

                        {item.totalWashrooms > 0 && (
                          <View style={styles.featureItem}>
                            <Ionicons
                              name="water-outline"
                              size={16}
                              color="#666"
                            />
                            <Text style={styles.featureText}>
                              {item.totalWashrooms}
                            </Text>
                          </View>
                        )}

                        {item.totalKitchens > 0 && (
                          <View style={styles.featureItem}>
                            <Ionicons
                              name="restaurant-outline"
                              size={16}
                              color="#666"
                            />
                            <Text style={styles.featureText}>
                              {item.totalKitchens}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Price and Details Button */}
                      <View style={styles.priceActionRow}>
                        <View style={styles.priceContainer}>
                          <Text style={styles.priceLabel}>Price</Text>
                          <Text style={styles.priceValue}>
                            Rs. {item.price}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.detailsButton}
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
                          <Text style={styles.detailsButtonText}>Details</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  // Header Container & Search
  headerContainer: {
    backgroundColor: "#20319D",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 8,
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "white",
    marginLeft: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginTop: -16,
    marginBottom: -24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 10,
  },

  // Content Section
  content: {
    flex: 1,
    paddingTop: 30,
  },
  contentContainer: {
    paddingBottom: 30,
  },

  // Section Header
  propertiesSection: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginLeft: 30,
  },

  // Property Grid
  propertiesGrid: {
    marginTop: 4,
  },

  // Property Card
  propertyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 50,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  propertyTypeBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  propertyTypeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  // Property Details
  propertyDetails: {
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationIcon: {
    marginRight: 4,
  },
  locationText: {
    color: "#666",
    fontSize: 14,
  },
  featuresRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  featureText: {
    marginLeft: 4,
    color: "#666",
    fontSize: 14,
  },
  priceActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
    paddingTop: 12,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: "#666",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#20319D",
  },
  detailsButton: {
    backgroundColor: "#20319D",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});

const HomeWithProtectedRoute = () => (
  <ProtectedRoute>
    <Home />
  </ProtectedRoute>
);

export default HomeWithProtectedRoute;
