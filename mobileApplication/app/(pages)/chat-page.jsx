import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import useChat from "../../hooks/useChat";
import MessageInput from "../../components/ui/MessageInput";
import { getAuth } from "firebase/auth";
import ApiHandler from "../../api/ApiHandler";

const Chat = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { landlordId, landlordName, renterName } = route.params;

  const [currentUserId, setCurrentUserId] = useState(null);
  const [landlordFirebaseId, setLandlordFirebaseId] = useState(null);

  // Fetch current user ID
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          const firebaseUserId = currentUser.uid;
          console.log("Firebase User ID:", firebaseUserId);
          const response = await ApiHandler.get(
            `/Users/firebase/${firebaseUserId}`
          );
          console.log("API Response:", response);
          if (response) {
            const userId = response;
            console.log("User ID retrieved:", userId);
            setCurrentUserId(userId);
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
          const firebaseId = response;
          console.log("Landlord Firebase ID retrieved:", firebaseId);
          setLandlordFirebaseId(firebaseId);
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

  const chatId = `chat_${currentUserId}_${landlordId}`;
  const { messages, loading, error, sendNewMessage } = useChat(chatId);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#1DA1F2" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-center text-red-500 text-lg">Error: {error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      {/* Chat Header */}
      <View className="p-4 bg-blue-500 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-white ml-4">
          Chat with {landlordName}
        </Text>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View className="p-4 my-2 rounded-lg max-w-[75%] self-end bg-blue-100">
            <Text className="text-sm text-gray-800">
              {renterName}: {item.text.text}
            </Text>
          </View>
        )}
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
