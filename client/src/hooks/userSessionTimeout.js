import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const useSessionTimeout = (timeout = 3600000) => {
  // Default 1 hour timeout
  const navigate = useNavigate();

  useEffect(() => {
    const handleUserActivity = () => {
      // Reset timer on user activity
      clearTimeout(sessionTimeout);
      startSessionTimeout();
    };

    const startSessionTimeout = () => {
      sessionTimeout = setTimeout(() => {
        // Log out the user after timeout
        sessionStorage.removeItem("userEmail");
        navigate("/login");
      }, timeout);
    };

    // Listen for user activity events
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    // Start the timeout
    let sessionTimeout = setTimeout(() => {
      sessionStorage.removeItem("userEmail");
      navigate("/login");
    }, timeout);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      clearTimeout(sessionTimeout);
    };
  }, [navigate, timeout]);
};
