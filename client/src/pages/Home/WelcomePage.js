import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaUserCircle } from "react-icons/fa";
import { signOut } from "firebase/auth";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import ApiHandler from "../../api/ApiHandler.js";

const WelcomePage = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
    setLoading(false);
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      await signOut(FIREBASE_AUTH);
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("user"); // Ensure user data is also cleared
      ApiHandler.setAuthToken(null);
      toast.success("User logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed: ", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-semibold animate-pulse">
        Loading...
      </div>
    );
  }

  const storedUser = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col text-white p-6">
      <div className="flex justify-end p-4">
        <button
          onClick={handleLogout}
          className="py-2 px-5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
        >
          Logout
        </button>
      </div>
      <div className="flex flex-col items-center justify-center flex-grow">
        <div className="flex items-center space-x-4 mb-6">
          <FaUserCircle className="text-5xl text-gray-300" />
          <p className="text-xl font-semibold">
            {storedUser && storedUser.email
              ? storedUser.email
              : "No user logged in"}
          </p>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to the Home Page! 🎉</h1>
          <p className="mt-4 text-lg text-gray-200">
            You are successfully logged in.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
