import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../hooks/useColorScheme.jsx";

const NotificationScreen = ({ userId: passedUserId, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(passedUserId || null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const navigation = useNavigation();
  const { user } = useAuth();
  const isDarkMode = useTheme() === "dark";

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

  // Get user ID if not passed
  useEffect(() => {
    const getUserId = async () => {
      try {
        setErrorMessage(null);

        if (passedUserId) {
          setCurrentUserId(passedUserId);
          return;
        }

        if (user?.uid) {
          setCurrentUserId(user.uid);
        } else {
          setErrorMessage("No user ID available");
        }
      } catch (error) {
        console.error("Error getting user ID:", error);
        setErrorMessage("Error getting user data");
      } finally {
        setLoading(false);
      }
    };

    getUserId();
  }, [passedUserId, user]);

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
        style={[
          styles.notificationItem,
          {
            backgroundColor: notification.read
              ? isDarkMode
                ? "#1F2937"
                : "white"
              : isDarkMode
              ? "rgba(59, 130, 246, 0.1)"
              : "#EBF5FF",
            borderColor: notification.read
              ? isDarkMode
                ? "#374151"
                : "#E5E7EB"
              : isDarkMode
              ? "#2563EB"
              : "#BFDBFE",
          },
        ]}
        onPress={() => handleNotificationPress(notification)}
      >
        {/* Colored bar indicator */}
        <View style={[styles.typeIndicator, { backgroundColor: color }]} />

        <View style={styles.notificationContent}>
          {/* Header with title and time */}
          <View style={styles.notificationHeader}>
            <View style={styles.titleContainer}>
              {iconType === "Feather" && (
                <Feather
                  name={icon}
                  size={14}
                  color={color}
                  style={styles.icon}
                />
              )}
              <Text
                style={[
                  styles.title,
                  { color: isDarkMode ? "white" : "#1F2937" },
                ]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
            </View>

            <View style={styles.metaContainer}>
              {!notification.read && <View style={styles.unreadDot} />}
              <View style={styles.timeContainer}>
                <Feather
                  name="clock"
                  size={10}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
                <Text style={styles.timeText}>
                  {formatTimeAgo(notification.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* Body */}
          <Text
            style={[styles.body, { color: isDarkMode ? "#D1D5DB" : "#4B5563" }]}
            numberOfLines={2}
          >
            {notification.body}
          </Text>

          {/* Tag */}
          {notification.data && notification.data.action && (
            <View style={styles.tagContainer}>
              <View
                style={[
                  styles.tag,
                  { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: isDarkMode ? "#D1D5DB" : "#6B7280" },
                  ]}
                >
                  {text}
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Empty state component
  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Feather
        name="bell"
        size={32}
        color={isDarkMode ? "#4B5563" : "#D1D5DB"}
        style={styles.emptyIcon}
      />
      <Text
        style={[
          styles.emptyText,
          { color: isDarkMode ? "#9CA3AF" : "#6B7280" },
        ]}
      >
        No notifications yet
      </Text>
      <Text
        style={[
          styles.emptySubtext,
          { color: isDarkMode ? "#9CA3AF" : "#6B7280" },
        ]}
      >
        You'll see notifications here when they arrive
      </Text>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? "#111827" : "white" },
      ]}
    >
      {/* Header with unread count */}
      {unreadCount > 0 && (
        <View
          style={[
            styles.unreadBanner,
            {
              backgroundColor: isDarkMode
                ? "rgba(59, 130, 246, 0.2)"
                : "#EBF5FF",
            },
          ]}
        >
          <Feather
            name="bell"
            size={12}
            color={isDarkMode ? "#93C5FD" : "#2563EB"}
          />
          <Text
            style={[
              styles.unreadText,
              { color: isDarkMode ? "#93C5FD" : "#2563EB" },
            ]}
          >
            You have {unreadCount} unread notification
            {unreadCount !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* Error Message */}
      {errorMessage && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text
            style={[
              styles.loadingText,
              { color: isDarkMode ? "#D1D5DB" : "#6B7280" },
            ]}
          >
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
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    flexGrow: 1,
  },
  notificationItem: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    flexDirection: "row",
    overflow: "hidden",
  },
  typeIndicator: {
    width: 4,
    height: "100%",
  },
  notificationContent: {
    flex: 1,
    padding: 12,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    marginRight: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginRight: 6,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  body: {
    fontSize: 12,
    marginLeft: 20,
    lineHeight: 18,
    marginBottom: 4,
  },
  tagContainer: {
    marginLeft: 20,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  tagText: {
    fontSize: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: "center",
  },
  separator: {
    height: 8,
  },
});

export default NotificationScreen;
