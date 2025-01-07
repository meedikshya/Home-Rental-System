import React, { useEffect, useState } from 'react';
import { Text, View, FlatList, Image, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { Ionicons } from 'react-native-vector-icons';
import { styled } from 'nativewind';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

type Favourite = {
  favouriteId: number;
  userId: number;
  propertyId: number;
  createdAt: string;
  property?: Property;
};

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
};

const Favourites: React.FC = () => {
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        const response = await axios.get('https://localhost:7008/api/Favourites');
        const favouritesData = response.data;

        // Fetch property details for each favourite
        const favouritesWithProperties = await Promise.all(
          favouritesData.map(async (favourite: Favourite) => {
            const propertyResponse = await axios.get(`https://localhost:7008/api/Properties/${favourite.propertyId}`);
            return {
              ...favourite,
              property: propertyResponse.data,
            };
          })
        );

        setFavourites(favouritesWithProperties);
      } catch (error) {
        console.error('Error fetching favourites:', error);
        setError('Failed to load favourites.');
      } finally {
        setLoading(false);
      }
    };

    fetchFavourites();
  }, []);

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

  return (
    <View className="flex-1 bg-white p-5">
      <Text className="text-2xl font-bold mb-5">My Favourites</Text>
      <FlatList
        data={favourites}
        keyExtractor={(item) => item.favouriteId.toString()}
        renderItem={({ item }: { item: Favourite }) => (
          <View className="mb-5 p-4 bg-gray-100 rounded-lg shadow-md" style={{ width: wp('90%') }}>
            <Image
              source={{ uri: item.property?.image || 'https://via.placeholder.com/300' }}
              className="w-full h-52 rounded-lg"
              resizeMode="cover"
            />
            <Text className="text-lg font-bold mt-3">{item.property?.address}</Text>
            <Text className="text-base text-gray-600">{item.property?.city}</Text>
            <Text className="text-base font-bold text-gray-800 mt-2">${item.property?.price}</Text>
            <View className="flex-row justify-end mt-3">
              <Ionicons name="heart" size={24} color="red" />
            </View>
          </View>
        )}
      />
    </View>
  );
};

export default Favourites;