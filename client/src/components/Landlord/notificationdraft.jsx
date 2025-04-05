import React, { useState, useEffect, useMemo } from "react";
import {
  getDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { FIREBASE_DB } from "../../services/Firebase-config.js";
import { getUserDataFromFirebase } from "../../context/AuthContext.js";
import ApiHandler from "../../api/ApiHandler.js";
import {
  listenForUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../services/Firebase-notification.js";
import {
  FiBell,
  FiRefreshCw,
  FiMessageCircle,
  FiFileText,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

// Modified to accept userId prop from parent component
const NotificationPage = ({
  userId,
  navigateFunction,
  onUnreadCountChange,
}) => {
  console.log(
    "NotificationPage rendering",
    userId ? `with userId: ${userId}` : "without userId prop"
  );

  const [notifications, setNotifications] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [currentUserId, setCurrentUserId] = useState(userId || null);
  const [currentUserName, setCurrentUserName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const defaultNavigate = useNavigate();
  const navigate = navigateFunction || defaultNavigate;

  // Calculate unread count
  const unreadCount = useMemo(() => {
    const count = notifications.filter(
      (notification) => !notification.read
    ).length;

    if (onUnreadCountChange && typeof onUnreadCountChange === "function") {
      onUnreadCountChange(count);
    }

    return count;
  }, [notifications, onUnreadCountChange]);

  // Direct fetch function when listener fails
  const fetchNotificationsDirectly = async () => {
    try {
      setLoading(true);

      if (!currentUserId) {
        setErrorMessage("No user ID available for fetching notifications");
        setLoading(false);
        return;
      }

      // IMPORTANT: Always convert ID to string before Firebase query
      const userIdString = currentUserId.toString();
      console.log("Directly fetching for userId (string):", userIdString);

      const q = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "==", userIdString),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const fetchedNotifications = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedNotifications.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        });
      });

      console.log(
        "Directly fetched notifications:",
        fetchedNotifications.length
      );

      // Debug each notification
      fetchedNotifications.forEach((notification) => {
        console.log(
          `Retrieved notification: ID=${notification.id}, Title=${notification.title}`
        );
        if (notification.data?.action) {
          console.log(`  Type: ${notification.data.action}`);
        } else {
          // Important: Check structure of notification for debugging
          console.log(
            `  No action type. Full data:`,
            JSON.stringify(notification)
          );
        }
      });

      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error("Error directly fetching notifications:", error);
      setErrorMessage("Error fetching notifications: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user ID from Firebase or use the one passed as prop
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        setErrorMessage(null);

        // If userId was provided as prop, use it directly
        if (userId) {
          console.log("Using userId from props:", userId);
          setCurrentUserId(userId);
          await fetchUserName(userId);
          setLoading(false);
          return;
        }

        // Otherwise fetch from Firebase
        console.log("Fetching userId from Firebase");
        const fetchedUserId = await getUserDataFromFirebase();
        if (fetchedUserId) {
          console.log("Fetched userId:", fetchedUserId);
          setCurrentUserId(fetchedUserId);
          await fetchUserName(fetchedUserId);
        } else {
          console.log("No userId found");
          setErrorMessage(
            "Could not retrieve user ID. Please try logging in again."
          );
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setErrorMessage("Error fetching user data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUserId();
  }, [userId]); // Depend on userId to re-run if it changes

  // Fetch user's name from API
  const fetchUserName = async (userId) => {
    if (!userId) {
      console.log("No userId to fetch name for");
      return;
    }

    try {
      console.log("Fetching username for userId:", userId);
      const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
      if (response) {
        const { firstName, lastName } = response;
        const fullName = `${firstName} ${lastName}`;
        setCurrentUserName(fullName);
        console.log("User name fetched:", fullName);

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

  // Detect if a notification is a chat notification
  const isChatNotification = (notification) => {
    // Standard way - checking data.action
    if (notification?.data?.action === "view_chat") {
      return true;
    }

    // Fallback - look for chatId in either data or directly on notification
    if (notification?.data?.chatId || notification?.chatId) {
      return true;
    }

    // Additional check - look for chat-related content in title or body
    if (
      notification?.title?.toLowerCase().includes("chat") ||
      notification?.title?.toLowerCase().includes("message") ||
      notification?.body?.toLowerCase().includes("chat") ||
      notification?.body?.toLowerCase().includes("message")
    ) {
      return true;
    }

    return false;
  };

  // Detect if a notification is an agreement notification
  const isAgreementNotification = (notification) => {
    // Standard way - checking data.action
    if (notification?.data?.action === "view_agreement") {
      return true;
    }

    // Fallback - look for agreementId in either data or directly on notification
    if (notification?.data?.agreementId || notification?.agreementId) {
      return true;
    }

    // Additional check - look for agreement-related content in title or body
    if (
      notification?.title?.toLowerCase().includes("agreement") ||
      notification?.body?.toLowerCase().includes("agreement")
    ) {
      return true;
    }

    return false;
  };

  // Listen for notifications from Firebase - FIXED VERSION
  useEffect(() => {
    if (!currentUserId) {
      console.log("No currentUserId, not setting up notification listener");
      return () => {};
    }

    console.log("Setting up notification listener for userId:", currentUserId);
    setLoading(true);
    let unsubscribeFunc = null;

    try {
      // CRUCIAL FIX: Convert to string before Firebase query
      const userIdString = currentUserId.toString();
      console.log("Converted userId to string:", userIdString);

      unsubscribeFunc = listenForUserNotifications((fetchedNotifications) => {
        console.log("Received notifications:", fetchedNotifications.length);

        // Debug notifications received
        fetchedNotifications.forEach((notification) => {
          console.log(
            `Notification from listener: ID=${notification.id}, Title=${notification.title}`
          );
          if (notification.data?.action) {
            console.log(`  Type: ${notification.data.action}`);
          } else {
            // Important: Check structure of notification for debugging
            console.log(
              `  No action type. Full data:`,
              JSON.stringify(notification)
            );
          }

          // Check if chat notification using our enhanced detection
          const isChat = isChatNotification(notification);
          const isAgreement = isAgreementNotification(notification);
          console.log(`  isChat: ${isChat}, isAgreement: ${isAgreement}`);
        });

        setNotifications(fetchedNotifications);
        setLoading(false);

        // Load sender names for each notification
        fetchedNotifications.forEach((notification) => {
          if (notification.senderId) {
            fetchSenderUsername(notification.senderId);
          }
        });
      }, userIdString); // THIS IS THE KEY FIX - passing userIdString as second parameter
    } catch (error) {
      console.error("Error setting up notification listener:", error);
      setLoading(false);
      setErrorMessage(
        "Failed to load notifications. Trying direct fetch method..."
      );

      // Try direct fetch as fallback
      fetchNotificationsDirectly();

      unsubscribeFunc = () => {};
    }

    // Clean up listener when component unmounts
    return () => {
      console.log("Cleaning up notification listener");
      try {
        if (unsubscribeFunc && typeof unsubscribeFunc === "function") {
          unsubscribeFunc();
        }
      } catch (error) {
        console.error("Error unsubscribing from notifications:", error);
      }
    };
  }, [currentUserId]);

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Helper function to get notification icon based on type
  const getNotificationIcon = (notification) => {
    if (isChatNotification(notification)) {
      return <FiMessageCircle className="text-blue-500 text-lg mr-2" />;
    } else if (isAgreementNotification(notification)) {
      return <FiFileText className="text-green-500 text-lg mr-2" />;
    } else {
      return <FiBell className="text-gray-500 text-lg mr-2" />;
    }
  };

  // Helper function to get notification style based on type
  const getNotificationStyle = (notification) => {
    if (!notification.read) {
      return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    }

    if (isChatNotification(notification)) {
      return "bg-white dark:bg-gray-800 border-blue-100 dark:border-blue-900 border-l-blue-300 dark:border-l-blue-700";
    } else if (isAgreementNotification(notification)) {
      return "bg-white dark:bg-gray-800 border-green-100 dark:border-green-900 border-l-green-300 dark:border-l-green-700";
    } else {
      return "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    console.log("Notification clicked:", notification);

    // Update UI immediately first, regardless of backend success
    setNotifications((prevNotifications) =>
      prevNotifications.map((n) =>
        n.id === notification.id ? { ...n, read: true } : n
      )
    );

    // Mark as read in background
    markNotificationAsRead(notification.id).catch((error) => {
      console.error("Error marking notification as read:", error);
    });

    // Get chat or agreement IDs from either location
    const chatId = notification?.data?.chatId || notification?.chatId;
    const agreementId =
      notification?.data?.agreementId || notification?.agreementId;

    // Handle specific actions if needed
    if (isAgreementNotification(notification) && agreementId) {
      console.log("Navigate to agreement:", agreementId);
      navigate(`/landlord/booking/${agreementId}`);
    } else if (isChatNotification(notification) && chatId) {
      console.log("Navigate to chat:", chatId);
      // Get sender and receiver info from either location
      const senderId = notification?.data?.senderId || notification?.senderId;
      const receiverId =
        notification?.data?.receiverId || notification?.receiverId;
      const actualReceiverId =
        notification?.data?.actualReceiverId || notification?.actualReceiverId;

      navigate(`/landlord/chat/${chatId}`, {
        state: {
          senderId,
          receiverId,
          actualReceiverId,
        },
      });
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();

      // Update UI immediately
      setNotifications((prevNotifications) =>
        prevNotifications.map((n) => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      // Refetch current user data
      if (currentUserId) {
        await fetchUserName(currentUserId);
        await fetchNotificationsDirectly();
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 1000);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full">
      {/* Header */}
      <div className="border-b dark:border-gray-700 pb-4 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-blue-500 text-white rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </h1>

          <div className="flex space-x-2">
            <button
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FiRefreshCw
                className={`${refreshing ? "animate-spin" : ""}`}
                size={16}
              />
            </button>

            {notifications.length > 0 && unreadCount > 0 && (
              <button
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={handleMarkAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {currentUserName && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            For {currentUserName}
          </p>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-3 p-2 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">
            Loading notifications...
          </p>
        </div>
      ) : (
        <>
          {/* Notifications List */}
          {notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => {
                // Debug log
                const isChat = isChatNotification(notification);
                const isAgreement = isAgreementNotification(notification);
                console.log(
                  `Rendering notification: ${notification.id}, isChat: ${isChat}, isAgreement: ${isAgreement}`
                );

                return (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${getNotificationStyle(
                      notification
                    )} hover:shadow-md transition cursor-pointer relative`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        {getNotificationIcon(notification)}
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                          {notification.title}
                        </h3>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mt-2 ml-7">
                      {notification.body}
                    </p>

                    {notification.senderId && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-2 ml-7">
                        From:{" "}
                        {usernames[notification.senderId] || "Loading user..."}
                      </p>
                    )}

                    {/* Action type badge */}
                    <div className="mt-3 ml-7">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          isChat
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                            : isAgreement
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {isAgreement
                          ? "Agreement"
                          : isChat
                          ? "Chat"
                          : "Notification"}
                      </span>
                    </div>

                    {!notification.read && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full absolute top-4 right-4"></div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Empty State
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
              <FiBell
                size={60}
                className="mb-4 text-gray-300 dark:text-gray-600"
              />
              <p className="text-xl">No notifications yet</p>
              <p className="text-sm mt-2">
                When you receive notifications, they will appear here
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationPage;
