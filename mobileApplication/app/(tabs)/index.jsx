import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Search from "../../components/ui/search";
import ApiHandler from "../../api/ApiHandler";
import ProtectedRoute from "../(auth)/protectedRoute";

const Home = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        console.log("Fetching properties...");
        const [propertiesResponse, imagesResponse] = await Promise.all([
          ApiHandler.get("/Properties"),
          ApiHandler.get("/PropertyImages"),
        ]);

        // console.log("Properties response:", propertiesResponse);
        // console.log("Images response:", imagesResponse);

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
            className={`mb-4 ml-2 p-4 bg-gray-100 rounded-md shadow-md ${
              isLargeScreen ? "w-[55%]" : "w-[95%]"
            } justify-center`}
          >
            <Image
              source={{ uri: item.image }}
              className="w-full h-[350px] rounded-md"
              resizeMode="cover"
            />
            <View className="flex-row justify-between items-center mt-4">
              <Text className="text-lg font-semibold">{item.title}</Text>
              <Text className="text-base font-bold text-[#20319D]">
                {item.status}
              </Text>
            </View>
            <Text className="text-base text-gray-600">
              {item.district} | {item.city}, {item.municipality} - {item.ward}
            </Text>
            <Text className="text-lg font-bold text-gray-800 mt-2">
              Rs. {item.price}
            </Text>
            <Text className="text-base text-gray-800 mt-2">
              {item.roomType} | {item.totalBedrooms} bedrooms | |{" "}
              {item.totalLivingRooms} living rooms | {item.totalWashrooms}{" "}
              washrooms | {item.totalKitchens} kitchens
            </Text>
            <Text className="text-base text-gray-800 mt-2"></Text>

            <View className="mt-4 flex-row justify-between items-center w-36">
              <TouchableOpacity
                className="flex-1 bg-[#20319D] p-2 rounded-xl mr-2"
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
                <Text className="text-white text-center">View Details</Text>
              </TouchableOpacity>

              <TouchableOpacity className="absolute bottom-2 left-72">
                <Text>
                  <Ionicons name="heart-outline" size={24} color="#20319D" />{" "}
                </Text>
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
