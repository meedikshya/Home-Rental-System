import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { getAuth } from "firebase/auth";
import { getAssociatedUsers } from "../../firebaseConfig";

const ChatList = () => {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [chatUsers, setChatUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch current user ID from Firebase Auth
  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log("Firebase User ID:", currentUser.uid);
      setCurrentUserId(currentUser.uid);
    } else {
      console.log("No current user found.");
    }
  }, []);

  // Fetch associated chat users
  const fetchChatUsers = useCallback(async () => {
    if (!currentUserId) return;
    try {
      console.log("Fetching chat users for:", currentUserId);
      const associatedUsers = await getAssociatedUsers(currentUserId);
      console.log("Fetched Chat Users:", associatedUsers);
      setChatUsers(associatedUsers);
    } catch (error) {
      console.error("Error fetching chat users:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchChatUsers();
  }, [fetchChatUsers]);

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold text-center mb-4">Recent Chats</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#E0292C" className="my-4" />
      ) : chatUsers.length > 0 ? (
        <FlatList
          data={chatUsers}
          keyExtractor={(item) => `UserID-${item}`}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View className="bg-gray-100 p-4 rounded-lg mb-3 shadow">
              <Text className="text-lg text-gray-800">User ID: {item}</Text>
            </View>
          )}
        />
      ) : (
        <Text className="text-center text-lg text-gray-500 mt-8">
          No recent chats found.
        </Text>
      )}
    </View>
  );
};

export default ChatList;
