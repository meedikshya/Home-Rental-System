import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import ApiHandler from "../../api/ApiHandler.js";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");

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

      if (userRole === "Renter") {
        await FIREBASE_AUTH.signOut();

        toast.error(
          "This portal is for Landlords only. Renters please use the Renter app."
        );
        setError("Access denied. This portal is for Landlords only.");

        localStorage.removeItem("jwtToken");
        ApiHandler.removeToken();

        setSubmitting(false);
        return;
      }

      localStorage.setItem("jwtToken", jwtToken);

      ApiHandler.setAuthToken(jwtToken);

      const userData = {
        email: userCredential.user.email,
        role: userRole,
      };
      localStorage.setItem("user", JSON.stringify(userData));

      toast.success(`Signed in successfully as ${userRole || "User"}`);

      if (userRole === "Landlord") {
        navigate("/landlord/property");
      } else if (userRole === "Admin") {
        navigate("/adminpanel");
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
