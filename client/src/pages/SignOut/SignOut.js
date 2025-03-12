// src/pages/SignOut.js
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import useUser from "../../hooks/useUser.js";

const SignOut = () => {
  const navigate = useNavigate();
  const { logout } = useUser();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });

        if (response.ok) {
          logout(); // Use logout from useUser
          toast.success("Logout successful");
          navigate("/"); // Navigate to login page
        } else {
          toast.error("Logout failed. Please try again.");
        }
      } catch (error) {
        console.error("Logout Error:", error.message);
        toast.error(`Logout error: ${error.message}`);
      }
    };

    handleLogout();
  }, [navigate, logout]);

  return <div>Signing out...</div>;
};

export default SignOut;
