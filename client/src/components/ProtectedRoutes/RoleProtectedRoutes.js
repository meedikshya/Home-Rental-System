import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { getAuth } from "firebase/auth";
import SessionTimeoutProvider from "../../hooks/sessionProvider.js";

const getUserRoleFromToken = (token) => {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));

    return (
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
      null
    );
  } catch (error) {
    console.error("Error parsing token:", error);
    return null;
  }
};

const RoleProtectedRoute = ({ children, requiredRole = "Landlord" }) => {
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        // Check if user is logged in
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Get JWT token
        const token = localStorage.getItem("jwtToken");
        if (!token) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Check user role from token
        const userRole = getUserRoleFromToken(token);
        console.log("User role from token:", userRole);

        const hasRequiredRole = userRole === requiredRole;
        setIsAuthorized(hasRequiredRole);

        if (!hasRequiredRole) {
          toast.error(`Access denied. ${requiredRole} role required.`);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Authorization check failed:", error);
        setIsAuthorized(false);
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, [requiredRole]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <SessionTimeoutProvider>{children}</SessionTimeoutProvider>;
};

export default RoleProtectedRoute;
