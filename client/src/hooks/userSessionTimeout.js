import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getAuth, signOut } from "firebase/auth";
import ApiHandler from "../api/ApiHandler.js";

const getTokenExpiryTime = (token) => {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const decodedPayload = JSON.parse(atob(payload));

    if (decodedPayload && decodedPayload.exp) {
      return decodedPayload.exp * 1000;
    }
    return null;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

export const useSessionTimeout = () => {
  const navigate = useNavigate();

  const handleTimeout = useCallback(() => {
    console.log("Session expired - logging out");

    toast.error("Your session has expired. Please login again.", {
      position: "top-center",
      autoClose: 3000,
    });

    localStorage.removeItem("jwtToken");
    localStorage.removeItem("user");

    ApiHandler.removeToken();

    const auth = getAuth();
    signOut(auth)
      .catch((error) => console.error("Error signing out:", error))
      .finally(() => {
        setTimeout(() => {
          navigate("/login");
        }, 1000);
      });
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (!token) return;

    const expiryTime = getTokenExpiryTime(token);
    if (!expiryTime) return;

    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;

    console.log(
      `JWT token will expire in ${Math.round(timeUntilExpiry / 1000)} seconds`
    );

    let timeoutId;
    if (timeUntilExpiry > 0) {
      timeoutId = setTimeout(handleTimeout, timeUntilExpiry);
      console.log(
        `Session timeout set for: ${new Date(expiryTime).toLocaleTimeString()}`
      );
    } else {
      handleTimeout();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [handleTimeout]);
};
