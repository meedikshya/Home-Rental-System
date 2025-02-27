import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../services/Firebase-config.js";
import ApiHandler from "../../api/ApiHandler.js";

export const RegisterForm = ({
  registerEmail,
  registerPassword,
  setRegisterEmail,
  setRegisterPassword,
}) => {
  const navigate = useNavigate();
  const [isSubmitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleLogin = () => {
    navigate("/login");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    // Existing registration logic...
    setEmailError("");
    setPasswordError("");

    if (!registerEmail.trim() || !registerPassword.trim()) {
      if (!registerEmail.trim()) setEmailError("Email is required.");
      if (!registerPassword.trim()) setPasswordError("Password is required.");
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(registerEmail)) {
      setEmailError("Please enter a valid email.");
      return;
    }

    setSubmitting(true);

    try {
      // Firebase authentication
      const userCredential = await createUserWithEmailAndPassword(
        FIREBASE_AUTH,
        registerEmail,
        registerPassword
      );

      const firebaseUserId = userCredential.user.uid;

      // Save user information in Firestore
      await setDoc(doc(FIREBASE_DB, "users", firebaseUserId), {
        email: registerEmail,
        userRole: "Landlord",
        firebaseUId: firebaseUserId,
      });

      // Send additional user data to your backend API
      const response = await ApiHandler.post("/Users", {
        email: registerEmail,
        passwordHash: registerPassword,
        userRole: "Landlord",
        firebaseUId: firebaseUserId,
      });

      if (response && response.userId) {
        toast.success("Registration successful! Please log in.");
        navigate(`/userinfo/${response.userId}`);
        setRegisterEmail("");
        setRegisterPassword("");
      } else {
        throw new Error("Unexpected API response format.");
      }
    } catch (error) {
      console.error("Error registering user:", error.message);
      toast.error(`Registration error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <h1 className="px-10 py-8 text-2xl font-semibold text-center border-b">
          Create new account
        </h1>
        <div className="bg-white px-10 py-10">
          <form onSubmit={handleRegister}>
            <div>
              <label className="text-sm font-medium">Email address</label>
              <input
                className={`w-full border-2 border-gray-100 p-2 mt-3 mb-4 bg-transparent focus:border-indigo-600 focus:outline-none focus:ring-0 rounded-md ${
                  emailError ? "border-red-500" : ""
                }`}
                placeholder="abc@gmail.com"
                onChange={(event) => {
                  setRegisterEmail(event.target.value);
                  setEmailError("");
                }}
                value={registerEmail}
                autoComplete="email"
              />
              {emailError && (
                <div className="text-red-500 mt-1">{emailError}</div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                className={`w-full border-2 border-gray-100 p-2 mt-3 bg-transparent focus:border-indigo-600 focus:outline-none focus:ring-0 rounded-md ${
                  passwordError ? "border-red-500" : ""
                }`}
                placeholder="password"
                type="password"
                onChange={(event) => {
                  setRegisterPassword(event.target.value);
                  setPasswordError("");
                }}
                value={registerPassword}
                autoComplete="current-password"
              />
              {passwordError && (
                <div className="text-red-500 mt-1">{passwordError}</div>
              )}
            </div>
            <div className="mt-8 flex flex-col gap-y-4">
              <button
                type="submit"
                className="py-2 bg-indigo-600 text-white text-lg rounded-md hover:bg-indigo-700 transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Sign up"}
              </button>
            </div>
          </form>
          <div className="mt-5 text-center">
            <p>
              Already have an account?{" "}
              <button
                onClick={handleLogin}
                className="font-bold text-sm text-indigo-600 hover:text-indigo-800"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
