import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getDoc, doc } from "firebase/firestore";
import { FIREBASE_DB, FIREBASE_AUTH } from "../../firebaseConfig";
import { getUserDataFromFirebase } from "../../context/AuthContext";
import ApiHandler from "../../api/ApiHandler";
import {
  listenForUserNotifications,
  sendTestNotification,
  markNotificationAsRead,
} from "../../firebaseNotification";
import { Ionicons } from "@expo/vector-icons";

const NotificationPage = () => {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch current user ID from Firebase
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const userId = await getUserDataFromFirebase();
        if (userId) {
          setCurrentUserId(userId);
          // Fetch the current user's name
          await fetchUserName(userId);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUserId();
  }, []);

  // Fetch user's name from API
  const fetchUserName = async (userId) => {
    try {
      const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
      if (response) {
        const { firstName, lastName } = response;
        const fullName = `${firstName} ${lastName}`;
        setCurrentUserName(fullName);

        // Also add to usernames cache
        setUsernames((prev) => ({
          ...prev,
          [userId]: fullName,
        }));
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
  };

  // Fetch sender username
  const fetchSenderUsername = async (senderId) => {
    if (!senderId || usernames[senderId]) return;

    try {
      const response = await ApiHandler.get(`/UserDetails/userId/${senderId}`);
      if (response) {
        const { firstName, lastName } = response;
        const fullName = `${firstName} ${lastName}`;
        setUsernames((prev) => ({
          ...prev,
          [senderId]: fullName,
        }));
      }
    } catch (error) {
      console.error("Error fetching sender info:", error);
      // Fallback - try Firebase directly
      try {
        const userDoc = await getDoc(doc(FIREBASE_DB, "users", senderId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUsernames((prev) => ({
            ...prev,
            [senderId]: userData.firstName || userData.email || "User",
          }));
        }
      } catch (fbError) {
        console.error("Error fetching user from Firebase:", fbError);
      }
    }
  };

  // Listen for notifications from Firebase
  useEffect(() => {
    if (!currentUserId) return;

    setLoading(true);
    const unsubscribe = listenForUserNotifications((fetchedNotifications) => {
      setNotifications(fetchedNotifications);
      setLoading(false);

      // Load sender names for each notification
      fetchedNotifications.forEach((notification) => {
        if (notification.senderId) {
          fetchSenderUsername(notification.senderId);
        }
      });
    });

    // Clean up listener when component unmounts
    return () => unsubscribe();
  }, [currentUserId]);

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Handle notification press
  const handleNotificationPress = (id) => {
    markNotificationAsRead(id);
  };

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Refetch current user data
    if (currentUserId) {
      await fetchUserName(currentUserId);
    }

    // Refresh will happen automatically via the Firebase listener
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [currentUserId]);

  // Test button to send a notification
  const sendTestNotif = async () => {
    if (!currentUserId) {
      console.log("Can't send notification - no user ID");
      return;
    }

    await sendTestNotification(
      "New Property Alert",
      "A new property matching your preferences is now available."
    );
  };

  // Render notification item
  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        item.read ? styles.readNotification : styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(item.id)}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationBody}>{item.body}</Text>

        {item.senderId && (
          <Text style={styles.senderText}>
            From: {usernames[item.senderId] || "Loading user..."}
          </Text>
        )}

        <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Notifications</Text>
        {currentUserName && (
          <Text style={styles.subheading}>For {currentUserName}</Text>
        )}
      </View>

      <TouchableOpacity style={styles.testButton} onPress={sendTestNotif}>
        <Text style={styles.testButtonText}>Send Test Notification</Text>
      </TouchableOpacity>

      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3B82F6"]}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={60} color="#ccc" />
          <Text style={styles.emptyStateText}>No notifications yet</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  heading: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#333",
  },
  subheading: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: "#EFF6FF",
  },
  readNotification: {
    backgroundColor: "#fff",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  notificationBody: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  senderText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3B82F6",
    marginLeft: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
  },
  testButton: {
    backgroundColor: "#3B82F6",
    padding: 12,
    borderRadius: 8,
    margin: 16,
    alignItems: "center",
  },
  testButtonText: {
    color: "white",
    fontWeight: "600",
  },
});

export default NotificationPage;
