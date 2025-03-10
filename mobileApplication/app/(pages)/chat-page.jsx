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
  const {
    landlordId,
    landlordName,
    renterName,
    landlordFirebaseId: initialLandlordFirebaseId,
  } = route.params;

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentFirebaseId, setCurrentFirebaseId] = useState(null);
  const [landlordFirebaseId, setLandlordFirebaseId] = useState(
    initialLandlordFirebaseId
  );

  // Fetch current user ID and Firebase ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          const firebaseUserId = currentUser.uid;
          setCurrentFirebaseId(firebaseUserId);

          const response = await ApiHandler.get(
            `/Users/firebase/${firebaseUserId}`
          );
          if (response) {
            setCurrentUserId(response);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch landlord's Firebase ID if not provided
  useEffect(() => {
    const fetchLandlordFirebaseId = async () => {
      if (initialLandlordFirebaseId) {
        return; // Already have it from params
      }

      try {
        const response = await ApiHandler.get(
          `/Users/firebaseByUserId/${landlordId}`
        );
        if (response) {
          setLandlordFirebaseId(response);
        }
      } catch (error) {
        console.error("Error fetching landlord Firebase ID:", error);
      }
    };

    if (landlordId) {
      fetchLandlordFirebaseId();
    }
  }, [landlordId, initialLandlordFirebaseId]);

  // Generate chat ID using database IDs for Firebase path
  const chatId =
    currentUserId && landlordId ? `chat_${landlordId}_${currentUserId}` : null;

  // Use the enhanced useChat hook with all parameters for complete message fetching
  const { messages, loading, error, sendNewMessage } = useChat(
    chatId,
    currentFirebaseId,
    landlordFirebaseId
  );

  // Function to check if a message is from current user
  const isFromCurrentUser = (message) => {
    if (!message || !currentFirebaseId) return false;

    if (message.senderId === currentFirebaseId) return true;

    // Also check nested structure
    if (message.text && typeof message.text === "object") {
      if (
        message.text.senderId === currentFirebaseId ||
        String(message.text.senderId) === String(currentUserId)
      ) {
        return true;
      }
    }

    return false;
  };

  // Function to extract message text regardless of format
  const getMessageText = (message) => {
    if (!message) return "No message";

    // Direct string
    if (typeof message.text === "string") {
      return message.text;
    }

    // Nested object
    if (message.text && typeof message.text === "object" && message.text.text) {
      return message.text.text;
    }

    // Other possible fields
    if (message.body) return message.body;
    if (message.content) return message.content;

    return "Message content unavailable";
  };

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
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 20 }}
        renderItem={({ item }) => (
          <View
            className={`p-4 my-2 rounded-lg max-w-[75%] ${
              isFromCurrentUser(item)
                ? "self-end bg-blue-100"
                : "self-start bg-white border border-gray-200"
            }`}
          >
            <Text className="text-sm text-gray-800">
              {getMessageText(item)}
            </Text>
            <View className="flex-row justify-between mt-1">
              <Text className="text-xs text-gray-500">
                {isFromCurrentUser(item) ? renterName : landlordName}
              </Text>
              <Text className="text-xs text-gray-500">
                {item.timestamp?.seconds
                  ? new Date(item.timestamp.seconds * 1000).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : item.timestamp instanceof Date
                  ? item.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Just now"}
              </Text>
            </View>
          </View>
        )}
        inverted={false}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={async (message) => {
          if (!currentFirebaseId || !landlordFirebaseId || !chatId) {
            console.error("Missing required IDs:", {
              currentFirebaseId,
              landlordFirebaseId,
              chatId,
            });
            return;
          }

          try {
            const messageData = {
              text: message,
              senderId: currentFirebaseId,
              senderEmail: getAuth().currentUser?.email || "",
              receiverId: landlordFirebaseId,
              timestamp: new Date(),
            };

            await sendNewMessage(messageData);
          } catch (error) {
            console.error("Error sending message:", error);
          }
        }}
      />
    </SafeAreaView>
  );
};

export default Chat;
