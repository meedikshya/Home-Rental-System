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
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Search from "../../components/ui/search";

const Home = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const [propertiesResponse, imagesResponse] = await Promise.all([
          axios.get("http://192.168.1.86:8000/api/Properties"),
          axios.get("http://192.168.1.86:8000/api/PropertyImages"),
        ]);

        const propertiesData = propertiesResponse.data;
        const imagesData = imagesResponse.data;

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
              <Text className="text-lg font-semibold">{item.address}</Text>
              <Text className="text-base font-bold text-[#20319D]">
                {item.status}
              </Text>
            </View>
            <Text className="text-base text-gray-600">{item.city}</Text>
            <Text className="text-lg font-bold text-gray-800 mt-2">
              Rs. {item.price}
            </Text>

            <View className="mt-4 flex-row justify-between items-center w-36">
              <TouchableOpacity
                className="flex-1 bg-[#20319D] p-2 rounded-xl mr-2"
                onPress={() =>
                  router.push({
                    pathname: "/(pages)/details-page",
                    params: {
                      propertyId: item.propertyId,
                      userId: item.userId,
                      address: item.address,
                      city: item.city,
                      price: item.price,
                      propertyType: item.propertyType,
                      bedrooms: item.bedrooms,
                      bathrooms: item.bathrooms,
                      status: item.status,
                      createdAt: item.createdAt,
                      image: item.image,
                    },
                  })
                }
              >
                <Text className="text-white text-center">View Details</Text>
              </TouchableOpacity>

              <TouchableOpacity className="absolute bottom-2 left-72">
                <Ionicons name="heart-outline" size={24} color="#20319D" />{" "}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

export default Home;
