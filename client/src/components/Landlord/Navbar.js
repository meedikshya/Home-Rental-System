import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { CgProfile } from "react-icons/cg";
import { FiSettings, FiLogOut } from "react-icons/fi";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import ApiHandler from "../../api/ApiHandler.js";
import { getUserDataFromFirebase } from "../../context/AuthContext.js"; // Import the function

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("Guest");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
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

  return (
    <nav className="bg-white border-gray-200 px-4 py-3 rounded-lg shadow-md dark:bg-gray-800">
      <div className="container flex justify-between items-center mx-auto">
        {/* Welcome Text */}
        <span className="text-xl font-medium dark:text-white">
          Welcome, {userName}
        </span>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
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
    </nav>
  );
};

export default Navbar;
