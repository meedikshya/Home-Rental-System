import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Checkbox from "expo-checkbox";
import ApiHandler from "../../api/ApiHandler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendNotificationToUser } from "../../firebaseNotification.js";

const Agreement = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Get the safe area insets
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
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch renter name
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

  // Fetch agreement details
  const fetchAgreementDetails = async () => {
    try {
      console.log(`Fetching agreement details for booking: ${bookingId}`);
      const response = await ApiHandler.get(
        `/Agreements/byBookingId/${bookingId}`
      );

      if (response) {
        console.log("Agreement found:", response);
        setStartDate(new Date(response.startDate));
        setEndDate(new Date(response.endDate));
        setIsAgreed(true);
        setAgreementExists(true);
        setAgreementId(response.agreementId);

        // Check agreement status
        const status = response.status;
        setIsPending(status === "Pending");
        setIsApproved(status === "Approved");

        // If agreement is approved, check payment status
        if (status === "Approved") {
          await checkPaymentStatus(response.agreementId);
        }
        return true;
      } else {
        setStartDate(null);
        setEndDate(null);
        setIsAgreed(false);
        setIsPending(false);
        setIsApproved(false);
        setAgreementExists(false);
        return false;
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
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Check if payment has been completed
  const checkPaymentStatus = async (id) => {
    try {
      setIsCheckingPayment(true);
      console.log("Checking payment status for agreement:", id);

      const data = await ApiHandler.get(`/Payments/byAgreementId/${id}`, {
        status: "Completed",
      });

      console.log("Payment data received:", data);

      // If there's at least one payment with "Completed" status
      if (data && data.length > 0) {
        console.log("Found completed payment:", data[0]);
        setIsPaymentCompleted(true);
        return true;
      } else {
        setIsPaymentCompleted(false);
        return false;
      }
    } catch (error) {
      console.error("Payment status check error:", error);
      setIsPaymentCompleted(false);
      return false;
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (renterId) {
        await fetchRenterName();
      }
      if (bookingId) {
        await fetchAgreementDetails();
      }
    };

    loadInitialData();
  }, [renterId, bookingId]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchRenterName();
      await fetchAgreementDetails();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [renterId, bookingId]);

  // Auto-refresh on focus
  useFocusEffect(
    useCallback(() => {
      console.log("Agreement page focused, refreshing data...");
      refreshAllData();
    }, [refreshAllData])
  );

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
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      status: "Pending",
      signedAt: new Date().toISOString(),
    };

    try {
      // Create the agreement
      const response = await ApiHandler.post("/Agreements", agreementData);

      // Send notification to landlord
      if (landlordId) {
        const notificationTitle = "New Agreement Request";
        const notificationBody = `A renter has initiated a new lease agreement for your property at ${address}.`;

        // Additional data to be included with the notification
        const additionalData = {
          propertyId,
          bookingId,
          agreementId: response?.agreementId, // If your API returns the new agreement ID
          screen: "LandlordAgreementDetails", // Screen to navigate to when notification is tapped
          action: "view_agreement",
          timestamp: new Date().toISOString(),
        };

        // Send the notification
        await sendNotificationToUser(
          landlordId,
          notificationTitle,
          notificationBody,
          additionalData
        );

        console.log("Agreement notification sent to landlord:", landlordId);
      }

      setIsPending(true);
      Alert.alert(
        "Request Sent",
        "The request will be processed after the landlord approves your request."
      );
      // Refresh data after creating agreement
      refreshAllData();
    } catch (error) {
      console.error("Error creating agreement:", error);
      Alert.alert("Error", "There was an error processing your request.");
    }
  };

  const handleProceedPayment = () => {
    router.push({
      pathname: "payment-page",
      params: {
        propertyId,
        landlordId,
        bookingId,
        renterId,
        agreementId,
        price, // Use actual price instead of temPrice
        address,
        startDate: startDate ? startDate.toISOString().split("T")[0] : null,
        endDate: endDate ? endDate.toISOString().split("T")[0] : null,
        landlordName,
      },
    });
  };

  // Format date function
  const formatDate = (date) => {
    if (!date) return "________";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <View
        className="flex-1 bg-white justify-center items-center"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color="#20319D" />
        <Text className="mt-4 text-gray-600">Loading agreement details...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center py-4 px-3 border-b border-gray-200 bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#20319D" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-800 ml-3">
          Agreement
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAllData} />
        }
      >
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
          <>
            {/* Status badges */}
            <View className="flex-row flex-wrap gap-2 mt-4">
              <View
                className={`py-1 px-3 rounded-full ${
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

              {isApproved && isPaymentCompleted && (
                <View className="py-1 px-3 rounded-full bg-blue-200">
                  <Text className="text-blue-800">Payment Completed</Text>
                </View>
              )}
            </View>

            {/* Styled Agreement Document */}
            <View className="mt-4 bg-white border border-gray-300 rounded-lg overflow-hidden shadow-lg">
              {/* Agreement Header */}
              <View className="bg-gray-50 p-4 border-b border-gray-200">
                <Text className="text-xl font-bold text-center text-gray-800">
                  LEASE AGREEMENT
                </Text>
              </View>

              {/* Agreement Body */}
              <View className="p-6 bg-white">
                <Text className="text-base leading-relaxed text-gray-700">
                  This agreement is made between the landlord and tenant for the
                  rental property located at:
                </Text>

                <Text className="text-base font-semibold my-2 text-center">
                  {address}
                </Text>

                <View className="my-4 border-t border-gray-200 pt-4">
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="calendar" size={18} color="#666" />
                    <Text className="ml-2 text-base text-gray-700">
                      <Text className="font-semibold">Lease Period:</Text>{" "}
                      {formatDate(startDate)} to {formatDate(endDate)}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-3">
                    <Ionicons name="person" size={18} color="#666" />
                    <Text className="ml-2 text-base text-gray-700">
                      <Text className="font-semibold">Landlord:</Text>{" "}
                      {landlordName}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-3">
                    <Ionicons name="person" size={18} color="#666" />
                    <Text className="ml-2 text-base text-gray-700">
                      <Text className="font-semibold">Renter:</Text>{" "}
                      {renterName}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-3">
                    <Ionicons name="cash" size={18} color="#666" />
                    <Text className="ml-2 text-base text-gray-700">
                      <Text className="font-semibold">Rent Amount:</Text> Rs.{" "}
                      {price} per month
                    </Text>
                  </View>
                </View>

                {/* Agreement Terms */}
                <View className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                  <Text className="font-semibold mb-2">Agreement Terms:</Text>
                  <View className="ml-2">
                    <Text className="text-sm text-gray-700 mb-1">
                      • The tenant will pay the rent amount on the 1st of each
                      month.
                    </Text>
                    <Text className="text-sm text-gray-700 mb-1">
                      • The tenant will maintain the property in good condition.
                    </Text>
                    <Text className="text-sm text-gray-700 mb-1">
                      • The tenant will not sublease the property without the
                      landlord's permission.
                    </Text>
                    <Text className="text-sm text-gray-700 mb-1">
                      • The landlord will be responsible for major repairs.
                    </Text>
                    <Text className="text-sm text-gray-700 mb-1">
                      • The landlord will provide notice before visiting the
                      property.
                    </Text>
                    <Text className="text-sm text-gray-700 mb-1">
                      • Either party may terminate this agreement with 30 days'
                      notice.
                    </Text>
                    <Text className="text-sm text-gray-700">
                      • A security deposit equal to one month's rent is due
                      before moving in.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Agreement Footer */}
              <View className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-row justify-between">
                <View>
                  <Text className="text-xs text-gray-500">Document ID:</Text>
                  <Text className="text-sm font-medium">{agreementId}</Text>
                </View>
                <View>
                  <Text className="text-xs text-gray-500">Date Signed:</Text>
                  <Text className="text-sm font-medium">
                    {new Date().toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Button */}
            <View className="mt-6 mb-8 w-full">
              {isPending ? (
                <TouchableOpacity
                  className="p-4 rounded-lg w-full bg-gray-400"
                  disabled={true}
                >
                  <Text className="text-white text-lg font-semibold text-center">
                    Pending Landlord Approval
                  </Text>
                </TouchableOpacity>
              ) : isApproved ? (
                isCheckingPayment ? (
                  <View className="p-4 rounded-lg w-full bg-gray-100 items-center">
                    <ActivityIndicator size="small" color="#20319D" />
                  </View>
                ) : (
                  <TouchableOpacity
                    className="p-4 rounded-lg w-full bg-[#20319D]"
                    onPress={handleProceedPayment}
                  >
                    <Text className="text-white text-lg font-semibold text-center">
                      {isPaymentCompleted
                        ? "View Payment Details"
                        : "Proceed to Payment"}
                    </Text>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  className="p-4 rounded-lg w-full bg-[#20319D]"
                  onPress={handleProceedBooking}
                >
                  <Text className="text-white text-lg font-semibold text-center">
                    Proceed Booking
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Your existing code for new agreement creation */}
            {/* ... */}
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

            {/* New Agreement Paper */}
            <View className="mt-6 bg-white border border-gray-300 rounded-lg overflow-hidden shadow-lg">
              {/* Agreement Header */}
              <View className="bg-gray-50 p-4 border-b border-gray-200">
                <Text className="text-xl font-bold text-center text-gray-800">
                  LEASE AGREEMENT
                </Text>
              </View>

              <View className="p-6">
                <Text className="text-base leading-relaxed text-gray-700">
                  This agreement is made between the landlord and tenant for the
                  rental property located at:
                </Text>

                <Text className="text-base font-semibold my-2 text-center">
                  {address}
                </Text>

                <View className="my-4 border-t border-gray-200 pt-4">
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="calendar" size={18} color="#666" />
                    <Text className="ml-2 text-base text-gray-700">
                      <Text className="font-semibold">Lease Period:</Text>{" "}
                      {formatDate(startDate)} to {formatDate(endDate)}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-3">
                    <Ionicons name="person" size={18} color="#666" />
                    <Text className="ml-2 text-base text-gray-700">
                      <Text className="font-semibold">Landlord:</Text>{" "}
                      {landlordName}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-3">
                    <Ionicons name="person" size={18} color="#666" />
                    <Text className="ml-2 text-base text-gray-700">
                      <Text className="font-semibold">Renter:</Text>{" "}
                      {renterName}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-3">
                    <Ionicons name="cash" size={18} color="#666" />
                    <Text className="ml-2 text-base text-gray-700">
                      <Text className="font-semibold">Rent Amount:</Text> Rs.{" "}
                      {price} per month
                    </Text>
                  </View>
                </View>

                {/* Agreement Terms */}
                <View className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                  <Text className="font-semibold mb-2">Agreement Terms:</Text>
                  <View className="ml-2">
                    <Text className="text-sm text-gray-700 mb-1">
                      • The tenant will pay the rent amount on the 1st of each
                      month.
                    </Text>
                    <Text className="text-sm text-gray-700 mb-1">
                      • The tenant will maintain the property in good condition.
                    </Text>
                    <Text className="text-sm text-gray-700 mb-1">
                      • The tenant will not sublease the property without the
                      landlord's permission.
                    </Text>
                    <Text className="text-sm text-gray-700 mb-1">
                      • The landlord will be responsible for major repairs.
                    </Text>
                    <Text className="text-sm text-gray-700 mb-1">
                      • The landlord will provide notice before visiting the
                      property.
                    </Text>
                    <Text className="text-sm text-gray-700 mb-1">
                      • Either party may terminate this agreement with 30 days'
                      notice.
                    </Text>
                    <Text className="text-sm text-gray-700">
                      • A security deposit equal to one month's rent is due
                      before moving in.
                    </Text>
                  </View>
                </View>
              </View>
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

            <View className="mt-6 mb-8 w-full">
              <TouchableOpacity
                className={`p-4 rounded-lg w-full ${
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
    </View>
  );
};

export default Agreement;
