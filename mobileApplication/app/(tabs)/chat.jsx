import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import useChat from "../../hooks/useChat";
import MessageInput from "../(pages)/MessageInput";
import { getAuth } from "firebase/auth";
import ApiHandler from "../../api/ApiHandler"; // Import ApiHandler

const Chat = () => {
  const route = useRoute();
  const { landlordId, landlordName, renterName } = route.params; // Added renterName

  const [currentUserId, setCurrentUserId] = useState(null);
  const [landlordFirebaseId, setLandlordFirebaseId] = useState(null);

  // Fetch current user ID from Firebase
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser) {
          const firebaseUserId = currentUser.uid; // Get the Firebase user ID
          console.log("Firebase User ID:", firebaseUserId);

          // Fetch user data from the database using the Firebase user ID
          const response = await ApiHandler.get(
            `/Users/firebase/${firebaseUserId}`
          );

          console.log("API Response:", response);

          if (response) {
            const userId = response; // Treat response.data as a plain string
            console.log("User ID retrieved:", userId);
            setCurrentUserId(userId); // Set the current user ID
          } else {
            console.log("No user data returned from the API.");
          }
        } else {
          console.log("No current user found.");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchCurrentUserId();
  }, []);

  // Fetch landlord's Firebase ID
  useEffect(() => {
    const fetchLandlordFirebaseId = async () => {
      try {
        const response = await ApiHandler.get(
          `/Users/firebaseByUserId/${landlordId}`
        );

        console.log("Landlord Firebase ID Response:", response);

        if (response) {
          const firebaseId = response; // Treat response.data as a plain string
          console.log("Landlord Firebase ID retrieved:", firebaseId);
          setLandlordFirebaseId(firebaseId); // Set the landlord's Firebase ID
        } else {
          console.log("No landlord Firebase ID returned from the API.");
        }
      } catch (error) {
        console.error("Error fetching landlord Firebase ID:", error);
      }
    };

    if (landlordId) {
      fetchLandlordFirebaseId();
    }
  }, [landlordId]);

  const chatId = `chat_${currentUserId}_${landlordId}`; // Unique chat ID

  const { messages, loading, error, sendNewMessage } = useChat(chatId);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#f0f0f0]">
        <ActivityIndicator size="large" color="#128C7E" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-[#f0f0f0]">
        <Text className="text-center text-red-500 text-lg">Error: {error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f0f0f0]">
      {/* Chat Header */}
      <View className="p-4 bg-[#128C7E]">
        <Text className="text-2xl font-bold text-white">
          Chat with {landlordName}
        </Text>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View
            className={`p-4 my-2 rounded-lg max-w-[75%] self-end bg-[#dcf8c6]`}
          >
            <Text className="text-sm text-[#4a4a4a]">
              {renterName}: {item.text.text} {/* Show only renter's name */}
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={(message) =>
          sendNewMessage({
            text: message,
            senderId: currentUserId,
            receiverId: landlordFirebaseId,
          })
        }
      />
    </SafeAreaView>
  );
};

export default Chat;
