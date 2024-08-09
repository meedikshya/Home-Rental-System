// src/pages/AdminPanel.js
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaUserCircle } from "react-icons/fa";
import { useSessionTimeout } from "../../hooks/userSessionTimeout.js";
import useUser from "../../hooks/useUser.js";

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, logout } = useUser(); // Use useUser hook
  const [loading, setLoading] = React.useState(true);

  const handleSessionTimeout = () => {
    logout(); // Use logout from useUser
    toast.info("Session timed out. Please log in again.");
    navigate("/login");
  };

  useSessionTimeout(handleSessionTimeout, 1800000); // 30 minutes

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      setLoading(false);
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        logout(); // Use logout from useUser
        toast.success("Logout successful!");
        navigate("/");
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout Error:", error.message);
      toast.error(`Logout error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-8 text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FaUserCircle className="text-4xl text-gray-600" />
            {user && user.email ? (
              <p className="ml-4 text-lg font-semibold">{user.email}</p>
            ) : (
              <p className="ml-4 text-lg font-semibold">No user logged in</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Logout
          </button>
        </div>
        <div className="mt-8 text-center">
          <h1 className="text-2xl font-bold">Welcome to the Admin Page!</h1>
          <p className="mt-4 text-gray-600">You are successfully logged in.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
