import React, { useState, useEffect, useRef } from "react";
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

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("Guest");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] =
    useState(false);
  const notificationRef = useRef(null);
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
      try {
        const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
        if (response) {
          const { firstName, lastName } = response;
          setUserName(`${firstName} ${lastName}`);
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }
    };

    fetchUserName();
  }, [userId]);

  // Fetch notifications from Firebase to get unread count
  useEffect(() => {
    if (!userId) return;

    try {
      const notificationsQuery = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "==", userId.toString()),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          let unread = 0;

          snapshot.forEach((doc) => {
            const notification = {
              id: doc.id,
              ...doc.data(),
            };

            if (!notification.read) {
              unread++;
            }
          });

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

  // Toggle notification dropdown
  const toggleNotifications = () => {
    setDropdownOpen(false); // Close profile dropdown if open
    setShowNotificationDropdown(!showNotificationDropdown);
  };

  // Close notification dropdown
  const closeNotifications = () => {
    setShowNotificationDropdown(false);
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
            {/* Notification Icon & Dropdown */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={toggleNotifications}
                className="flex items-center justify-center z-10 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                aria-haspopup="true"
              >
                <FiBell className="text-xl dark:text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden z-20">
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

                  {/* Body */}
                  <div className="max-h-[400px] overflow-y-auto">
                    {userId ? (
                      <NotificationPageWrapper
                        userId={userId}
                        onCloseModal={closeNotifications}
                      />
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        Loading notifications...
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
    </>
  );
};
// Wrapper component that adds auto-close functionality to NotificationPage
const NotificationPageWrapper = ({ userId, onCloseModal }) => {
  const navigate = useNavigate();

  // Create custom navigation function that closes the modal before navigating
  const handleNavigation = (path) => {
    console.log("Custom navigation to:", path);
    // First close the modal
    onCloseModal();

    // Then navigate
    setTimeout(() => {
      navigate(path);
    }, 100);
  };

  return (
    <NotificationPage
      userId={userId}
      navigateFunction={handleNavigation}
      onUnreadCountChange={(count) => {
        // This will be called whenever the unread count changes in the NotificationPage component
        console.log("Unread notifications count:", count);
        // If you want to update a state in the parent component, you can do it here
        // For example: setUnreadCount(count);
      }}
    />
  );
};

export default Navbar;
