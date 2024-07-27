import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaUserCircle } from "react-icons/fa";

const WelcomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user information from session storage
    const storedUserEmail = sessionStorage.getItem("userEmail");
    if (storedUserEmail) {
      setUser({ email: storedUserEmail });
    } else {
      navigate("/login");
    }
    setLoading(false);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      // Make request to logout endpoint
      const response = await fetch("http://localhost:3000/api/logout", {
        method: "POST",
        credentials: "include", // Include cookies in the request
      });

      if (response.ok) {
        // Clear session storage
        sessionStorage.removeItem("userEmail");

        // Show success message
        toast.success("Logout successful!");

        // Navigate to login page
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
          <h1 className="text-2xl font-bold">Welcome to the Home Page!</h1>
          <p className="mt-4 text-gray-600">You are successfully logged in.</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
