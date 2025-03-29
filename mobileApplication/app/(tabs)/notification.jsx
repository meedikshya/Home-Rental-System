import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  listenForUserNotifications,
  markNotificationAsRead,
  directFetchNotifications,
} from "../../firebaseNotification.js";
import { getAuth } from "firebase/auth";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.read).length;
  }, [notifications]);

  const getNotificationTypeInfo = (notification) => {
    if (!notification.data || !notification.data.action) {
      return {
        icon: "bell",
        color: "#6B7280", // Grey
        bgColor: "#F3F4F6", // Light Grey
        text: "Notification",
      };
    }

    switch (notification.data.action) {
      case "view_agreement":
        return {
          icon: "file-text",
          color: "#3B82F6", // Blue
          bgColor: "#DBEAFE", // Light Blue
          text: "Agreement",
        };
      case "booking_request":
        return {
          icon: "calendar",
          color: "#3B82F6", // Blue
          bgColor: "#DBEAFE", // Light Blue
          text: "Booking",
        };
      case "property_update":
        return {
          icon: "home",
          color: "#3B82F6", // Blue
          bgColor: "#DBEAFE", // Light Blue
          text: "Property",
        };
      case "payment_received":
        return {
          icon: "dollar-sign",
          color: "#3B82F6", // Blue
          bgColor: "#DBEAFE", // Light Blue
          text: "Payment",
        };
      case "view_chat":
        return {
          icon: "message-circle",
          color: "#3B82F6", // Blue
          bgColor: "#DBEAFE", // Light Blue
          text: "Message",
        };
      default:
        return {
          icon: "bell",
          color: "#6B7280", // Grey
          bgColor: "#F3F4F6", // Light Grey
          text: notification.data.action || "Notification",
        };
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "";

    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return `${date.getMonth() + 1}/${date.getDate()}/${date
      .getFullYear()
      .toString()
      .substr(-2)}`;
  };

  const handleNotificationPress = (notification) => {
    // Mark as read in UI and Firebase
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    markNotificationAsRead(notification.id).catch((error) => {
      console.error("Error marking notification as read:", error);
    });

    // Handle navigation with router
    if (notification.data) {
      switch (notification.data.action) {
        case "view_agreement":
          router.push({
            pathname: "/(pages)/agreement-page",
            params: {
              agreementId: notification.data.agreementId,
            },
          });
          break;

        case "property_update":
          router.push({
            pathname: "/(pages)/property",
            params: { id: notification.data.propertyId },
          });
          break;

        case "payment_received":
          router.push({
            pathname: "/(pages)/payment",
            params: { id: notification.data.paymentId },
          });
          break;

        case "view_chat":
          if (notification.data.chatId) {
            router.push({
              pathname: "/(tabs)/chat",
              params: {
                chatId: notification.data.chatId,
                senderId: notification.data.senderId,
                receiverId: notification.data.receiverId,
              },
            });
          }
          break;

        default:
          if (notification.data.screen) {
            router.push({
              pathname: notification.data.screen,
              params: notification.data.params || {},
            });
          }
      }
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setErrorMessage("Not logged in");
      setLoading(false);
      return () => {};
    }

    const firebaseId = currentUser.uid;
    let unsubscribe = null;

    try {
      unsubscribe = listenForUserNotifications((fetchedNotifications) => {
        setNotifications(fetchedNotifications);
        setLoading(false);
      }, firebaseId);
    } catch (error) {
      directFetchNotifications(firebaseId)
        .then(setNotifications)
        .catch(() => setErrorMessage("Could not load notifications"))
        .finally(() => setLoading(false));

      unsubscribe = () => {};
    }

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  const renderNotificationItem = ({ item: notification }) => {
    const { icon, color, bgColor, text } =
      getNotificationTypeInfo(notification);

    return (
      <TouchableOpacity
        className="mt-5"
        style={styles.notificationItem}
        onPress={() => handleNotificationPress(notification)}
      >
        <View
          style={[styles.notificationIndicator, { backgroundColor: color }]}
        />

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <View style={styles.notificationInfo}>
              <View
                style={[
                  styles.notificationIconContainer,
                  { backgroundColor: bgColor },
                ]}
              >
                <Feather name={icon} size={16} color={color} />
              </View>
              <Text style={styles.notificationTitle} numberOfLines={1}>
                {notification.title}
              </Text>
            </View>

            <View style={styles.notificationMeta}>
              {!notification.read && <View style={styles.unreadIndicator} />}
              <View style={styles.timeAgoContainer}>
                <Feather name="clock" size={11} color="#9CA3AF" />
                <Text style={styles.timeAgoText}>
                  {formatTimeAgo(notification.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.notificationBody} numberOfLines={2}>
            {notification.body}
          </Text>

          {notification.data && notification.data.action && (
            <View>
              <View
                style={[
                  styles.notificationAction,
                  { backgroundColor: bgColor },
                ]}
              >
                <Text style={[styles.notificationActionText, { color }]}>
                  {text}
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      <View style={styles.content}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {unreadCount > 0 && (
          <View style={styles.unreadBanner}>
            <Feather name="bell" size={16} color="#2563EB" />
            <Text style={styles.unreadText}>
              You have {unreadCount} unread notification
              {unreadCount !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Feather name="bell" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>No notifications yet</Text>
                <Text style={styles.emptySubtext}>
                  You'll see notifications here when they arrive
                </Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  // Header Styles
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  unreadText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2563EB",
    marginLeft: 8,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  itemSeparator: {
    height: 12,
  },
  notificationItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  notificationIndicator: {
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
    alignItems: "center",
    marginBottom: 8,
  },
  notificationInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  notificationMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginRight: 8,
  },
  timeAgoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeAgoText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 12,
  },
  notificationAction: {
    backgroundColor: "#EFF6FF", // Light Blue
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  notificationActionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#3B82F6",
  },
});

export default NotificationScreen;
