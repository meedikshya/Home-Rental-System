import React, { useState, useEffect } from "react";
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
import Checkbox from "expo-checkbox";
import ApiHandler from "../../api/ApiHandler";

const Agreement = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    propertyId,
    landlordId,
    bookingId,
    renterId,
    image,
    address,
    landlordName,
    bedrooms,
    bathrooms,
    kitchen,
    price,
  } = route.params;

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isStartPickerVisible, setStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setEndPickerVisible] = useState(false);
  const [renterName, setRenterName] = useState("");
  const [isAgreed, setIsAgreed] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [agreementExists, setAgreementExists] = useState(false);
  const [agreementId, setAgreementId] = useState(null);

  useEffect(() => {
    const fetchRenterName = async () => {
      try {
        const userDetailsResponse = await ApiHandler.get(
          `/UserDetails/userId/${renterId}`
        );
        if (userDetailsResponse) {
          const { firstName, lastName } = userDetailsResponse;
          const fullName = `${firstName} ${lastName}`;
          setRenterName(fullName);
        }
      } catch (error) {
        console.error("Error fetching renter name:", error);
      }
    };

    if (renterId) {
      fetchRenterName();
    }
  }, [renterId]);

  useEffect(() => {
    const fetchAgreementDetails = async () => {
      try {
        const response = await ApiHandler.get(
          `/Agreements/byBookingId/${bookingId}`
        );
        if (response) {
          setStartDate(new Date(response.startDate));
          setEndDate(new Date(response.endDate));
          setIsAgreed(true);
          setAgreementExists(true);
          setAgreementId(response.agreementId);

          // Check agreement status
          const status = response.status;
          setIsPending(status === "Pending");
          setIsApproved(status === "Approved");
        } else {
          setStartDate(null);
          setEndDate(null);
          setIsAgreed(false);
          setIsPending(false);
          setIsApproved(false);
          setAgreementExists(false);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          setStartDate(null);
          setEndDate(null);
          setIsAgreed(false);
          setIsPending(false);
          setIsApproved(false);
          setAgreementExists(false);
        } else {
          console.error("Error fetching agreement details:", error);
        }
      }
    };

    if (bookingId) {
      fetchAgreementDetails();
    }
  }, [bookingId]);

  const handleConfirmStart = (date) => {
    setStartDate(date);
    setEndDate(null);
    setStartPickerVisible(false);
  };

  const handleConfirmEnd = (date) => {
    if (!startDate) {
      Alert.alert("Error", "Please select a start date first.");
      return;
    }

    const minEndDate = new Date(startDate);
    minEndDate.setMonth(minEndDate.getMonth() + 3);

    if (date < minEndDate) {
      Alert.alert("Error", "Lease period must be at least 3 months.");
    } else {
      setEndDate(date);
    }
    setEndPickerVisible(false);
  };

  const handleProceedBooking = async () => {
    if (!isAgreed) {
      Alert.alert("Error", "You must agree to the lease agreement to proceed.");
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert("Error", "Please select both start and end dates.");
      return;
    }

    const agreementData = {
      agreementId: 0,
      bookingId: bookingId,
      landlordId: landlordId,
      renterId: renterId,
      startDate: startDate.toISOString().split("T")[0], // Format to 'YYYY-MM-DD'
      endDate: endDate.toISOString().split("T")[0], // Format to 'YYYY-MM-DD'
      status: "Pending",
      signedAt: new Date().toISOString(),
    };

    try {
      await ApiHandler.post("/Agreements", agreementData);
      setIsPending(true);
      Alert.alert(
        "Request Sent",
        "The request will be processed after the landlord approves your request."
      );
    } catch (error) {
      console.error("Error creating agreement:", error);
      Alert.alert("Error", "There was an error processing your request.");
    }
  };

  const handleProceedPayment = () => {
    navigation.navigate("Payment", {
      propertyId,
      landlordId,
      bookingId,
      renterId,
      agreementId,
      price,
      address,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    });
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
            {address && (
              <Text className="text-xl font-semibold">{address}</Text>
            )}
            <View className="flex-row flex-wrap">
              {bedrooms && (
                <Text className="text-base text-gray-600 ml-1 mb-2">
                  {bedrooms} Bedrooms
                </Text>
              )}
              {bathrooms && (
                <Text className="text-base text-gray-600 ml-1">
                  {bathrooms} Bathrooms
                </Text>
              )}
              {kitchen && (
                <Text className="text-base text-gray-600 ml-1">
                  {kitchen} Kitchen
                </Text>
              )}
            </View>
            {price && (
              <Text className="text-xl font-bold text-gray-800">
                Rs. {price}{" "}
                <Text className="text-sm text-gray-500">/ per month</Text>
              </Text>
            )}
          </View>
        </View>

        {agreementExists ? (
          <View className="mt-6 bg-white p-4 rounded-lg shadow-lg">
            <Text className="text-xl font-semibold mb-4">Lease Agreement</Text>
            <Text className="text-base text-gray-600 mb-2">
              This agreement is made between the landlord and tenant for the
              rental property located at:
            </Text>
            {address && (
              <Text className="text-base font-semibold text-gray-800">
                {address}
              </Text>
            )}
            <Text className="text-base text-gray-600 mb-2">
              The lease term will begin on{" "}
              <Text className="font-bold text-black">
                {startDate ? startDate.toDateString() : "________"}
              </Text>{" "}
              and end on{" "}
              <Text className="font-bold text-black">
                {endDate ? endDate.toDateString() : "________"}
              </Text>
              .
            </Text>
            <Text className="text-base text-gray-600 mb-2">
              Landlord:{" "}
              <Text className="font-bold text-black">{landlordName}</Text>
            </Text>
            <Text className="text-base text-gray-600 mb-2">
              Renter: <Text className="font-bold text-black">{renterName}</Text>
            </Text>
            <Text className="text-base text-gray-600">
              Rent amount:{" "}
              <Text className="font-bold text-black">
                Rs. {price} per month
              </Text>
              .
            </Text>

            {/* Status Badge */}
            <View className="mt-4 mb-4">
              <View
                className={`py-1 px-3 rounded-full self-start ${
                  isPending
                    ? "bg-yellow-200"
                    : isApproved
                    ? "bg-green-200"
                    : "bg-gray-200"
                }`}
              >
                <Text
                  className={`${
                    isPending
                      ? "text-yellow-800"
                      : isApproved
                      ? "text-green-800"
                      : "text-gray-800"
                  }`}
                >
                  {isPending
                    ? "Pending"
                    : isApproved
                    ? "Approved"
                    : "Status Unknown"}
                </Text>
              </View>
            </View>

            {/* Action Button */}
            <View className="mt-4 w-full">
              {isPending ? (
                <TouchableOpacity
                  className="p-3 rounded-lg w-full bg-gray-400"
                  disabled={true}
                >
                  <Text className="text-white text-lg font-semibold text-center">
                    Pending Landlord Approval
                  </Text>
                </TouchableOpacity>
              ) : isApproved ? (
                <TouchableOpacity
                  className="p-3 rounded-lg w-full bg-green-500"
                  onPress={handleProceedPayment}
                >
                  <Text className="text-white text-lg font-semibold text-center">
                    Proceed to Payment
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="p-3 rounded-lg w-full bg-[#20319D]"
                  onPress={handleProceedBooking}
                >
                  <Text className="text-white text-lg font-semibold text-center">
                    Proceed Booking
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          /* Rest of your existing code for new agreements */
          <>
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
                minimumDate={
                  startDate ? new Date(startDate.getTime()) : new Date()
                }
              />
            </View>

            <View className="mt-6 bg-white p-4 rounded-lg shadow-lg">
              <Text className="text-xl font-semibold mb-4">
                Lease Agreement
              </Text>
              <Text className="text-base text-gray-600 mb-2">
                This agreement is made between the landlord and tenant for the
                rental property located at:
              </Text>
              {address && (
                <Text className="text-base font-semibold text-gray-800">
                  {address}
                </Text>
              )}
              <Text className="text-base text-gray-600 mb-2">
                The lease term will begin on{" "}
                <Text className="font-bold text-black">
                  {startDate ? startDate.toDateString() : "________"}
                </Text>{" "}
                and end on{" "}
                <Text className="font-bold text-black">
                  {endDate ? endDate.toDateString() : "________"}
                </Text>
                .
              </Text>
              <Text className="text-base text-gray-600 mb-2">
                Landlord:{" "}
                <Text className="font-bold text-black">{landlordName}</Text>
              </Text>
              <Text className="text-base text-gray-600 mb-2">
                Renter:{" "}
                <Text className="font-bold text-black">{renterName}</Text>
              </Text>
              <Text className="text-base text-gray-600">
                Rent amount:{" "}
                <Text className="font-bold text-black">
                  Rs. {price} per month
                </Text>
                .
              </Text>
            </View>

            <View className="mt-6 bg-white p-4 rounded-lg shadow-lg flex-row items-center">
              <Checkbox
                value={isAgreed}
                onValueChange={setIsAgreed}
                color={isAgreed ? "#20319D" : undefined}
              />
              <Text className="text-base text-gray-600 ml-2">
                I agree to the lease agreement
              </Text>
            </View>

            <View className="mt-4 w-full">
              <TouchableOpacity
                className={`p-3 rounded-lg w-full ${
                  isPending ? "bg-gray-400" : "bg-[#20319D]"
                }`}
                onPress={handleProceedBooking}
                disabled={isPending}
              >
                <Text className="text-white text-lg font-semibold text-center">
                  {isPending ? "Pending Request" : "Proceed Booking"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Agreement;
