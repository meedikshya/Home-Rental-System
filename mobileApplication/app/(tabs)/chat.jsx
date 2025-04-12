import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  StyleSheet,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import { useRouter } from "expo-router";
import { getAssociatedUsers } from "../../firebaseConfig";
import { getUserDataFromFirebaseId } from "../../context/AuthContext";
import ApiHandler from "../../api/ApiHandler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const ChatList = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [chatUsers, setChatUsers] = useState([]);
  const [renterName, setRenterName] = useState("");
  const [loading, setLoading] = useState(true);

  // Combined fetch function to reduce multiple useEffects and callbacks
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Get current Firebase user
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
          console.log("No current user found.");
          if (isMounted) setLoading(false);
          return;
        }

        const firebaseId = currentUser.uid;
        console.log("Current Firebase ID:", firebaseId);
        if (isMounted) setCurrentUserId(firebaseId);

        // Get user ID from Firebase ID
        try {
          const userId = await getUserDataFromFirebaseId(firebaseId);
          console.log("Current User ID:", userId);

          if (!userId) {
            console.log("Current user ID not found in database");
            if (isMounted) setLoading(false);
            return;
          }

          // Fetch renter name in parallel
          ApiHandler.get(`/UserDetails/userId/${userId}`)
            .then((response) => {
              if (response && isMounted) {
                const { firstName = "", lastName = "" } = response;
                setRenterName(`${firstName} ${lastName}`.trim() || "Me");
              }
            })
            .catch((error) => {
              console.error("Error fetching renter's details:", error);
            });
        } catch (error) {
          console.error("Error getting user ID from Firebase ID:", error);
          if (isMounted) setLoading(false);
          return;
        }

        // Get associated users with proper error handling
        let associatedFirebaseIds = [];
        try {
          associatedFirebaseIds = await getAssociatedUsers(firebaseId);
          console.log("Associated Firebase IDs:", associatedFirebaseIds);
        } catch (error) {
          console.error("Error getting associated users:", error);
          if (isMounted) {
            setLoading(false);
            setChatUsers([]);
          }
          return;
        }

        // Filter out any undefined or invalid IDs
        const validAssociatedIds = (associatedFirebaseIds || []).filter(
          (id) => id && typeof id === "string" && id.length > 0
        );
        console.log("Valid Associated IDs:", validAssociatedIds);

        if (validAssociatedIds.length === 0) {
          if (isMounted) {
            setChatUsers([]);
            setLoading(false);
          }
          return;
        }

        // Process users in batches to improve performance
        const users = [];
        const batchSize = 3; // Process 3 users at a time

        for (let i = 0; i < validAssociatedIds.length; i += batchSize) {
          const batch = validAssociatedIds.slice(i, i + batchSize);
          console.log(
            `Processing batch ${i / batchSize + 1} of ${Math.ceil(
              validAssociatedIds.length / batchSize
            )}`
          );

          // Process this batch in parallel with better error handling
          const batchPromises = batch.map(async (fbId) => {
            try {
              // Skip if fbId is undefined or invalid
              if (!fbId) {
                console.log("Skipping undefined firebase ID");
                return null;
              }

              console.log(`Processing Firebase ID: ${fbId}`);
              const userId = await getUserDataFromFirebaseId(fbId);

              if (!userId) {
                console.log(`No user ID found for Firebase ID: ${fbId}`);
                return null;
              }

              console.log(`Found user ID: ${userId} for Firebase ID: ${fbId}`);

              // Get user details
              const userDetails = await ApiHandler.get(
                `/UserDetails/userId/${userId}`
              );
              if (!userDetails) {
                console.log(`No user details found for user ID: ${userId}`);
                return null;
              }

              const { firstName = "", lastName = "" } = userDetails;
              const fullName =
                `${firstName} ${lastName}`.trim() || "Unknown User";

              return {
                firebaseId: fbId,
                userId,
                fullName,
                firstName: firstName || "",
                lastName: lastName || "",
              };
            } catch (error) {
              console.error(`Error processing user ${fbId}:`, error);
              return null;
            }
          });

          try {
            // Wait for all promises to resolve
            const batchResults = await Promise.all(batchPromises);

            // Add valid results to our users array
            const validResults = batchResults.filter(Boolean);
            console.log(
              `Found ${validResults.length} valid users in this batch`
            );

            users.push(...validResults);

            // Update the UI with what we have so far
            if (isMounted) {
              setChatUsers([...users]);
            }
          } catch (error) {
            console.error("Error processing batch:", error);
            // Continue to next batch even if this one failed
          }
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in data fetching:", error);
        if (isMounted) {
          setLoading(false);
          Alert.alert("Error", "Failed to load chat users. Please try again.");
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

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
        landlordFirebaseId: user.firebaseId, // Firebase ID
        landlordName: user.fullName || "User",
        renterName: renterName || "Me",
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#20319D" barStyle="light-content" />

      {/* Header styled exactly like favourites.jsx */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      {loading && chatUsers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20319D" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : chatUsers.length > 0 ? (
        <FlatList
          data={chatUsers}
          keyExtractor={(item) =>
            item.firebaseId
              ? `UserID-${item.firebaseId}`
              : Math.random().toString()
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatCard}
              onPress={() => handleUserClick(item)}
              activeOpacity={0.7}
            >
              <Image
                source={{
                  uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    item.fullName || "User"
                  )}&background=20319D&color=fff`,
                }}
                style={styles.avatar}
              />

              <View style={styles.chatInfo}>
                <Text style={styles.userName}>
                  {item.fullName ? item.fullName : "Unknown User"}
                </Text>
                <Text style={styles.lastMessage}>Tap to start chatting</Text>
              </View>

              <View style={styles.chatActions}>
                <Ionicons name="chevron-forward" size={24} color="#20319D" />
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color="#20319D" />
                <Text style={styles.footerLoadingText}>Loading more...</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="chatbubbles-outline" size={50} color="#20319D" />
          </View>
          <Text style={styles.emptyTitle}>No Messages Yet</Text>
          <Text style={styles.emptyText}>
            You don't have any conversations yet. Start chatting with property
            owners from their listings.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  headerContainer: {
    backgroundColor: "#20319D",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  chatInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: "#6B7280",
  },
  chatActions: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: width * 0.8,
  },
  footerLoading: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  footerLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6B7280",
  },
});

export default ChatList;
