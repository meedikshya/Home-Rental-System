import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const SignOut = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/logout", {
          method: "POST",
          credentials: "include", // Ensure cookies are sent with the request
        });

        if (response.ok) {
          sessionStorage.removeItem("userEmail"); // Clear session storage
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
  }, [navigate]);

  return <div>Signing out...</div>;
};

export default SignOut;
