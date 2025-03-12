import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import ApiHandler from "../../api/ApiHandler.js";

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

  const handleSignin = async () => {
    // Existing login logic...
    setError("");
    setEmailError("");
    setPasswordError("");

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
      // Firebase authentication - Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(
        FIREBASE_AUTH,
        email,
        password
      );

      // Get Firebase ID Token
      const firebaseToken = await userCredential.user.getIdToken(true);

      // Send email to backend for JWT
      const response = await ApiHandler.post("/auth/login", {
        Email: email,
        firebaseUId: userCredential.user.uid,
      });

      // Get JWT from backend response
      const jwtToken = response.token;

      // Store JWT token in localStorage
      localStorage.setItem("jwtToken", jwtToken);

      // Set token for future API calls using ApiHandler
      ApiHandler.setAuthToken(jwtToken);

      // Show success toast
      toast.success("User signed in successfully");

      // Save user details to local storage
      const userData = { email: userCredential.user.email };
      localStorage.setItem("user", JSON.stringify(userData));

      navigate("/landlord/property");
    } catch (error) {
      let errorMessage = "An unexpected error occurred.";

      // Handle Firebase and API errors
      if (error.code) {
        if (error.code === "auth/wrong-password") {
          errorMessage = "Incorrect password.";
        } else if (error.code === "auth/user-not-found") {
          errorMessage = "User not found.";
        }
      } else if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.request) {
        errorMessage = "Network error. Please try again.";
      }

      // Display error message
      setError(errorMessage);
      toast.error(`Login error: ${errorMessage}`);

      // Ensure token is cleared if any error occurs
      ApiHandler.setAuthToken(null);
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
        <div className="bg-white px-10 py-10">
          <div>
            <label className="text-sm font-medium">Email address</label>
            <input
              className={`w-full border-2 border-gray-100 p-2 mt-3 mb-4 bg-transparent focus:border-indigo-600 focus:outline-none focus:ring-0 rounded-md ${
                emailError && "border-red-500"
              }`}
              placeholder="abc@gmail.com"
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError("");
              }}
              value={email}
            />
            {emailError && (
              <div className="text-red-500 mt-1">{emailError}</div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              className={`w-full border-2 border-gray-100 p-2 mt-3 bg-transparent focus:border-indigo-600 focus:outline-none focus:ring-0 rounded-md ${
                passwordError && "border-red-500"
              }`}
              placeholder="password"
              type="password"
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError("");
              }}
              value={password}
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
            <button className="font-bold text-sm text-indigo-600">
              Forgot Password?
            </button>
          </div>
          <div className="mt-8 flex flex-col gap-y-4">
            <button
              onClick={handleSignin}
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
                onClick={handleRegister}
                className="font-bold text-sm text-indigo-600 hover:text-indigo-800"
              >
                Register
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
