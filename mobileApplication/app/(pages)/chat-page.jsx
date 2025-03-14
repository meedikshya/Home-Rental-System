import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import useChat from "../../hooks/useChat";
import MessageInput from "../../components/ui/MessageInput";
import { getAuth } from "firebase/auth";
import ApiHandler from "../../api/ApiHandler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Chat = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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

  useEffect(() => {
    const fetchLandlordFirebaseId = async () => {
      if (initialLandlordFirebaseId) {
        return;
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

  const chatId =
    currentUserId && landlordId ? `chat_${landlordId}_${currentUserId}` : null;

  const { messages, loading, error, sendNewMessage } = useChat(
    chatId,
    currentFirebaseId,
    landlordFirebaseId
  );

  const isFromCurrentUser = (message) => {
    if (!message || !currentFirebaseId) return false;
    return message.senderId === currentFirebaseId;
  };

  const getMessageText = (message) => {
    if (!message) return "No message";
    if (typeof message.text === "string") {
      return message.text;
    }
    if (message.text && typeof message.text === "object" && message.text.text) {
      return message.text.text;
    }
    if (message.body) return message.body;
    if (message.content) return message.content;
    return "Message content unavailable";
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#20319D" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-red-500">Error: {error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Chat Header */}
      <View
        className="bg-[#20319D] flex-row items-center p-4"
        style={{ paddingTop: insets.top }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold">{landlordName}</Text>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 10 }}
        renderItem={({ item }) => (
          <View
            className={`p-4 my-2 rounded-lg max-w-[75%] ${
              isFromCurrentUser(item)
                ? "bg-sky-100 ml-auto"
                : "bg-gray-100 mr-auto"
            }`}
          >
            <Text className="text-black">{getMessageText(item)}</Text>
            <View className="flex-row justify-between mt-2">
              <Text className="text-gray-500 text-xs">
                {isFromCurrentUser(item) ? renterName : landlordName}
              </Text>
              <Text className="text-gray-500 text-xs">
                {item.timestamp?.seconds
                  ? new Date(item.timestamp.seconds * 1000).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" }
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
      <View className="p-3">
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
      </View>
    </View>
  );
};

export default Chat;
