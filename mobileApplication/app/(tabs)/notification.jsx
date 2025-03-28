import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  listenForUserNotifications,
  markNotificationAsRead,
  directFetchNotifications,
} from "../../firebaseNotification.js";
import { getAuth } from "firebase/auth";
import { useRouter } from "expo-router";

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.read).length;
  }, [notifications]);

  const getNotificationTypeInfo = (notification) => {
    if (!notification.data || !notification.data.action) {
      return {
        icon: "bell",
        color: "#6B7280",
        bgColor: "#F3F4F6",
        text: "Notification",
      };
    }

    switch (notification.data.action) {
      case "view_agreement":
        return {
          icon: "file-text",
          color: "#10B981",
          bgColor: "#D1FAE5",
          text: "Agreement",
        };
      case "booking_request":
        return {
          icon: "calendar",
          color: "#3B82F6",
          bgColor: "#DBEAFE",
          text: "Booking",
        };
      case "property_update":
        return {
          icon: "home",
          color: "#8B5CF6",
          bgColor: "#EDE9FE",
          text: "Property",
        };
      case "payment_received":
        return {
          icon: "dollar-sign",
          color: "#F59E0B",
          bgColor: "#FEF3C7",
          text: "Payment",
        };
      case "view_chat":
        return {
          icon: "message-circle",
          color: "#14B8A6",
          bgColor: "#CCFBF1",
          text: "Message",
        };
      default:
        return {
          icon: "bell",
          color: "#6B7280",
          bgColor: "#F3F4F6",
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
        className={`flex-row border rounded-lg overflow-hidden mb-2 ${
          notification.read
            ? "bg-white border-gray-100"
            : "bg-blue-50 border-blue-100"
        }`}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={{ backgroundColor: color }} className="w-1 h-full" />

        <View className="flex-1 p-3">
          <View className="flex-row justify-between mb-1">
            <View className="flex-1 flex-row items-center">
              <Feather name={icon} size={14} color={color} className="mr-1.5" />
              <Text
                className="text-sm font-semibold text-gray-800 flex-1"
                numberOfLines={1}
              >
                {notification.title}
              </Text>
            </View>

            <View className="flex-row items-center">
              {!notification.read && (
                <View className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
              )}
              <View className="flex-row items-center">
                <Feather name="clock" size={10} color="#9CA3AF" />
                <Text className="text-xs text-gray-400 ml-1">
                  {formatTimeAgo(notification.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          <Text className="text-xs text-gray-600 ml-5 mb-1" numberOfLines={2}>
            {notification.body}
          </Text>

          {notification.data && notification.data.action && (
            <View className="ml-5">
              <View
                style={{ backgroundColor: bgColor }}
                className="self-start px-2 py-0.5 rounded"
              >
                <Text style={{ color }} className="text-xs font-medium">
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
    <View className="flex-1 bg-white px-4" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Text className="text-2xl font-bold text-center mb-6 mt-2 text-[#20319D]">
        Notifications
      </Text>

      {unreadCount > 0 && (
        <View className="flex-row items-center bg-blue-50 rounded-lg p-3 mb-3">
          <Feather name="bell" size={12} color="#2563EB" />
          <Text className="text-sm font-medium text-blue-600 ml-2">
            You have {unreadCount} unread notification
            {unreadCount !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {errorMessage && (
        <View className="bg-red-100 rounded-lg p-3 mb-3">
          <Text className="text-sm text-red-600">{errorMessage}</Text>
        </View>
      )}

      {loading ? (
        <View className="flex-1 justify-center items-center p-6">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-3 text-sm text-gray-500">Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          className="flex-grow"
          contentContainerStyle={{ paddingBottom: 16 }}
          ListEmptyComponent={() => (
            <View className="flex-1 justify-center items-center p-6">
              <Feather name="bell" size={32} color="#D1D5DB" />
              <Text className="text-sm text-gray-500 mt-3">
                No notifications yet
              </Text>
              <Text className="text-xs text-gray-400 text-center mt-1">
                You'll see notifications here when they arrive
              </Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View className="h-2" />}
        />
      )}
    </View>
  );
};

export default NotificationScreen;
