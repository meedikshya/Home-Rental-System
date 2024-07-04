import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

export const LoginForm = ({
  loginEmail,
  loginPassword,
  setLoginEmail,
  setLoginPassword,
  login,
}) => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleRegister = () => {
    navigate("/register");
  };

  const handleSignin = async () => {
    try {
      // Reset previous errors
      setError("");
      setEmailError("");
      setPasswordError("");

      // Basic validation
      if (!loginEmail || !loginPassword) {
        if (!loginEmail) setEmailError("Email is required.");
        if (!loginPassword) setPasswordError("Password is required.");
        return;
      }

      const success = await login(loginEmail, loginPassword); // Call login function passed as prop

      if (success) {
        // Clear inputs after successful login
        setLoginEmail("");
        setLoginPassword("");

        // Store Firebase token in localStorage if using Firebase Authentication
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          localStorage.setItem("firebaseToken", token);
        }

        // Navigate to home page or another secure route
        navigate("/home");
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } catch (error) {
      setError("Login failed. Please try again later.");
      console.error("Login Error:", error.message);
    }
  };

  return (
    <div>
      <h1 className="px-10 py-8 text-2xl font-semibold">
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
              setLoginEmail(event.target.value);
              setEmailError("");
            }}
            value={loginEmail}
          />
          {emailError && <div className="text-red-500 mt-1">{emailError}</div>}
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
              setLoginPassword(event.target.value);
              setPasswordError("");
            }}
            value={loginPassword}
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
            className="py-2 bg-indigo-600 text-white text-lg rounded-md"
          >
            Sign In
          </button>
        </div>
        <div>
          <p className="mt-5 ml-8">
            Don't have an account?
            <button
              onClick={handleRegister}
              className="font-bold text-sm text-indigo-600"
            >
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
