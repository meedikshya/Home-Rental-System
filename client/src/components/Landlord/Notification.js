import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import { FIREBASE_DB } from "../../services/Firebase-config.js";
import { getFirebaseIdFromUserId } from "../../context/AuthContext.js";
import ApiHandler from "../../api/ApiHandler.js";
import { markNotificationAsRead } from "../../services/Firebase-notification.js";
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
  FiCheck,
  FiRefreshCw,
} from "react-icons/fi";

const usernameCache = {};

const NotificationPage = ({
  userId,
  navigateFunction,
  existingUnreadCount,

  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [showContent, setShowContent] = useState(false);

  // Cache key based on user ID
  const cacheKey = useMemo(
    () => `notifications_${userId || "guest"}`,
    [userId]
  );

  const fetchedUserIds = useRef(new Set());
  const loadingTimeoutRef = useRef(null);
  const cachedNotifications = useRef(null);

  const unreadCount = useMemo(() => {
    if (Array.isArray(notifications) && notifications.length > 0) {
      const count = notifications.filter(
        (notification) => notification && !notification.read
      ).length;

      if (onUnreadCountChange && typeof onUnreadCountChange === "function") {
        setTimeout(() => {
          onUnreadCountChange(count);
        }, 0);
      }

      return count;
    }

    return existingUnreadCount || 0;
  }, [notifications, existingUnreadCount, onUnreadCountChange]);

  const fetchUserName = useCallback(async (userId) => {
    if (!userId) return;

    if (usernameCache[userId]) {
      setUsernames((prev) => ({
        ...prev,
        [userId]: usernameCache[userId],
      }));
      return;
    }

    try {
      const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
      if (response) {
        const { firstName, lastName } = response;
        const fullName = `${firstName} ${lastName}`;

        setUsernames((prev) => ({
          ...prev,
          [userId]: fullName,
        }));

        usernameCache[userId] = fullName;

        try {
          const cachedUsernames =
            localStorage.getItem("notification_usernames") || "{}";
          const parsed = JSON.parse(cachedUsernames);
          parsed[userId] = fullName;
          localStorage.setItem(
            "notification_usernames",
            JSON.stringify(parsed)
          );
        } catch (e) {
          console.error("Error updating username cache", e);
        }
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
      const fallbackName = `User ${userId.substring(0, 4)}`;
      setUsernames((prev) => ({
        ...prev,
        [userId]: fallbackName,
      }));
      usernameCache[userId] = fallbackName;
    }
  }, []);

  const fetchSenderUsername = useCallback(
    (senderId) => {
      if (
        !senderId ||
        fetchedUserIds.current.has(senderId) ||
        usernames[senderId]
      )
        return;

      fetchedUserIds.current.add(senderId);
      fetchUserName(senderId);
    },
    [usernames, fetchUserName]
  );

  const handleNavigation = useCallback(
    (notification) => {
      if (!notification.data) return;

      const navigate = navigateFunction || (() => {});

      switch (notification.data.action) {
        case "view_agreement":
          navigate(`/landlord/agreements`);
          break;
        case "booking_request":
          navigate(`/landlord/booking/${notification.data.bookingId}`);
          break;
        case "property_update":
          navigate(`/landlord/property/${notification.data.propertyId}`);
          break;
        case "view_payment_receipt":
        case "view_payment":
        case "payment_received":
          console.log("Navigating to payment page");
          navigate(`/landlord/payment`);
          break;
        case "view_chat":
          navigate(`/landlord/chat/${notification.data.chatId}`);
          break;
        default:
          if (notification.data.route) {
            navigate(notification.data.route);
          }
      }
    },
    [navigateFunction]
  );

  useEffect(() => {
    setShowContent(false);
    setLoading(true);

    const cachedHtml = localStorage.getItem(`notifications_html_${userId}`);
    const cachedTimestamp = localStorage.getItem(
      `notifications_html_timestamp_${userId}`
    );
    const currentTime = Date.now();

    if (
      cachedHtml &&
      cachedTimestamp &&
      currentTime - parseInt(cachedTimestamp) < 30 * 60 * 1000
    ) {
      document
        .getElementById("notifications-container")
        ?.setAttribute("data-cached", "true");

      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const { data } = JSON.parse(cachedData);
          if (Array.isArray(data)) {
            setNotifications(data);
            cachedNotifications.current = data;

            setLoading(false);
            setTimeout(() => setShowContent(true), 10);
            return;
          }
        }
      } catch (e) {
        console.error("Error loading from cache", e);
      }
    }

    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        if (timestamp && currentTime - timestamp < 15 * 60 * 1000) {
          setNotifications(data);

          loadingTimeoutRef.current = setTimeout(() => {
            setLoading(false);
            setShowContent(true);
          }, 100);
          return;
        }
      }
    } catch (e) {
      console.error("Error loading from cache", e);
    }
  }, [cacheKey, userId]);

  useEffect(() => {
    if (showContent && !refreshing) return;

    const fetchNotifications = async () => {
      try {
        const firebaseId = await getFirebaseIdFromUserId(userId);
        if (!firebaseId && !userId) {
          setLoading(false);
          setShowContent(true);
          return;
        }

        const receiverIds = [];
        if (firebaseId) {
          receiverIds.push(firebaseId);
          localStorage.setItem(`firebase_id_${userId}`, firebaseId);
        }

        if (userId) {
          receiverIds.push(userId.toString());
          if (!isNaN(userId)) {
            receiverIds.push(Number(userId));
          }
        }

        const notificationsQuery = query(
          collection(FIREBASE_DB, "notifications"),
          where("receiverId", "in", receiverIds),
          orderBy("createdAt", "desc"),
          limit(100)
        );

        // Fetch all notifications at once
        const snapshot = await getDocs(notificationsQuery);

        // Process all docs at once
        const allNotifications = [];
        const processedIds = new Set();

        snapshot.docs.forEach((doc) => {
          const id = doc.id;

          if (processedIds.has(id)) return;
          processedIds.add(id);

          const data = doc.data();
          const notification = {
            id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          };

          // Check if sender ID is present, fetch username
          if (notification.senderId) {
            fetchSenderUsername(notification.senderId);
          }

          allNotifications.push(notification);
        });

        // Sort all notifications
        allNotifications.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        // Update state with all notifications at once
        setNotifications(allNotifications);

        // Update cache with data
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: allNotifications,
              timestamp: Date.now(),
            })
          );
        } catch (e) {
          console.error("Error caching notifications", e);
        }

        setTimeout(() => {
          setLoading(false);
          setRefreshing(false);
          setShowContent(true);

          setTimeout(() => {
            const container = document.getElementById("notifications-list");
            if (container) {
              try {
                localStorage.setItem(
                  `notifications_html_${userId}`,
                  container.innerHTML
                );
                localStorage.setItem(
                  `notifications_html_timestamp_${userId}`,
                  Date.now().toString()
                );
              } catch (e) {
                console.error("Error caching notification HTML", e);
              }
            }
          }, 500);
        }, 100);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setErrorMessage("Failed to load notifications");
        setLoading(false);
        setRefreshing(false);
        setShowContent(true);
      }
    };

    fetchNotifications();

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [cacheKey, userId, refreshing, showContent, fetchSenderUsername]);

  // Handle refresh - force fetch new notifications
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setErrorMessage(null);
    setShowContent(false);

    // Clear the caches to force a fresh load
    try {
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`notifications_html_${userId}`);
      localStorage.removeItem(`notifications_html_timestamp_${userId}`);
    } catch (e) {
      console.error("Error clearing notification cache", e);
    }

    // Safety timeout
    setTimeout(() => {
      if (refreshing) {
        setRefreshing(false);
        setShowContent(true);
      }
    }, 10000); // 10 seconds max
  }, [cacheKey, refreshing, userId]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    if (!notifications.length) return;

    const unreadNotifications = notifications.filter((n) => !n.read);
    if (!unreadNotifications.length) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const updatedNotifications = parsed.data.map((n) => ({
          ...n,
          read: true,
        }));

        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: updatedNotifications,
            timestamp: Date.now(),
          })
        );

        setTimeout(() => {
          const container = document.getElementById("notifications-list");
          if (container) {
            try {
              localStorage.setItem(
                `notifications_html_${userId}`,
                container.innerHTML
              );
              localStorage.setItem(
                `notifications_html_timestamp_${userId}`,
                Date.now().toString()
              );
            } catch (e) {
              console.error("Error updating notification HTML cache", e);
            }
          }
        }, 100);
      }
    } catch (e) {
      console.error("Error updating notification cache", e);
    }

    Promise.all(
      unreadNotifications.map((n) => markNotificationAsRead(n.id))
    ).catch((error) => {
      console.error("Error marking all notifications as read:", error);
    });
  }, [notifications, cacheKey, userId]);

  const handleNotificationPress = useCallback(
    (notification) => {
      if (notification.read) {
        handleNavigation(notification);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );

      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          const updatedNotifications = parsed.data.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n
          );

          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: updatedNotifications,
              timestamp: Date.now(),
            })
          );
        }
      } catch (e) {
        console.error("Error updating notification cache", e);
      }

      markNotificationAsRead(notification.id).catch((error) => {
        console.error("Error marking notification as read:", error);

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: false } : n
          )
        );
      });

      handleNavigation(notification);
    },
    [cacheKey, handleNavigation]
  );

  const getNotificationTypeInfo = useCallback((notification) => {
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
      case "view_payment_receipt":
      case "view_payment":
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
  }, []);

  const formatTimeAgo = useCallback((timestamp) => {
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
  }, []);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm transition-all duration-300">
      {/* Header with unread count and mark all as read button */}
      {unreadCount > 0 && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 mb-2 rounded-md flex items-center justify-between">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center">
            <FiBell size={14} className="mr-2 animate-pulse" />
            {unreadCount} new notification{unreadCount !== 1 ? "s" : ""}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              markAllAsRead();
            }}
            className="text-xs flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
          >
            <FiCheck size={12} className="mr-1" /> Mark all read
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md mb-3 flex items-center justify-between">
          <p className="flex items-center text-sm">
            <FiInfo size={14} className="mr-2" /> {errorMessage}
          </p>
          <button
            onClick={handleRefresh}
            className="text-red-700 dark:text-red-300 underline text-sm flex items-center hover:text-red-800 transition-colors"
          >
            <FiRefreshCw
              size={12}
              className={`mr-1 ${refreshing ? "animate-spin" : ""}`}
            />{" "}
            Retry
          </button>
        </div>
      )}

      {/* Content with fixed height container */}
      <div
        id="notifications-container"
        className="overflow-hidden transition-all duration-300 relative"
        style={{ height: "250px" }}
      >
        {loading ? (
          <div className="animate-pulse space-y-3 p-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex p-3 border border-gray-100 dark:border-gray-700 rounded-md"
              >
                <div className="h-10 w-1 bg-gray-200 dark:bg-gray-700 rounded-full mr-2"></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Refreshing indicator */}
            {refreshing && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/10 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-center">
                <div className="animate-spin mr-2 h-3 w-3 border-t-2 border-blue-500 rounded-full"></div>
                Refreshing...
              </div>
            )}

            {/* Notifications List */}
            {notifications.length > 0 ? (
              <div
                className="h-full overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent transition-all duration-300 relative"
                style={{ willChange: "contents", contain: "content" }}
              >
                {/* This wrapper controls visibility */}
                <div
                  id="notifications-list"
                  className={`space-y-2 transition-opacity duration-300 ease-in-out ${
                    showContent ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {notifications.map((notification) => {
                    const { icon, color, textColor, lightBg, text } =
                      getNotificationTypeInfo(notification);

                    return (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationPress(notification)}
                        className={`p-3 rounded-md border transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer relative group ${
                          notification.read
                            ? "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm"
                            : `${lightBg} dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md`
                        }`}
                      >
                        {/* Side color indicator */}
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 ${color} rounded-tl-md rounded-bl-md transition-all duration-300`}
                        ></div>

                        <div className="pl-2">
                          {/* Header with title and time */}
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`rounded-full p-1 ${lightBg} dark:bg-opacity-20 transition-colors`}
                              >
                                <span className={`${textColor}`}>{icon}</span>
                              </div>
                              <h3 className="text-sm font-semibold text-gray-800 dark:text-white line-clamp-1">
                                {notification.title}
                              </h3>
                            </div>

                            <div className="flex items-center space-x-1">
                              {!notification.read && (
                                <FiCircle
                                  size={6}
                                  className="text-blue-500 mr-1"
                                />
                              )}
                              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center whitespace-nowrap">
                                <FiClock size={10} className="mr-1" />
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Body */}
                          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 ml-8 transition-colors">
                            {notification.body}
                          </p>

                          {/* Footer */}
                          <div className="flex justify-between items-center mt-2 ml-8">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${lightBg} dark:bg-opacity-20 ${textColor} font-medium transition-colors`}
                            >
                              {text}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Loading overlay - shown when content is being prepared */}
                {!showContent && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 z-10">
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto mb-3 border-4 border-t-blue-500 border-blue-100 dark:border-blue-900 rounded-full animate-spin"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Loading notifications...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Empty state
              <div className="flex flex-col items-center justify-center h-full px-4 text-center transition-all duration-300">
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
                {/* Refresh button for empty state */}
                <button
                  onClick={handleRefresh}
                  className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center transition-colors"
                >
                  <FiRefreshCw
                    className={`mr-1 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationPage;
