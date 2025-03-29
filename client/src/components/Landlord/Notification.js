import React, { useState, useEffect } from "react";
import { getDoc, doc } from "firebase/firestore";
import { FIREBASE_DB } from "../../services/Firebase-config.js";
import { getUserDataFromFirebase } from "../../context/AuthContext.js";
import ApiHandler from "../../api/ApiHandler.js";
import {
  listenForUserNotifications,
  sendTestNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../services/Firebase-notification.js";
import { FiBell, FiRefreshCw } from "react-icons/fi";

// Modified to accept userId prop from parent component
const NotificationPage = ({ userId }) => {
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

  // Fetch current user ID from Firebase or use the one passed as prop
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
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
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
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
      unsubscribeFunc = listenForUserNotifications((fetchedNotifications) => {
        console.log("Received notifications:", fetchedNotifications.length);
        setNotifications(fetchedNotifications);
        setLoading(false);

        // Load sender names for each notification
        fetchedNotifications.forEach((notification) => {
          if (notification.senderId) {
            fetchSenderUsername(notification.senderId);
          }
        });
      });
    } catch (error) {
      console.error("Error setting up notification listener:", error);
      setLoading(false);
      unsubscribeFunc = () => {};
    }

    // Clean up listener when component unmounts - safer approach
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

  // Handle notification press (mark as read)
  const handleNotificationPress = (id) => {
    markNotificationAsRead(id).catch((error) => {
      console.error("Error marking notification as read:", error);
    });
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
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
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      // Refresh will happen automatically via the Firebase listener
      setTimeout(() => {
        setRefreshing(false);
      }, 1000);
    }
  };

  // Test button to send a notification
  const sendTestNotif = async () => {
    if (!currentUserId) {
      console.log("Can't send notification - no user ID");
      return;
    }

    try {
      await sendTestNotification(
        "New Property Alert",
        "A new property matching your preferences is now available."
      );
    } catch (error) {
      console.error("Error sending test notification:", error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full">
      {/* Header */}
      <div className="border-b dark:border-gray-700 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Notifications
        </h1>
        {currentUserName && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            For {currentUserName}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between mb-6">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center"
          onClick={sendTestNotif}
        >
          <FiBell className="mr-2" />
          Send Test Notification
        </button>

        <div className="flex space-x-2">
          <button
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md flex items-center"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FiRefreshCw
              className={`mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          {notifications.length > 0 && (
            <button
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md"
              onClick={handleMarkAllAsRead}
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

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
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.read
                      ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  } hover:shadow-md transition cursor-pointer relative`}
                  onClick={() => handleNotificationPress(notification.id)}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {notification.title}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 mt-2">
                    {notification.body}
                  </p>

                  {notification.senderId && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-2">
                      From:{" "}
                      {usernames[notification.senderId] || "Loading user..."}
                    </p>
                  )}

                  {!notification.read && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full absolute top-4 right-4"></div>
                  )}
                </div>
              ))}
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
