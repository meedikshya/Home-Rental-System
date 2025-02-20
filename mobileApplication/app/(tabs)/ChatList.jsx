import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
} from "react-native";
import { getAuth } from "firebase/auth";
import { getAssociatedUsers } from "../../firebaseConfig";
import { getUserDataFromFirebaseId } from "../../context/AuthContext";
import ApiHandler from "../../api/ApiHandler";

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
      setLoading(false);
    }
  }, []);

  // Fetch associated chat users and then convert each to internal user details (userId and fullName)
  const fetchChatUsers = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      console.log("Fetching chat users for:", currentUserId);
      const associatedFirebaseIds = await getAssociatedUsers(currentUserId);
      console.log("Fetched Firebase IDs:", associatedFirebaseIds);

      if (!associatedFirebaseIds || associatedFirebaseIds.length === 0) {
        setChatUsers([]);
        return;
      }

      // For each Firebase ID, get the corresponding user ID and full name from your API
      const usersWithIds = await Promise.all(
        associatedFirebaseIds.map(async (firebaseId) => {
          try {
            const userId = await getUserDataFromFirebaseId(firebaseId);
            if (!userId) return null;
            const userDetailsResponse = await ApiHandler.get(
              `/UserDetails/userId/${userId}`
            );
            let fullName = "";
            if (userDetailsResponse) {
              const { firstName, lastName } = userDetailsResponse;
              fullName = `${firstName} ${lastName}`;
            }
            console.log(
              `Firebase ID: ${firebaseId}, User ID: ${userId}, Full Name: ${fullName}`
            );
            return { firebaseId, userId, fullName };
          } catch (error) {
            console.error(`Error converting Firebase ID ${firebaseId}:`, error);
            return null;
          }
        })
      );
      setChatUsers(usersWithIds.filter(Boolean));
      console.log("Mapped Chat Users:", usersWithIds.filter(Boolean));
    } catch (error) {
      console.error("Error fetching chat users:", error);
      Alert.alert("Error", "Failed to fetch chat users.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchChatUsers();
  }, [fetchChatUsers]);

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-center mb-6">Chats</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#1DA1F2" className="my-4" />
      ) : chatUsers.length > 0 ? (
        <FlatList
          data={chatUsers}
          keyExtractor={(item) =>
            item.firebaseId
              ? `UserID-${item.firebaseId}`
              : Math.random().toString()
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-lg mb-3 shadow-sm">
              <Image
                source={{
                  uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    item.fullName || "User"
                  )}&background=random`,
                }}
                className="w-12 h-12 rounded-full"
              />
              <View className="ml-4">
                <Text className="text-lg font-semibold text-gray-800">
                  {item.fullName ? item.fullName : "Unknown User"}
                </Text>
                <Text className="text-sm text-gray-500">
                  User ID: {item.userId}
                </Text>
              </View>
            </TouchableOpacity>
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
