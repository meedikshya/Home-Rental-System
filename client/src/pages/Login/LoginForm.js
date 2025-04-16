import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import ApiHandler from "../../api/ApiHandler.js";
import { useAuth } from "../../context/AuthContext.js";

const isTokenExpired = (token) => {
  if (!token) return false; // No token doesn't mean expired - it could be first visit

  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));

    // Check if token has expiration claim
    if (!decoded.exp) return false;

    // Compare expiration timestamp with current time
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    // Don't consider parsing errors as expired sessions
    return false;
  }
};

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

export const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const { currentUser, loading } = useAuth();
  const [loginAttempt, setLoginAttempt] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Add a ref to track if logout has already been performed
  const logoutPerformedRef = useRef(false);
  // Add a ref to track initial mount
  const initialMountRef = useRef(true);
  // Add a ref to track if this is an explicit navigation
  const isExplicitNavigationRef = useRef(false);
  // Add timestamp for server restart detection
  const pageLoadTime = useRef(Date.now());
  // Track server restart state
  const [isServerRestart, setIsServerRestart] = useState(false);

  // Check for expired session on component mount - but only if explicitly redirected
  useEffect(() => {
    // Only check for session expiration if redirected from another page
    // or if there's a specific expired query parameter
    const params = new URLSearchParams(location.search);
    const expiredParam = params.get("sessionExpired");
    const redirectedFrom = params.get("from");

    // Clear the URL parameters without triggering a full page reload
    if (expiredParam || redirectedFrom) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }

    // Only show expired message if explicitly redirected with expired parameter
    // or we're coming from another page with an expired token
    if (expiredParam === "true") {
      setSessionExpired(true);
      // Don't set error message - only show toast
      toast.info("Your session has expired. Please sign in again.", {
        position: "top-right",
        autoClose: 5000,
      });

      // Clean up any stale auth data
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("user");
      ApiHandler.removeToken();

      // Sign out from Firebase if needed
      if (currentUser && !logoutPerformedRef.current) {
        logoutPerformedRef.current = true;
        signOut(FIREBASE_AUTH).catch((error) => {
          console.error("Error signing out after session expiration:", error);
        });
      }
    }
    // Check if token is expired and we were redirected from another page
    else if (redirectedFrom) {
      const token = localStorage.getItem("jwtToken");
      if (isTokenExpired(token)) {
        setSessionExpired(true);
        // Don't set error message - only show toast
        toast.info("Your session has expired. Please sign in again.", {
          position: "top-right",
          autoClose: 5000,
        });

        // Clean up any stale auth data
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("user");
        ApiHandler.removeToken();

        if (currentUser && !logoutPerformedRef.current) {
          logoutPerformedRef.current = true;
          signOut(FIREBASE_AUTH).catch((err) => {
            console.error("Error signing out on expired token:", err);
          });
        }
      }
    }
  }, [location.search, currentUser]);

  // Check for navigation to login via history
  useEffect(() => {
    // If location changes with a new key, it's an explicit navigation
    if (!initialMountRef.current && location.key) {
      isExplicitNavigationRef.current = true;
    }
  }, [location]);

  // Auto-redirect for logged-in users on server restart
  useEffect(() => {
    // Run on initial load only
    if (!initialMountRef.current) return;

    const checkServerRestart = () => {
      const lastActivity = localStorage.getItem("lastUserActivity");
      // Consider it a server restart if:
      // 1. Page just loaded
      // 2. Last activity exists but was recent (within 5 seconds)
      const now = Date.now();

      if (lastActivity) {
        const timeSinceLastActivity = now - parseInt(lastActivity, 10);
        // If last activity was recent but page refreshed, likely a server restart
        if (timeSinceLastActivity < 5000) {
          setIsServerRestart(true);
          console.log("Detected server restart");
          return true;
        }
      }
      return false;
    };

    // Update last activity timestamp
    const updateActivityTimestamp = () => {
      localStorage.setItem("lastUserActivity", Date.now().toString());
    };

    // Set up activity tracking
    updateActivityTimestamp();
    window.addEventListener("click", updateActivityTimestamp);
    window.addEventListener("keypress", updateActivityTimestamp);

    const redirectIfNeeded = async () => {
      initialMountRef.current = false;

      // Skip if still loading auth state
      if (loading) return;

      // Check if this is likely a server restart
      const isRestart = checkServerRestart();

      // If logged in and it's a server restart, redirect to appropriate page
      if (currentUser && isRestart) {
        logoutPerformedRef.current = true; // Prevent auto-logout

        try {
          // Check if token is still valid
          const jwtToken = localStorage.getItem("jwtToken");
          if (!jwtToken) return; // No token, can't redirect

          // Don't redirect if token is expired
          if (isTokenExpired(jwtToken)) {
            // Silently clean up without showing error message
            localStorage.removeItem("jwtToken");
            localStorage.removeItem("user");
            ApiHandler.removeToken();
            return;
          }

          // Get user role and redirect
          const userRole = getUserRoleFromToken(jwtToken);

          if (userRole === "Landlord") {
            setTimeout(() => navigate("/landlord/property"), 100);
          } else if (userRole === "Admin") {
            setTimeout(() => navigate("/admin/dashboard"), 100);
          } else {
            setTimeout(() => navigate("/"), 100);
          }
        } catch (error) {
          console.error("Error during restart redirect:", error);
          // Silently handle errors without showing expired session message
        }
      }
    };

    // Execute redirect logic
    redirectIfNeeded();

    return () => {
      // Clean up event listeners
      window.removeEventListener("click", updateActivityTimestamp);
      window.removeEventListener("keypress", updateActivityTimestamp);
    };
  }, [currentUser, loading, navigate]);

  // Auto-logout when navigating to login page while already authenticated
  useEffect(() => {
    // Skip if loading, in login process, already logged out, or on server restart
    if (
      loading ||
      loginAttempt ||
      logoutPerformedRef.current ||
      isServerRestart
    ) {
      return;
    }

    // Only log out if:
    // 1. User is logged in
    // 2. This was an explicit navigation to login page (not initial load)
    // 3. Not in the middle of submitting login form
    if (currentUser && !isSubmitting && isExplicitNavigationRef.current) {
      console.log(
        "Explicit navigation to login while logged in. Logging out..."
      );

      // Set the ref to true to prevent double execution
      logoutPerformedRef.current = true;

      // Clear tokens and auth data
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("user");
      ApiHandler.removeToken();

      // Sign out from Firebase
      signOut(FIREBASE_AUTH)
        .then(() => {
          console.log("User signed out successfully");
          toast.info("You have been signed out", {
            toastId: "logout-notification",
            position: "top-right",
          });
        })
        .catch((error) => {
          console.error("Sign-out error:", error);
        });
    }
  }, [currentUser, loading, isSubmitting, loginAttempt, isServerRestart]);

  const handleRegister = () => {
    navigate("/register");
  };

  const handleSignin = async (e) => {
    if (e) e.preventDefault();

    // Clear error states
    setError("");
    setEmailError("");
    setPasswordError("");
    setSessionExpired(false);

    // Validation
    if (!email.trim() || !password.trim()) {
      if (!email.trim()) {
        setEmailError("Email is required"); // Just for styling
        toast.warning("Please enter your email address.", {
          position: "top-right",
          autoClose: 3000,
        });
      }
      if (!password.trim()) {
        setPasswordError("Password is required"); // Just for styling
        toast.warning("Please enter your password.", {
          position: "top-right",
          autoClose: 3000,
        });
      }
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      setEmailError("Invalid email"); // Just for styling
      toast.warning("Invalid email format. Please check your email address.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setSubmitting(true);
    // Set login attempt flag to prevent auto-logout
    setLoginAttempt(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        FIREBASE_AUTH,
        email,
        password
      );

      const response = await ApiHandler.post("/auth/login", {
        Email: email,
        firebaseUId: userCredential.user.uid,
      });

      const jwtToken = response.token;

      // Extract user role from JWT
      const userRole = getUserRoleFromToken(jwtToken);
      console.log("User role:", userRole);

      // Define allowed roles for this portal
      const ALLOWED_ROLES = ["Landlord", "Admin"];

      if (!ALLOWED_ROLES.includes(userRole)) {
        // Handle unauthorized role (like Renter)
        await FIREBASE_AUTH.signOut();

        toast.error(
          "Access denied. This portal is for Landlords and Admins only.",
          {
            position: "top-right", // Changed from top-center
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );

        // Don't set error message - only show toast

        localStorage.removeItem("jwtToken");
        ApiHandler.removeToken();

        setSubmitting(false);
        setLoginAttempt(false);
        return;
      }

      // Store authentication data
      localStorage.setItem("jwtToken", jwtToken);
      ApiHandler.setAuthToken(jwtToken);

      const userData = {
        email: userCredential.user.email,
        role: userRole,
      };
      localStorage.setItem("user", JSON.stringify(userData));

      // Update last activity timestamp
      localStorage.setItem("lastUserActivity", Date.now().toString());

      toast.success(
        `Welcome back! Signed in successfully as ${userRole || "User"}`,
        {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        }
      );

      // Reset the logout performed ref since we're now intentionally logging in
      logoutPerformedRef.current = false;

      // Role-based redirection
      if (userRole === "Landlord") {
        navigate("/landlord/property");
      } else if (userRole === "Admin") {
        // Updated to redirect to the new admin dashboard
        navigate("/admin/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      let toastMessage = "Login failed. Please try again.";

      if (error.code) {
        // Firebase authentication errors
        switch (error.code) {
          case "auth/wrong-password":
            setPasswordError("Invalid"); // Just for styling
            toastMessage = "The password you entered is incorrect.";
            break;

          case "auth/invalid-credential":
            setPasswordError("Invalid"); // Just for styling
            toastMessage = "The email or password you entered is incorrect.";
            break;

          case "auth/user-not-found":
            setEmailError("Invalid"); // Just for styling
            toastMessage = "We couldn't find an account with that email.";
            break;

          case "auth/too-many-requests":
            toastMessage =
              "Account temporarily locked due to multiple failed attempts.";
            break;

          case "auth/user-disabled":
            toastMessage =
              "Your account has been disabled. Please contact support.";
            break;

          case "auth/invalid-email":
            setEmailError("Invalid"); // Just for styling
            toastMessage = "Please enter a valid email address.";
            break;

          case "auth/network-request-failed":
            toastMessage =
              "Connection issue. Please check your internet and try again.";
            break;

          default:
            toastMessage = "Authentication failed. Please try again.";
        }
      } else if (error.response) {
        // API response errors
        if (error.response.status === 401) {
          toastMessage = "Invalid credentials. Please try again.";
        } else if (error.response.status === 403) {
          toastMessage =
            "Access denied. Please contact support if you believe this is an error.";
        } else if (error.response.status === 404) {
          toastMessage = "We couldn't find your account in our system.";
        } else {
          toastMessage = "Server error. Please try again later.";
        }
      } else if (error.request) {
        toastMessage =
          "Connection failed. Please check your internet and try again.";
      }

      toast.error(toastMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      ApiHandler.removeToken();
      localStorage.removeItem("jwtToken");
      setLoginAttempt(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <h1 className="px-10 py-8 text-2xl font-semibold text-center border-b">
          Sign in to your account
        </h1>
        {sessionExpired && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 mx-10 mt-5">
            <p className="font-medium">Session Expired</p>
            <p>Your session has expired. Please sign in again to continue.</p>
          </div>
        )}
        <form className="bg-white px-10 py-10" onSubmit={handleSignin}>
          <div>
            <label className="text-sm font-medium" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className={`w-full border-2 border-gray-100 p-2 mt-3 mb-4 bg-transparent focus:border-indigo-600 focus:outline-none focus:ring-0 rounded-md ${
                emailError ? "border-red-500" : ""
              }`}
              placeholder="abc@gmail.com"
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError("");
              }}
              value={email}
              required
            />
            {/* Removed inline error message */}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={`w-full border-2 border-gray-100 p-2 mt-3 bg-transparent focus:border-indigo-600 focus:outline-none focus:ring-0 rounded-md ${
                passwordError ? "border-red-500" : ""
              }`}
              placeholder="password"
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError("");
              }}
              value={password}
              required
            />
            {/* Removed inline error message */}
          </div>
          {/* Removed general error message */}
          <div className="mt-8 flex justify-between items-center">
            <div>
              <input type="checkbox" id="remember" />
              <label className="ml-1 font-medium text-base" htmlFor="remember">
                Remember me
              </label>
            </div>
            <button type="button" className="font-bold text-sm text-indigo-600">
              Forgot Password?
            </button>
          </div>
          <div className="mt-8 flex flex-col gap-y-4">
            <button
              type="submit"
              className="py-2 bg-indigo-600 text-white text-lg rounded-md hover:bg-indigo-700 transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
          <div className="mt-5 text-center">
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={handleRegister}
                className="font-bold text-sm text-indigo-600 hover:text-indigo-800"
              >
                Register
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
