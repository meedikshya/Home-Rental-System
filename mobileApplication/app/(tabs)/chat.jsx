import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { getAuth } from "firebase/auth";
import { useRouter } from "expo-router";
import { getAssociatedUsers } from "../../firebaseConfig";
import { getUserDataFromFirebaseId } from "../../context/AuthContext";
import ApiHandler from "../../api/ApiHandler";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Import SafeAreaInsets

const ChatList = () => {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [chatUsers, setChatUsers] = useState([]); // Array of objects: { firebaseId, userId, fullName }
  const [renterName, setRenterName] = useState("");
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets(); // Get the safe area insets

  // Fetch current user's Firebase ID
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

  // Fetch renter's full name
  const fetchRenterName = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const userId = await getUserDataFromFirebaseId(currentUserId);
      if (!userId) return;
      const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
      if (response) {
        const { firstName, lastName } = response;
        setRenterName(`${firstName} ${lastName}`);
      }
    } catch (error) {
      console.error("Error fetching renter's full name:", error);
    }
  }, [currentUserId]);

  // Fetch associated chat users, then get their user IDs and full names.
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
    } catch (error) {
      console.error("Error fetching chat users:", error);
      Alert.alert("Error", "Failed to fetch chat users.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchRenterName();
    fetchChatUsers();
  }, [fetchRenterName, fetchChatUsers]);

  // Update the handleUserClick function in chat.jsx
  const handleUserClick = (user) => {
    if (!user || !user.userId || !user.firebaseId) {
      Alert.alert(
        "Error",
        "Cannot start chat with this user - missing information"
      );
      return;
    }

    router.push({
      pathname: "/(pages)/chat-page",
      params: {
        landlordId: user.userId, // Database ID
        landlordFirebaseId: user.firebaseId, // Firebase ID - add this!
        landlordName: user.fullName || "User",
        renterName: renterName || "Me",
      },
    });
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <Text className="text-2xl font-bold text-center mb-6 text-[#20319D] mt-4">
        Chats
      </Text>
      {loading ? (
        <ActivityIndicator size="large" color="#38bdf8" className="my-4" />
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
            <TouchableOpacity
              className="flex-row items-center bg-white p-4 rounded-lg mb-3 shadow-md border-l-4 border-[#7dd3fc]"
              onPress={() => handleUserClick(item)}
            >
              <Image
                source={{
                  uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    item.fullName || "User"
                  )}&background=38bdf8&color=fff`,
                }}
                className="w-12 h-12 rounded-full"
              />
              <View className="ml-4">
                <Text className="text-lg font-semibold text-[#20319D]">
                  {item.fullName ? item.fullName : "Unknown User"}
                </Text>
                <Text className="text-sm text-sky-600">
                  User ID: {item.userId}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <Text className="text-center text-lg text-[#20319D] mt-8">
          No recent chats found.
        </Text>
      )}
    </View>
  );
};

export default ChatList;
