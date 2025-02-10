import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Button,
  Dimensions,
  StyleSheet,
} from "react-native";
import axios from "axios";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

const Home = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const [propertiesResponse, imagesResponse] = await Promise.all([
          axios.get("http://10.0.2.2:8000/api/Properties"),
          axios.get("http://10.0.2.2:8000/api/PropertyImages"),
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const { width } = Dimensions.get("window");
  const isLargeScreen = width > 768;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Property Rental System</Text>
      <FlatList
        data={properties}
        keyExtractor={(item) => item.propertyId.toString()}
        numColumns={isLargeScreen ? 2 : 1}
        columnWrapperStyle={
          isLargeScreen ? { justifyContent: "space-between" } : undefined
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.itemContainer,
              { width: isLargeScreen ? wp("45%") : wp("90%") },
            ]}
          >
            <Image
              source={{ uri: item.image }}
              style={styles.image}
              resizeMode="cover"
              onError={(e) => {
                console.error("Image load error:", e.nativeEvent.error);
                e.target.src = "https://via.placeholder.com/300.png";
              }}
            />
            <Text style={styles.itemTitle}>{item.address}</Text>
            <Text style={styles.itemText}>{item.city}</Text>
            <Text style={styles.itemPrice}>${item.price}</Text>

            <View style={styles.actionsContainer}>
              <TouchableOpacity>
                <Button title="View Details" onPress={() => {}} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  itemContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
  },
  itemText: {
    fontSize: 16,
    color: "#666",
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  errorText: {
    color: "red",
    fontSize: 18,
  },
});

export default Home;
