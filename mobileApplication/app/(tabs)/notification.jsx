import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Ionicons,
  FontAwesome,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { FIREBASE_DB } from "../../firebaseConfig.js";
import {
  listenForUserNotifications,
  markNotificationAsRead,
  directFetchNotifications,
} from "../../firebaseNotification.js";
import { getUserDataFromFirebase } from "../../context/AuthContext"; // Import getUserDataFromFirebase
import { getAuth } from "firebase/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Import SafeAreaInsets

const NotificationScreen = ({ userId: passedUserId, onUnreadCountChange }) => {
  // Remove useAuth and add userId prop
  const [notifications, setNotifications] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets(); // Get the safe area insets

  // Calculate unread count and expose it to parent component
  const unreadCount = useMemo(() => {
    const count = notifications.filter(
      (notification) => !notification.read
    ).length;

    // If the callback exists, call it with the updated count
    if (onUnreadCountChange && typeof onUnreadCountChange === "function") {
      onUnreadCountChange(count);
    }

    return count;
  }, [notifications, onUnreadCountChange]);

  // Get notification type icon and color
  const getNotificationTypeInfo = (notification) => {
    if (!notification.data || !notification.data.action) {
      return {
        icon: "bell",
        iconType: "Feather",
        color: "#6B7280",
        text: "Notification",
      };
    }

    switch (notification.data.action) {
      case "view_agreement":
        return {
          icon: "file-text",
          iconType: "Feather",
          color: "#10B981",
          text: "Agreement",
        };
      case "booking_request":
        return {
          icon: "calendar",
          iconType: "Feather",
          color: "#3B82F6",
          text: "Booking",
        };
      case "property_update":
        return {
          icon: "home",
          iconType: "Feather",
          color: "#8B5CF6",
          text: "Property",
        };
      case "payment_received":
        return {
          icon: "dollar-sign",
          iconType: "Feather",
          color: "#F59E0B",
          text: "Payment",
        };
      default:
        return {
          icon: "bell",
          iconType: "Feather",
          color: "#6B7280",
          text: notification.data.action || "Notification",
        };
    }
  };

  // Format timestamp to relative time
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "";

    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);

    // Less than a minute
    if (seconds < 60) {
      return "just now";
    }

    // Less than an hour
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    // Less than a day
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    // Less than a week
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d ago`;
    }

    // Just return the date MM/DD/YY format
    return `${date.getMonth() + 1}/${date.getDate()}/${date
      .getFullYear()
      .toString()
      .substr(-2)}`;
  };

  // Handle notification press with navigation
  const handleNotificationPress = (notification) => {
    console.log("Notification pressed:", notification);

    // Update UI immediately
    setNotifications((prevNotifications) =>
      prevNotifications.map((n) =>
        n.id === notification.id ? { ...n, read: true } : n
      )
    );

    // Mark as read in Firebase (don't block navigation if this fails)
    markNotificationAsRead(notification.id)
      .then((success) => {
        if (success) {
          console.log("Successfully marked notification as read");
        }
      })
      .catch((error) => {
        console.error("Error marking notification as read:", error);
      });

    // Handle navigation based on notification type
    if (notification.data) {
      console.log(
        "Processing notification data for navigation:",
        notification.data
      );

      switch (notification.data.action) {
        case "view_agreement":
          navigation.navigate("Agreement", {
            id: notification.data.agreementId,
          });
          break;

        case "booking_request":
          navigation.navigate("Booking", {
            id: notification.data.bookingId,
          });
          break;

        case "property_update":
          navigation.navigate("Property", {
            id: notification.data.propertyId,
          });
          break;

        case "payment_received":
          navigation.navigate("Payment", {
            id: notification.data.paymentId,
          });
          break;

        default:
          if (notification.data.screen) {
            navigation.navigate(
              notification.data.screen,
              notification.data.params
            );
          }
      }
    }
  };

  // Fetch current user ID from Firebase
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser) {
          const userId = await getUserDataFromFirebase();
          console.log("Fetched Firebase User ID:", userId);
          if (userId) {
            setCurrentUserId(Number(userId));
          } else {
            setErrorMessage("Unable to fetch user data.");
          }
        } else {
          console.log("No current user found.");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user data from Firebase:", error);
        setErrorMessage("Unable to fetch user data.");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUserId();
  }, []);

  // Listen for notifications
  useEffect(() => {
    if (!currentUserId) {
      return () => {};
    }

    setLoading(true);
    let unsubscribeFunc = null;

    try {
      const userIdString = currentUserId.toString();

      unsubscribeFunc = listenForUserNotifications((fetchedNotifications) => {
        setNotifications(fetchedNotifications);
        setLoading(false);
      }, userIdString);
    } catch (error) {
      console.error("Error setting up notification listener:", error);
      setErrorMessage("Failed to load notifications. Trying direct fetch...");

      // Try direct fetch as fallback
      directFetchNotifications(currentUserId)
        .then((fetchedNotifications) => {
          setNotifications(fetchedNotifications);
        })
        .catch((error) => {
          console.error("Error with direct fetch:", error);
          setErrorMessage("Could not load notifications");
        })
        .finally(() => {
          setLoading(false);
        });

      unsubscribeFunc = () => {};
    }

    return () => {
      try {
        if (unsubscribeFunc && typeof unsubscribeFunc === "function") {
          unsubscribeFunc();
        }
      } catch (error) {
        console.error("Error unsubscribing:", error);
      }
    };
  }, [currentUserId]);

  // Render notification item
  const renderNotificationItem = ({ item: notification }) => {
    const { icon, iconType, color, text } =
      getNotificationTypeInfo(notification);

    return (
      <TouchableOpacity
        className={`notificationItem ${
          notification.read ? "bg-white" : "bg-blue-50"
        } border border-gray-200 rounded-lg mb-2 flex-row overflow-hidden`}
        onPress={() => handleNotificationPress(notification)}
      >
        {/* Colored bar indicator */}
        <View className={`typeIndicator ${color}`} />

        <View className="notificationContent flex-1 p-3">
          {/* Header with title and time */}
          <View className="notificationHeader flex-row justify-between mb-1">
            <View className="titleContainer flex-row items-center flex-1">
              {iconType === "Feather" && (
                <Feather
                  name={icon}
                  size={14}
                  color={color}
                  style={styles.icon}
                />
              )}
              <Text className="title text-gray-800 font-semibold text-sm flex-1">
                {notification.title}
              </Text>
            </View>

            <View className="metaContainer flex-row items-center">
              {!notification.read && <View className="unreadDot" />}
              <View className="timeContainer flex-row items-center">
                <Feather name="clock" size={10} color="#9CA3AF" />
                <Text className="timeText text-xs text-gray-500 ml-1">
                  {formatTimeAgo(notification.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* Body */}
          <Text className="body text-gray-700 text-xs ml-5 line-clamp-2">
            {notification.body}
          </Text>

          {/* Tag */}
          {notification.data && notification.data.action && (
            <View className="tagContainer ml-5">
              <View className="tag bg-gray-100 rounded-md px-2 py-1">
                <Text className="tagText text-gray-500 text-xs">{text}</Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Empty state component
  const EmptyState = () => (
    <View className="emptyState flex-1 justify-center items-center p-6">
      <Feather name="bell" size={32} color="#D1D5DB" className="emptyIcon" />
      <Text className="emptyText text-sm text-gray-600 mb-1">
        No notifications yet
      </Text>
      <Text className="emptySubtext text-xs text-gray-500 text-center">
        You'll see notifications here when they arrive
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <Text className="text-2xl font-bold text-center mb-6 text-[#20319D] mt-4">
        Notifications
      </Text>
      {/* Header with unread count */}
      {unreadCount > 0 && (
        <View className="unreadBanner flex-row items-center p-3 bg-blue-50 rounded-lg mb-3">
          <Feather name="bell" size={12} color="#2563EB" />
          <Text className="unreadText text-sm font-medium text-blue-700 ml-2">
            You have {unreadCount} unread notification
            {unreadCount !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* Error Message */}
      {errorMessage && (
        <View className="errorContainer p-3 bg-red-100 rounded-lg mb-3">
          <Text className="errorText text-sm text-red-700">{errorMessage}</Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View className="loadingContainer flex-1 justify-center items-center p-6">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="loadingText text-sm text-gray-600 mt-3">
            Loading...
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View className="separator h-2" />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
  typeIndicator: {
    width: 4,
    height: "100%",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginRight: 6,
  },
});

export default NotificationScreen;
