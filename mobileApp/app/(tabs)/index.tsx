import React, { useEffect, useState } from 'react';
import { Text, View, FlatList, Image, ActivityIndicator, TouchableOpacity, Button, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import axios from 'axios';
import { styled } from 'nativewind';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Toast from 'react-native-toast-message';

type Property = {
  propertyId: number;
  userId: number;
  address: string;
  city: string;
  price: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  status: string;
  createdAt: string;
  image?: string;
  isFavorite?: boolean;
};

type PropertyImage = {
  imageId: number;
  propertyId: number;
  imageUrl: string;
  createdAt: string;
};

const Home: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const [propertiesResponse, imagesResponse] = await Promise.all([
          axios.get('https://localhost:7008/api/Properties'),
          axios.get('https://localhost:7008/api/PropertyImages')
        ]);

        const propertiesData = propertiesResponse.data;
        const imagesData = imagesResponse.data;

        const propertiesWithImages = propertiesData.map((property: Property) => {
          const propertyImage = imagesData.find((img: PropertyImage) => img.propertyId === property.propertyId);
          return {
            ...property,
            image: propertyImage ? propertyImage.imageUrl : null,
            isFavorite: false
          };
        });

        setProperties(propertiesWithImages);
      } catch (error) {
        console.error('Error fetching properties:', error);
        setError('Failed to load properties.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const handleFavorite = async (propertyId: number, userId: number) => {
    try {
      const favouriteData = {
        favouriteId: 0, // Assuming the backend will handle the ID generation
        userId,
        propertyId,
        createdAt: new Date().toISOString()
      };
      await axios.post('https://localhost:7008/api/Favourites', favouriteData);
      setProperties((prevProperties) =>
        prevProperties.map((property) =>
          property.propertyId === propertyId ? { ...property, isFavorite: true } : property
        )
      );
      Toast.show({
        type: 'success',
        text1: 'Added to Favorites',
        text2: `Property ${propertyId} has been added to your favorites.`
      });
      console.log(`Property ${propertyId} added to favorites`);
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-5">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-5">
        <Text className="text-red-500 text-lg">{error}</Text>
      </View>
    );
  }

  const { width } = Dimensions.get('window');
  const isLargeScreen = width > 768;

  return (
    <ScrollView className="flex-1 bg-white p-5">
      <Text className="text-2xl font-bold mb-5">Property Rental System</Text>
      <FlatList
        data={properties}
        keyExtractor={(item) => item.propertyId.toString()}
        numColumns={isLargeScreen ? 2 : 1}
        columnWrapperStyle={isLargeScreen ? { justifyContent: 'space-between' } : undefined}
        renderItem={({ item }: { item: Property }) => (
          <View className="mb-5 p-4 bg-gray-100 rounded-lg shadow-md" style={{ width: isLargeScreen ? wp('45%') : wp('90%') }}>
            <Image
              source={{ uri: item.image || 'https://via.placeholder.com/300' }}
              className="w-full h-52 rounded-lg"
              resizeMode="cover"
              onError={(e) => console.error('Image load error:', e.nativeEvent.error)}
            />
            <Text className="text-lg font-bold mt-3">{item.address}</Text>
            <Text className="text-base text-gray-600">{item.city}</Text>
            <Text className="text-base font-bold text-gray-800 mt-2">${item.price}</Text>

            <View className="flex-row justify-between items-center mt-3">
              <TouchableOpacity onPress={() => handleFavorite(item.propertyId, item.userId)}>
                <Ionicons name={item.isFavorite ? "heart" : "heart-outline"} size={24} color="red" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Button title="View Details" onPress={() => { /* Navigate to details page */ }} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <Toast />
    </ScrollView>
  );
};

export default Home;