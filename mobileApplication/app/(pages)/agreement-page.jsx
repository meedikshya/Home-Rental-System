import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

const Agreement = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { propertyId, image, address, bedrooms, bathrooms, kitchen, price } =
    route.params;

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isStartPickerVisible, setStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setEndPickerVisible] = useState(false);

  const handleConfirmStart = (date) => {
    setStartDate(date);
    setEndDate(null); // Reset end date when start date changes
    setStartPickerVisible(false);
  };

  const handleConfirmEnd = (date) => {
    if (!startDate) {
      Alert.alert("Error", "Please select a start date first.");
      return;
    }

    const minEndDate = new Date(startDate);
    minEndDate.setMonth(minEndDate.getMonth() + 3); // Ensure end date is at least 3 months ahead

    if (date < minEndDate) {
      Alert.alert("Error", "Lease period must be at least 3 months.");
    } else {
      setEndDate(date);
    }
    setEndPickerVisible(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="flex-row items-center p-4 bg-white shadow-md">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-2xl font-semibold ml-4">Agreement</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white p-4 rounded-lg shadow-lg flex-row">
          <Image
            source={{ uri: image }}
            className="w-28 h-28 rounded-lg"
            resizeMode="cover"
          />
          <View className="ml-4 flex-1">
            <Text className="text-xl font-semibold">{address}</Text>
            <Text className="text-gray-600 text-base">{bedrooms} Bedrooms</Text>
            <Text className="text-gray-600 text-base">
              {bathrooms} Bathrooms
            </Text>
            <Text className="text-gray-600 text-base">{kitchen} Kitchen</Text>
            <Text className="text-lg font-bold text-green-600">
              Rs. {price} / month
            </Text>
          </View>
        </View>

        <View className="mt-6 bg-white p-4 rounded-lg shadow-lg">
          <Text className="text-gray-600 text-base mb-2">
            Note: Lease period must be at least 3 months.
          </Text>

          <TouchableOpacity
            onPress={() => setStartPickerVisible(true)}
            className="flex-row items-center justify-between bg-gray-100 p-4 rounded-lg mb-4"
          >
            <Text className="text-base font-semibold text-gray-500">
              {startDate ? startDate.toDateString() : "Select Start Date"}
            </Text>
            <Ionicons name="calendar-outline" size={24} color="black" />
          </TouchableOpacity>

          <DateTimePickerModal
            isVisible={isStartPickerVisible}
            mode="date"
            onConfirm={handleConfirmStart}
            onCancel={() => setStartPickerVisible(false)}
            minimumDate={new Date()}
          />

          <TouchableOpacity
            onPress={() => {
              if (!startDate) {
                Alert.alert("Error", "Please select a start date first.");
                return;
              }
              setEndPickerVisible(true);
            }}
            className="flex-row items-center justify-between bg-gray-100 p-4 rounded-lg"
          >
            <Text className="text-base font-semibold text-gray-500">
              {endDate ? endDate.toDateString() : "Select End Date"}
            </Text>
            <Ionicons name="calendar-outline" size={24} color="black" />
          </TouchableOpacity>

          <DateTimePickerModal
            isVisible={isEndPickerVisible}
            mode="date"
            onConfirm={handleConfirmEnd}
            onCancel={() => setEndPickerVisible(false)}
            minimumDate={startDate ? new Date(startDate.getTime()) : new Date()}
          />
        </View>

        {startDate && endDate && (
          <View className="mt-6 bg-white p-4 rounded-lg shadow-lg">
            <Text className="text-xl font-semibold mb-4">Lease Agreement</Text>
            <Text className="text-base text-gray-600 mb-2">
              This agreement is made between the landlord and tenant for the
              rental property located at:
            </Text>
            <Text className="text-base font-semibold text-gray-800">
              {address}
            </Text>
            <Text className="text-base text-gray-600 mb-2">
              The lease term will begin on {startDate.toDateString()} and end on{" "}
              {endDate.toDateString()}.
            </Text>
            <Text className="text-base text-gray-600">
              Rent amount: Rs. {price} per month.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Agreement;
