import React, { useEffect, useState, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ApiHandler from "../../api/ApiHandler";
import { getUserDataFromFirebase } from "../../context/AuthContext";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const Favourites = () => {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFavourites, setSelectedFavourites] = useState([]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

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

  const fetchFavourites = useCallback(async () => {
    if (!currentUserId) return;

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
            const propertyResponse = await ApiHandler.get(
              `/Properties/${favourite.propertyId}`
            );

            // Ensure propertyResponse is valid before proceeding
            if (!propertyResponse) {
              console.warn(
                `Property details not found for propertyId: ${favourite.propertyId}`
              );
              return {
                ...favourite,
                property: null,
                imageUrl: "https://via.placeholder.com/300.png",
              };
            }

            const propertyImageResponse = await ApiHandler.get(
              `/PropertyImages?propertyId=${favourite.propertyId}`
            );

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
              property: null,
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
      setRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      fetchFavourites();
    }
  }, [currentUserId, fetchFavourites]);

  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        fetchFavourites();
      }
    }, [currentUserId, fetchFavourites])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFavourites();
  }, [fetchFavourites]);

  const handleRemoveFavourite = async (favouriteId) => {
    try {
      setLoading(true);
      await ApiHandler.delete(`/Favourites/${favouriteId}`);
      setFavourites((prevFavourites) =>
        prevFavourites.filter(
          (favourite) => favourite.favouriteId !== favouriteId
        )
      );
      Alert.alert("Success", "Property removed from favourites.");
    } catch (error) {
      console.error("Error removing favourite:", error);
      Alert.alert("Error", "Failed to remove from favourites.");
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyPress = (item) => {
    if (!item.property) {
      Alert.alert(
        "Error",
        "Property details not available. Cannot navigate to details page."
      );
      return;
    }

    router.push({
      pathname: "/(pages)/details-page",
      params: {
        propertyId: item.property.propertyId,
        landlordId: item.landlordId,
        title: item.title,
        description: item.description,
        city: item.city,
        municipality: item.municipality,
        ward: item.ward,
        nearestLandmark: item.nearestLandmark,
        price: item.price,
        roomType: item.roomType,
        status: item.status,
        totalBedrooms: item.totalBedrooms,
        totalLivingRooms: item.totalLivingRooms,
        totalWashrooms: item.totalWashrooms,
        totalKitchens: item.totalKitchens,
        image: item.imageUrl,
        imagesData: JSON.stringify([item.imageUrl]),
      },
    });
  };

  const toggleSelection = (favouriteId) => {
    setSelectedFavourites((prevSelected) => {
      if (prevSelected.includes(favouriteId)) {
        return prevSelected.filter((id) => id !== favouriteId);
      } else {
        return [...prevSelected, favouriteId];
      }
    });
  };

  const handleBulkRemove = async () => {
    if (selectedFavourites.length === 0) {
      Alert.alert("No items selected", "Please select items to remove.");
      return;
    }

    try {
      setLoading(true);
      await Promise.all(
        selectedFavourites.map((favouriteId) =>
          ApiHandler.delete(`/Favourites/${favouriteId}`)
        )
      );

      setFavourites((prevFavourites) =>
        prevFavourites.filter(
          (favourite) => !selectedFavourites.includes(favourite.favouriteId)
        )
      );

      setSelectedFavourites([]);
      Alert.alert("Success", "Selected items removed from favourites.");
      fetchFavourites(); // Refresh the list after removing
    } catch (error) {
      console.error("Error removing favourites:", error);
      Alert.alert("Error", "Failed to remove selected items.");
    } finally {
      setLoading(false);
    }
  };

  const renderFavouriteItem = ({ item }) => {
    const property = item.property || {};
    const isSelected = selectedFavourites.includes(item.favouriteId);

    const getStatusColor = (status) => {
      switch (status) {
        case "Rented":
          return "#DC2626";
        case "Available":
          return "#16A34A";
        case "Inactive":
          return "#6B7280";
        default:
          return "#20319D";
      }
    };

    const getStatusBgColor = (status) => {
      switch (status) {
        case "Rented":
          return "#FEE2E2";
        case "Available":
          return "#DCFCE7";
        case "Inactive":
          return "#F3F4F6";
        default:
          return "#EFF6FF";
      }
    };

    return (
      <View style={styles.propertyCard}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => toggleSelection(item.favouriteId)}
        >
          <View
            style={[styles.checkbox, isSelected && styles.checkboxSelected]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={12} color="#20319D" />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.propertyContent}
          onPress={() => handlePropertyPress(item)}
          activeOpacity={0.9}
        >
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.propertyImage}
              resizeMode="cover"
            />
            {property.roomType && (
              <View style={styles.propertyTypeBadge}>
                <Text style={styles.propertyTypeText}>{property.roomType}</Text>
              </View>
            )}
          </View>

          <View style={styles.propertyInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.propertyTitle} numberOfLines={1}>
                {property.title || "No Title Available"}
              </Text>
              {property.status && (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusBgColor(property.status) },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(property.status) },
                    ]}
                  >
                    {property.status}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.locationText} numberOfLines={1}>
                {property.city || "Unknown City"}, {property.municipality || ""}{" "}
                - {property.ward || ""}
              </Text>
            </View>

            <View style={styles.featuresRow}>
              {property.totalBedrooms > 0 && (
                <View style={styles.featureItem}>
                  <Ionicons name="bed-outline" size={14} color="#6B7280" />
                  <Text style={styles.featureText}>
                    {property.totalBedrooms}
                  </Text>
                </View>
              )}
              {property.totalWashrooms > 0 && (
                <View style={styles.featureItem}>
                  <Ionicons name="water-outline" size={14} color="#6B7280" />
                  <Text style={styles.featureText}>
                    {property.totalWashrooms}
                  </Text>
                </View>
              )}
              {property.totalKitchens > 0 && (
                <View style={styles.featureItem}>
                  <MaterialIcons name="kitchen" size={14} color="#6B7280" />
                  <Text style={styles.featureText}>
                    {property.totalKitchens}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>
                Rs. {property.price || "N/A"}
                <Text style={styles.priceSubtext}> / month</Text>
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with dynamic Remove button */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favourites</Text>
          {selectedFavourites.length > 0 ? (
            <TouchableOpacity
              style={styles.removeButtonHeader}
              onPress={handleBulkRemove}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.removeButtonHeaderText}>Remove</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.headerRight} />
          )}
        </View>

        {selectedFavourites.length > 0 && (
          <View style={styles.selectionCount}>
            {/* <Text style={styles.selectionCountText}>
              {selectedFavourites.length} selected
            </Text> */}
          </View>
        )}
      </View>

      {refreshing && (
        <View style={styles.refreshingIndicator}>
          <ActivityIndicator size="small" color="#20319D" />
          <Text style={styles.refreshingText}>Updating...</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20319D" />
          <Text style={styles.loadingText}>Loading Favourites...</Text>
        </View>
      ) : (
        <FlatList
          data={favourites}
          keyExtractor={(item) => item.favouriteId.toString()}
          renderItem={renderFavouriteItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/6134/6134065.png",
                }}
                style={styles.emptyImage}
              />
              <Text style={styles.emptyTitle}>No Favourites Yet</Text>
              <Text style={styles.emptyText}>
                Properties you mark as favourite will appear here
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push("/(tabs)/home")}
              >
                <Text style={styles.browseButtonText}>Browse Properties</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  headerContainer: {
    backgroundColor: "#20319D",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  headerRight: {
    width: 40,
  },
  selectionCount: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  selectionCountText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },

  // Error styles
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F5F7FA",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#DC2626",
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#20319D",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },

  // Refreshing indicator
  refreshingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  refreshingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6B7280",
  },

  // List styles
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  // Property card styles
  propertyCard: {
    backgroundColor: "white",
    borderRadius: 15,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
    position: "relative",
    flexDirection: "row",
  },
  propertyContent: {
    flex: 1,
    flexDirection: "row",
    padding: 16,
  },
  imageWrapper: {
    position: "relative",
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
  },
  propertyImage: {
    width: "100%",
    height: "100%",
  },
  propertyTypeBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  propertyTypeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  propertyInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  propertyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
  featuresRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 4,
  },
  priceRow: {
    marginTop: 4,
  },
  priceText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#20319D",
  },
  priceSubtext: {
    fontSize: 14,
    fontWeight: "normal",
    color: "#6B7280",
  },

  // Empty state styles
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 40,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: "#20319D",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  browseButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  checkboxContainer: {
    padding: 6, // Reduced padding
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 10, // Added left padding
  },
  checkbox: {
    width: 16, // Made even smaller
    height: 16, // Made even smaller
    borderRadius: 8, // Adjusted border radius
    borderWidth: 2,
    borderColor: "#20319D",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#D1D5DB",
    borderColor: "#20319D",
  },
  removeButtonHeader: {
    backgroundColor: "#EF4444",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  removeButtonHeaderText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default Favourites;
