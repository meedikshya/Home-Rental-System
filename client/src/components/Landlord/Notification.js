import React, { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { FIREBASE_DB } from "../../services/Firebase-config.js";
import { getUserDataFromFirebase } from "../../context/AuthContext.js";
import {
  listenForUserNotifications,
  markNotificationAsRead,
} from "../../services/Firebase-notification.js";
import {
  FiBell,
  FiFile,
  FiHome,
  FiCalendar,
  FiDollarSign,
  FiClock,
  FiCircle,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

// Accepts userId prop from parent component
const NotificationPage = ({
  userId,
  navigateFunction,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(userId || null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const defaultNavigate = useNavigate();
  const navigate = navigateFunction || defaultNavigate;

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

      // Create direct query
      const q = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "==", userIdString),
        orderBy("createdAt", "desc")
      );

      // Execute query
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

      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error("Error directly fetching notifications:", error);
      setErrorMessage("Error fetching notifications: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get notification type icon and color
  const getNotificationTypeInfo = (notification) => {
    if (!notification.data || !notification.data.action) {
      return {
        icon: <FiBell size={14} />,
        color: "bg-gray-500",
        text: "Notification",
      };
    }

    switch (notification.data.action) {
      case "view_agreement":
        return {
          icon: <FiFile size={14} />,
          color: "bg-green-500",
          text: "Agreement",
        };
      case "booking_request":
        return {
          icon: <FiCalendar size={14} />,
          color: "bg-blue-500",
          text: "Booking",
        };
      case "property_update":
        return {
          icon: <FiHome size={14} />,
          color: "bg-purple-500",
          text: "Property",
        };
      case "payment_received":
        return {
          icon: <FiDollarSign size={14} />,
          color: "bg-yellow-500",
          text: "Payment",
        };
      default:
        return {
          icon: <FiBell size={14} />,
          color: "bg-gray-500",
          text: notification.data.action || "Notification",
        };
    }
  };

  // Format timestamp to relative time (like "2 hours ago")
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
    console.log("Notification clicked:", notification);

    // IMPORTANT: Update UI immediately first, regardless of backend success
    setNotifications((prevNotifications) =>
      prevNotifications.map((n) =>
        n.id === notification.id ? { ...n, read: true } : n
      )
    );

    // Try to mark as read in the background, but don't block navigation if it fails
    markNotificationAsRead(notification.id)
      .then((success) => {
        if (success) {
          console.log("Successfully marked notification as read");
        }
      })
      .catch((error) => {
        console.error("Error marking notification as read:", error);
        // Navigation will still work even if marking as read fails
      });

    // Handle navigation based on notification type
    if (notification.data) {
      console.log(
        "Processing notification data for navigation:",
        notification.data
      );

      switch (notification.data.action) {
        case "view_agreement":
          console.log(
            `Navigating to booking with ID: ${notification.data.agreementId}`
          );
          navigate(`/landlord/booking/${notification.data.agreementId}`);
          break;

        case "booking_request":
          console.log(`Navigating to bookings: ${notification.data.bookingId}`);
          navigate(`/landlord/booking/${notification.data.bookingId}`);
          break;

        case "property_update":
          console.log(
            `Navigating to property: ${notification.data.propertyId}`
          );
          navigate(`/landlord/property/${notification.data.propertyId}`);
          break;

        case "payment_received":
          console.log(`Navigating to payment: ${notification.data.paymentId}`);
          navigate(`/landlord/payment/${notification.data.paymentId}`);
          break;

        default:
          if (notification.data.route) {
            navigate(notification.data.route);
          }
      }
    }
  };

  // Fetch current user ID from Firebase or use the one passed as prop
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        setErrorMessage(null);

        // If userId was provided as prop, use it directly
        if (userId) {
          setCurrentUserId(userId);
          setLoading(false);
          return;
        }

        // Otherwise fetch from Firebase
        const fetchedUserId = await getUserDataFromFirebase();
        if (fetchedUserId) {
          setCurrentUserId(fetchedUserId);
        } else {
          setErrorMessage(
            "Could not retrieve user ID. Please try logging in again."
          );
        }
      } catch (error) {
        setErrorMessage("Error fetching user data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUserId();
  }, [userId]); // Depend on userId to re-run if it changes

  // Listen for notifications from Firebase
  useEffect(() => {
    if (!currentUserId) {
      return () => {};
    }

    setLoading(true);
    let unsubscribeFunc = null;

    try {
      // IMPORTANT: Always convert to string before Firebase query
      const userIdString = currentUserId.toString();

      unsubscribeFunc = listenForUserNotifications((fetchedNotifications) => {
        setNotifications(fetchedNotifications);
        setLoading(false);
      }, userIdString); // Pass the string version of the ID
    } catch (error) {
      setErrorMessage(
        "Failed to load notifications. Trying direct fetch method..."
      );

      // Try direct fetch as fallback
      fetchNotificationsDirectly();

      unsubscribeFunc = () => {};
    }

    // Clean up listener when component unmounts
    return () => {
      try {
        if (unsubscribeFunc && typeof unsubscribeFunc === "function") {
          unsubscribeFunc();
        }
      } catch (error) {
        console.error("Error unsubscribing from notifications:", error);
      }
    };
  }, [currentUserId]);

  return (
    <div className="bg-white dark:bg-gray-800 w-full">
      {/* Header with unread count summary */}
      {unreadCount > 0 && (
        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 mb-2 rounded-lg">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center">
            <FiBell size={12} className="mr-1" />
            You have {unreadCount} unread notification
            {unreadCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-2 p-2 bg-red-100 border border-red-300 text-red-700 rounded text-xs">
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
        </div>
      ) : (
        <>
          {/* Notifications List */}
          {notifications.length > 0 ? (
            <div className="space-y-1 max-h-[350px] overflow-y-auto">
              {notifications.map((notification) => {
                const { icon, color, text } =
                  getNotificationTypeInfo(notification);
                return (
                  <div
                    key={notification.id}
                    className={`p-2 rounded border ${
                      notification.read
                        ? "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
                        : "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800"
                    } hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-150 cursor-pointer relative group`}
                    onClick={() => handleNotificationPress(notification)}
                  >
                    {/* Type indicator */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${color} rounded-tl rounded-bl`}
                    ></div>

                    <div className="pl-2">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center">
                          <span
                            className={`text-${color.replace(
                              "bg-",
                              ""
                            )} mr-1.5`}
                          >
                            {icon}
                          </span>
                          <h3 className="text-sm font-medium text-gray-800 dark:text-white">
                            {notification.title}
                          </h3>
                        </div>

                        <div className="flex items-center">
                          {!notification.read && (
                            <FiCircle size={8} className="text-blue-500 mr-1" />
                          )}
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center">
                            <FiClock size={10} className="inline mr-0.5" />
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 ml-5">
                        {notification.body}
                      </p>

                      <div className="flex justify-between mt-1 ml-5">
                        {notification.data && notification.data.action && (
                          <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                            {text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Empty State
            <div className="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
              <FiBell
                size={32}
                className="mb-3 text-gray-300 dark:text-gray-600"
              />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">
                You'll see notifications here when they arrive
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationPage;
