import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { CgProfile } from "react-icons/cg";
import { FiSettings, FiLogOut, FiBell, FiX } from "react-icons/fi";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../services/Firebase-config.js";
import ApiHandler from "../../api/ApiHandler.js";
import { getUserDataFromFirebase } from "../../context/AuthContext.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import NotificationPage from "./Notification.js";

// Create notification context to share the unread count state
const NotificationContext = createContext();

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("Guest");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] =
    useState(false);
  const [notificationKey, setNotificationKey] = useState(Date.now());
  const [notificationLoading, setNotificationLoading] = useState(true);
  const notificationRef = useRef(null);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close notifications on route change
  useEffect(() => {
    setShowNotificationDropdown(false);
  }, [location.pathname]);

  // Close notifications on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      FIREBASE_AUTH,
      async (currentUser) => {
        if (currentUser) {
          const storedUser = JSON.parse(localStorage.getItem("user"));
          if (storedUser?.email) {
            setUserEmail(storedUser.email);
          }

          const userId = await getUserDataFromFirebase();
          if (userId) {
            setUserId(userId);
          }
        } else {
          setUserEmail("Guest");
          setUserName("");
          setUserId(null);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch user name from API
  useEffect(() => {
    const fetchUserName = async () => {
      if (!userId) return;

      // Check if name is already cached
      const cachedName = localStorage.getItem(`username_${userId}`);
      if (cachedName) {
        setUserName(cachedName);
        return;
      }

      try {
        const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
        if (response) {
          const { firstName, lastName } = response;
          const fullName = `${firstName} ${lastName}`;
          setUserName(fullName);

          // Cache the name
          localStorage.setItem(`username_${userId}`, fullName);
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }
    };

    fetchUserName();
  }, [userId]);

  // Fetch notifications from Firebase to get unread count
  // Fetch notifications from Firebase to get unread count
  useEffect(() => {
    if (!userId) return;

    try {
      const notificationsQuery = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "in", [userId.toString(), userId]),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          let unread = 0;
          let hasNewNotifications = false;

          snapshot.docChanges().forEach((change) => {
            // Check if this is a new notification
            if (change.type === "added") {
              const notification = change.doc.data();
              const createTime =
                notification.createdAt?.toDate?.() || new Date();

              // Consider it "new" if created in the last minute
              if (Date.now() - createTime < 60000 && !notification.read) {
                hasNewNotifications = true;
              }
            }
          });

          // Count all unread notifications
          snapshot.forEach((doc) => {
            const notification = doc.data();
            if (!notification.read) {
              unread++;
            }
          });

          // Update the count
          setUnreadCount(unread);

          // Show a toast for new notifications (optional)
          if (hasNewNotifications && !showNotificationDropdown) {
            toast.info("You have new notifications");
          }
        },
        (error) => {
          console.error("Error fetching notifications:", error);
        }
      );

      return () => {
        try {
          if (typeof unsubscribe === "function") {
            unsubscribe();
          }
        } catch (error) {
          console.error("Error unsubscribing from notifications:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up notification listener:", error);
      return () => {};
    }
  }, [userId, showNotificationDropdown]);

  // Standalone lightweight notification counter - ALWAYS active
  useEffect(() => {
    if (!userId) return;

    try {
      // Create a separate listener just for counting, optimized for performance
      const countQuery = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "in", [userId.toString(), userId]),
        where("read", "==", false) // Only get unread notifications for better performance
      );

      const unsubscribeCounter = onSnapshot(
        countQuery,
        (snapshot) => {
          // Simply count the documents
          const count = snapshot.size;

          // Update the count - this will run even when notification panel is closed
          setUnreadCount(count);

          // Additionally check for brand new notifications to show a toast
          const newNotifications = [];
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              const timestamp = data.createdAt?.toDate() || new Date();
              // If notification is less than 10 seconds old, consider it new
              if (Date.now() - timestamp < 10000) {
                newNotifications.push(data);
              }
            }
          });

          // Show toast for new notifications (when dropdown is closed)
          if (newNotifications.length > 0 && !showNotificationDropdown) {
            if (newNotifications.length === 1) {
              toast.info(
                newNotifications[0].title || "New notification received"
              );
            } else {
              toast.info(
                `${newNotifications.length} new notifications received`
              );
            }
          }
        },
        (error) => {
          console.error("Error in notification counter:", error);
        }
      );

      return () => {
        try {
          if (typeof unsubscribeCounter === "function") {
            unsubscribeCounter();
          }
        } catch (error) {
          console.error(
            "Error unsubscribing from notification counter:",
            error
          );
        }
      };
    } catch (error) {
      console.error("Error setting up notification counter:", error);
      return () => {};
    }
  }, [userId]);

  const handleLogout = async () => {
    try {
      await signOut(FIREBASE_AUTH);
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("user");
      ApiHandler.setAuthToken(null);
      toast.success("User logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed: ", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  // Toggle notification dropdown with improved loading
  const toggleNotifications = () => {
    setDropdownOpen(false); // Close profile dropdown if open

    if (!showNotificationDropdown) {
      // When opening, first show loading state
      setNotificationLoading(true);
      setShowNotificationDropdown(true);

      // Clear any existing timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Set a delay before showing content
      timeoutRef.current = setTimeout(() => {
        setNotificationKey(Date.now());
        setNotificationLoading(false);
      }, 300); // Longer delay helps prevent flickering
    } else {
      // Just close it when already open
      setShowNotificationDropdown(false);

      // Clear timeout if dropdown is closed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Close notification dropdown
  const closeNotifications = () => {
    setShowNotificationDropdown(false);

    // Clear timeout if dropdown is closed
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      <nav className="bg-white border-gray-200 px-4 py-3 rounded-lg shadow-md dark:bg-gray-800">
        <div className="container flex justify-between items-center mx-auto">
          {/* Welcome Text */}
          <span className="text-xl font-medium dark:text-white">
            Welcome, {userName || "User"}
          </span>

          <div className="flex items-center space-x-3">
            {/* Notification Icon & Dropdown */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={toggleNotifications}
                className="relative flex items-center justify-center z-10 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                aria-haspopup="true"
              >
                <FiBell
                  className={`text-xl ${
                    unreadCount > 0 ? "text-[#20319D]" : "text-gray-700"
                  } dark:text-white`}
                />

                {/* Simple notification badge without animation */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center bg-red-500 text-white text-xs font-semibold min-w-5 h-5 px-1.5 rounded-full shadow-sm">
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount > 9
                      ? "9+"
                      : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotificationDropdown && (
                <div
                  className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden z-20"
                  style={{ minHeight: "300px" }}
                >
                  {/* Dropdown Triangle */}
                  <div className="absolute -top-2 right-4 w-4 h-4 bg-white dark:bg-gray-800 transform rotate-45"></div>

                  {/* Header */}
                  <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                      Notifications
                    </h3>
                    <button
                      onClick={closeNotifications}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FiX className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Body with fixed height to prevent layout shifts */}
                  <div style={{ height: "250px" }} className="overflow-y-auto">
                    {notificationLoading ? (
                      <div className="p-4 space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="flex p-3 border border-gray-100 dark:border-gray-700 rounded-md animate-pulse"
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
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : userId ? (
                      <div
                        key={notificationKey}
                        className="transition-opacity duration-300"
                      >
                        <NotificationPageWrapper
                          userId={userId}
                          onCloseModal={closeNotifications}
                        />
                      </div>
                    ) : (
                      <div className="p-4 h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-10 h-10 mx-auto mb-3 rounded-full border-4 border-t-blue-500 border-gray-200 animate-spin"></div>
                          <p className="text-gray-500">
                            Loading notifications...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center z-10 space-x-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <CgProfile className="text-2xl dark:text-white" />
                <span className="hidden sm:block dark:text-white">Profile</span>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 z-20 mt-2 w-48 bg-white dark:bg-gray-700 shadow-lg rounded-lg overflow-hidden"
                  role="menu"
                >
                  <Link
                    to="/settings"
                    className="flex items-center gap-x-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                  >
                    <FiSettings className="text-xl dark:text-white" />
                    <span className="dark:text-white">Settings</span>
                  </Link>

                  <Link
                    to="/profile"
                    className="flex items-center gap-x-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                  >
                    <CgProfile className="text-xl dark:text-white" />
                    <span className="dark:text-white">Profile</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-x-2 px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                  >
                    <FiLogOut className="text-xl" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </NotificationContext.Provider>
  );
};

const NotificationPageWrapper = ({ userId, onCloseModal }) => {
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);

  const { setUnreadCount, unreadCount } = useContext(NotificationContext);

  // Make it ready faster
  useEffect(() => {
    // No delay needed, render immediately
    setIsReady(true);
    return () => {};
  }, []);

  const handleNavigation = (path) => {
    console.log("Custom navigation to:", path);
    onCloseModal();
    setTimeout(() => {
      navigate(path);
    }, 100);
  };

  if (!isReady) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <NotificationPage
      userId={userId}
      navigateFunction={handleNavigation}
      existingUnreadCount={unreadCount}
      onUnreadCountChange={(count) => {
        // Update immediately without checking - duplicate updates won't hurt
        console.log("Updating unread count:", count);
        setUnreadCount(count);
      }}
    />
  );
};

export default Navbar;
