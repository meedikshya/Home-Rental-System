import React, { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { FIREBASE_DB } from "../../services/Firebase-config.js";
import {
  getUserDataFromFirebase,
  getFirebaseIdFromUserId,
} from "../../context/AuthContext.js";
import ApiHandler from "../../api/ApiHandler.js";
import {
  listenForUserNotifications,
  markNotificationAsRead,
} from "../../services/Firebase-notification.js";
import {
  FiBell,
  FiClock,
  FiCircle,
  FiMessageCircle,
  FiHome,
  FiFile,
  FiCalendar,
  FiDollarSign,
  FiInfo,
  FiPackage,
} from "react-icons/fi";

const NotificationPage = ({
  userId,
  navigateFunction,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [currentUserId, setCurrentUserId] = useState(userId || null);
  const [firebaseUserId, setFirebaseUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const fetchedUserIds = useRef(new Set());

  // Calculate unread count and expose it to parent component
  const unreadCount = useMemo(() => {
    const count = notifications.filter(
      (notification) => !notification.read
    ).length;

    if (onUnreadCountChange && typeof onUnreadCountChange === "function") {
      onUnreadCountChange(count);
    }

    return count;
  }, [notifications, onUnreadCountChange]);

  // Fetch current user ID and Firebase ID
  useEffect(() => {
    const fetchUserIds = async () => {
      try {
        if (userId) {
          setCurrentUserId(userId);
          await fetchUserName(userId);

          // Get corresponding Firebase ID
          const fetchedFirebaseId = await getFirebaseIdFromUserId(userId);
          if (fetchedFirebaseId) {
            setFirebaseUserId(fetchedFirebaseId);
          }
        }
      } catch (error) {
        console.error("Error fetching user IDs:", error);
        setErrorMessage("Couldn't load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserIds();
  }, [userId]);

  // Fetch user's name from API
  const fetchUserName = async (userId) => {
    if (!userId) return;

    try {
      const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
      if (response) {
        const { firstName, lastName } = response;
        setCurrentUserName(`${firstName} ${lastName}`);

        // Also add to usernames cache
        setUsernames((prev) => ({
          ...prev,
          [userId]: `${firstName} ${lastName}`,
        }));
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
  };

  // Fetch notifications using app ID
  const fetchNotificationsForAppId = async () => {
    if (!currentUserId) return [];

    try {
      const q = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "==", currentUserId.toString()),
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

      return fetchedNotifications;
    } catch (error) {
      console.error("Error fetching notifications for app ID:", error);
      return [];
    }
  };

  // Fetch notifications using Firebase ID
  const fetchNotificationsForFirebaseId = async () => {
    if (!firebaseUserId) return [];

    try {
      const q = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "==", firebaseUserId),
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

      return fetchedNotifications;
    } catch (error) {
      console.error("Error fetching notifications for Firebase ID:", error);
      return [];
    }
  };

  // Fetch all notifications from both sources
  const fetchAllNotifications = async () => {
    setLoading(true);

    try {
      // Fetch from both sources
      const [appNotifications, fbNotifications] = await Promise.all([
        fetchNotificationsForAppId(),
        fetchNotificationsForFirebaseId(),
      ]);

      // Merge notifications, handling duplicates
      const notificationMap = new Map();

      // Process all notifications
      [...appNotifications, ...fbNotifications].forEach((notification) => {
        notificationMap.set(notification.id, notification);
      });

      // Convert map to array and sort by date
      const mergedNotifications = Array.from(notificationMap.values()).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setNotifications(mergedNotifications);

      // Fetch sender names
      mergedNotifications.forEach((notification) => {
        if (notification.senderId) {
          fetchSenderUsername(notification.senderId);
        }
      });
    } catch (error) {
      console.error("Error fetching all notifications:", error);
      setErrorMessage("Couldn't load notifications");
    } finally {
      setLoading(false);
    }
  };

  // Fetch sender username
  const fetchSenderUsername = async (senderId) => {
    // Prevent duplicate fetches
    if (
      !senderId ||
      fetchedUserIds.current.has(senderId) ||
      usernames[senderId]
    )
      return;

    // Mark as being fetched
    fetchedUserIds.current.add(senderId);

    try {
      const response = await ApiHandler.get(`/UserDetails/userId/${senderId}`);
      if (response) {
        const { firstName, lastName } = response;
        setUsernames((prev) => ({
          ...prev,
          [senderId]: `${firstName} ${lastName}`,
        }));
      }
    } catch (error) {
      // Add fallback name when API fails
      setUsernames((prev) => ({
        ...prev,
        [senderId]: `User ${senderId.substring(0, 4)}`,
      }));
    }
  };

  // Listen for notifications from Firebase for both IDs
  useEffect(() => {
    if (!currentUserId && !firebaseUserId) {
      return () => {};
    }

    let unsubscribeFuncs = [];

    const setupListener = async () => {
      try {
        // Initial fetch of all notifications
        await fetchAllNotifications();

        // Set up listeners for both IDs
        if (firebaseUserId) {
          try {
            const unsubscribeFb = listenForUserNotifications(
              () => fetchAllNotifications(),
              firebaseUserId
            );
            unsubscribeFuncs.push(unsubscribeFb);
          } catch (error) {
            console.error("Error setting up Firebase ID listener:", error);
          }
        }

        if (currentUserId) {
          try {
            const unsubscribeApp = listenForUserNotifications(
              () => fetchAllNotifications(),
              currentUserId.toString()
            );
            unsubscribeFuncs.push(unsubscribeApp);
          } catch (error) {
            console.error("Error setting up App ID listener:", error);
          }
        }
      } catch (error) {
        console.error("Error setting up notification listeners:", error);
        setErrorMessage("Failed to set up notification listeners");
        setLoading(false);
      }
    };

    setupListener();

    // Clean up listeners when component unmounts
    return () => {
      unsubscribeFuncs.forEach((unsubscribe) => {
        try {
          if (typeof unsubscribe === "function") {
            unsubscribe();
          }
        } catch (error) {
          console.error("Error unsubscribing from notifications:", error);
        }
      });
    };
  }, [currentUserId, firebaseUserId]);

  // Get notification type icon and color
  const getNotificationTypeInfo = (notification) => {
    if (!notification.data || !notification.data.action) {
      return {
        icon: <FiBell size={14} />,
        color: "bg-gray-400",
        textColor: "text-gray-400",
        lightBg: "bg-gray-50",
        text: "Notification",
      };
    }

    switch (notification.data.action) {
      case "view_agreement":
        return {
          icon: <FiFile size={14} />,
          color: "bg-emerald-500",
          textColor: "text-emerald-500",
          lightBg: "bg-emerald-50",
          text: "Agreement",
        };
      case "booking_request":
        return {
          icon: <FiCalendar size={14} />,
          color: "bg-blue-500",
          textColor: "text-blue-500",
          lightBg: "bg-blue-50",
          text: "Booking",
        };
      case "property_update":
        return {
          icon: <FiHome size={14} />,
          color: "bg-purple-500",
          textColor: "text-purple-500",
          lightBg: "bg-purple-50",
          text: "Property",
        };
      case "payment_received":
        return {
          icon: <FiDollarSign size={14} />,
          color: "bg-amber-500",
          textColor: "text-amber-500",
          lightBg: "bg-amber-50",
          text: "Payment",
        };
      case "view_chat":
        return {
          icon: <FiMessageCircle size={14} />,
          color: "bg-indigo-500",
          textColor: "text-indigo-500",
          lightBg: "bg-indigo-50",
          text: "Message",
        };
      case "system_update":
        return {
          icon: <FiInfo size={14} />,
          color: "bg-sky-500",
          textColor: "text-sky-500",
          lightBg: "bg-sky-50",
          text: "System",
        };
      case "package_delivery":
        return {
          icon: <FiPackage size={14} />,
          color: "bg-rose-500",
          textColor: "text-rose-500",
          lightBg: "bg-rose-50",
          text: "Delivery",
        };
      default:
        return {
          icon: <FiBell size={14} />,
          color: "bg-gray-500",
          textColor: "text-gray-500",
          lightBg: "bg-gray-50",
          text: notification.data.action || "Notification",
        };
    }
  };

  // Format relative time
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

  // Handle notification click
  const handleNotificationPress = (notification) => {
    // Update UI immediately
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );

    // Mark as read in database
    markNotificationAsRead(notification.id).catch((error) => {
      console.error("Error marking notification as read:", error);
    });

    // Handle navigation based on notification type
    if (notification.data) {
      const navigate = navigateFunction || (() => {});

      switch (notification.data.action) {
        case "view_agreement":
          navigate(`/landlord/booking/${notification.data.agreementId}`);
          break;
        case "booking_request":
          navigate(`/landlord/booking/${notification.data.bookingId}`);
          break;
        case "property_update":
          navigate(`/landlord/property/${notification.data.propertyId}`);
          break;
        case "payment_received":
          navigate(`/landlord/payment/${notification.data.paymentId}`);
          break;
        case "view_chat":
          navigate(`/landlord/chat/${notification.data.chatId}`);
          break;
        default:
          if (notification.data.route) {
            navigate(notification.data.route);
          }
      }
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
      {/* Header with unread count */}
      {unreadCount > 0 && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 mb-2 rounded-md">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center">
            <FiBell size={14} className="mr-2 animate-pulse" />
            {unreadCount} new notification{unreadCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md mb-3">
          <p className="flex items-center">
            <FiInfo size={14} className="mr-2" /> {errorMessage}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-10 h-10 relative">
            <div className="w-10 h-10 rounded-full border-3 border-blue-100 dark:border-blue-900/30"></div>
            <div className="w-10 h-10 rounded-full border-t-3 border-blue-500 animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm">
            Loading notifications...
          </p>
        </div>
      ) : (
        <>
          {/* Notifications List */}
          {notifications.length > 0 ? (
            <div className="max-h-[40vh] overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {notifications.map((notification) => {
                const { icon, color, textColor, lightBg, text } =
                  getNotificationTypeInfo(notification);

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationPress(notification)}
                    className={`p-3 rounded-md border ${
                      notification.read
                        ? "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"
                        : `${lightBg} dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 hover:border-blue-200 dark:hover:border-blue-700`
                    } hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer relative group`}
                  >
                    {/* Side color indicator */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${color} rounded-tl-md rounded-bl-md`}
                    ></div>

                    <div className="pl-2">
                      {/* Header with title and time */}
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`rounded-full p-1 ${lightBg} dark:bg-opacity-20`}
                          >
                            <span className={`${textColor}`}>{icon}</span>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-white line-clamp-1">
                            {notification.title}
                          </h3>
                        </div>

                        <div className="flex items-center space-x-1">
                          {!notification.read && (
                            <FiCircle size={6} className="text-blue-500" />
                          )}
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                            <FiClock size={10} className="mr-1" />
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Body */}
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 ml-8">
                        {notification.body}
                      </p>

                      {/* Footer */}
                      <div className="flex justify-between items-center mt-2 ml-8">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${lightBg} dark:bg-opacity-20 ${textColor} font-medium`}
                        >
                          {text}
                        </span>

                        {notification.senderId &&
                          usernames[notification.senderId] && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {/* From: {usernames[notification.senderId]} */}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <FiBell
                size={24}
                className="mb-3 text-gray-300 dark:text-gray-600"
              />
              <p className="text-gray-600 dark:text-gray-300">
                No notifications yet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                You'll see your notifications here when they arrive
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationPage;
