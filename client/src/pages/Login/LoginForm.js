import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import ApiHandler from "../../api/ApiHandler.js";
import { useAuth } from "../../context/AuthContext.js";

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
  const location = useLocation(); // Add this to detect navigation changes
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const { currentUser, loading } = useAuth();
  const [loginAttempt, setLoginAttempt] = useState(false);

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
          // Use toastId to prevent duplicate toasts
          toast.info("You have been signed out", {
            toastId: "logout-notification",
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

    setError("");
    setEmailError("");
    setPasswordError("");

    // Validation
    if (!email.trim() || !password.trim()) {
      if (!email.trim()) setEmailError("Email is required.");
      if (!password.trim()) setPasswordError("Password is required.");
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email.");
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
          "This portal is for Landlords and Admins only. Please use the appropriate app for your role."
        );
        setError(
          `Access denied. ${userRole} users are not allowed in this portal.`
        );

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

      toast.success(`Signed in successfully as ${userRole || "User"}`);

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
      let errorMessage = "An unexpected error occurred.";

      if (error.code) {
        if (error.code === "auth/wrong-password") {
          errorMessage = "Incorrect password.";
        } else if (error.code === "auth/user-not-found") {
          errorMessage = "User not found.";
        } else if (error.code === "auth/too-many-requests") {
          errorMessage =
            "Too many failed login attempts. Please try again later.";
        } else {
          errorMessage = `Firebase error: ${error.message}`;
        }
      } else if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.request) {
        errorMessage = "Network error. Please try again.";
      }

      setError(errorMessage);
      toast.error(`Login error: ${errorMessage}`);

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
        <form className="bg-white px-10 py-10" onSubmit={handleSignin}>
          <div>
            <label className="text-sm font-medium" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className={`w-full border-2 border-gray-100 p-2 mt-3 mb-4 bg-transparent focus:border-indigo-600 focus:outline-none focus:ring-0 rounded-md ${
                emailError && "border-red-500"
              }`}
              placeholder="abc@gmail.com"
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError("");
              }}
              value={email}
              required
            />
            {emailError && (
              <div className="text-red-500 mt-1">{emailError}</div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={`w-full border-2 border-gray-100 p-2 mt-3 bg-transparent focus:border-indigo-600 focus:outline-none focus:ring-0 rounded-md ${
                passwordError && "border-red-500"
              }`}
              placeholder="password"
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError("");
              }}
              value={password}
              required
            />
            {passwordError && (
              <div className="text-red-500 mt-1">{passwordError}</div>
            )}
          </div>
          {error && <div className="text-red-500 mt-2">{error}</div>}
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
              {isSubmitting ? "Submitting..." : "Sign In"}
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
