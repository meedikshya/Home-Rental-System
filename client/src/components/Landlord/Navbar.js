import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { markNotificationAsRead } from "../../services/Firebase-notification.js";
import NotificationPage from "./Notification.js"; // Import the NotificationPage component

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] =
    useState(false);
  const [userEmail, setUserEmail] = useState("Guest");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const navigate = useNavigate();

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
      try {
        const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
        if (response) {
          const { firstName, lastName } = response;
          setUserName(`${firstName} ${lastName}`);
          console.log("User name:", `${firstName} ${lastName}`);
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }
    };

    fetchUserName();
  }, [userId]);

  // Handle notification click
  const handleNotificationClick = (notification) => {
    try {
      // Mark notification as read if it's unread
      if (!notification.read) {
        markNotificationAsRead(notification.id);
      }

      // Close dropdown
      setNotificationDropdownOpen(false);

      // Navigate to specific route if available in notification data
      if (notification.data && notification.data.route) {
        navigate(notification.data.route);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  // Fetch notifications from Firebase
  useEffect(() => {
    if (!userId) return;

    try {
      console.log(
        "Setting up notification listener in Navbar for userId:",
        userId
      );

      // Create query for notifications where user is the receiver
      const notificationsQuery = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "==", userId),
        orderBy("createdAt", "desc") // Add ordering by createdAt
      );

      // Set up listener
      const unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notificationList = [];
          let unread = 0;

          snapshot.forEach((doc) => {
            const notification = {
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            };

            notificationList.push(notification);

            // Count unread notifications
            if (!notification.read) {
              unread++;
            }
          });

          setNotifications(notificationList);
          setUnreadCount(unread);
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

  // Format date
  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString();
  };

  // Show modal instead of navigating
  const openNotificationModal = () => {
    console.log("Opening notification modal, userId:", userId);
    setNotificationDropdownOpen(false);
    setShowNotificationModal(true);
  };

  // Close notification modal
  const closeNotificationModal = () => {
    console.log("Closing notification modal");
    setShowNotificationModal(false);
  };

  return (
    <>
      <nav className="bg-white border-gray-200 px-4 py-3 rounded-lg shadow-md dark:bg-gray-800">
        <div className="container flex justify-between items-center mx-auto">
          {/* Welcome Text */}
          <span className="text-xl font-medium dark:text-white">
            Welcome, {userName}
          </span>

          <div className="flex items-center space-x-3">
            {/* Notification Icon */}
            <div className="relative">
              <button
                onClick={() => {
                  // Open the modal directly instead of toggling dropdown
                  openNotificationModal();
                  setDropdownOpen(false); // Close profile dropdown
                }}
                className="flex items-center justify-center z-50 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                aria-haspopup="true"
              >
                <FiBell className="text-xl dark:text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setDropdownOpen((prev) => !prev);
                  setNotificationDropdownOpen(false); // Close notification dropdown when opening profile
                }}
                className="flex items-center z-50 space-x-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <CgProfile className="text-2xl dark:text-white" />
                <span className="hidden sm:block dark:text-white">Profile</span>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 z-50 mt-2 w-48 bg-white dark:bg-gray-700 shadow-lg rounded-lg overflow-hidden"
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

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={closeNotificationModal}
          ></div>

          {/* Modal Content */}
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-4xl rounded-lg shadow-xl">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  All Notifications
                </h2>
                <button
                  onClick={closeNotificationModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <FiX className="text-gray-500 dark:text-gray-400 text-xl" />
                </button>
              </div>

              <div className="max-h-[80vh] overflow-y-auto">
                {console.log("Rendering modal with userId:", userId)}
                {userId ? (
                  <NotificationPage userId={userId} />
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">Loading user data...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
