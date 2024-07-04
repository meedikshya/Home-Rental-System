import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../services/Firebase-config.js"; // Adjust the import path accordingly
import { toast } from "react-toastify";

export const RegisterForm = ({
  registerEmail,
  registerPassword,
  setRegisterEmail,
  setRegisterPassword,
}) => {
  const navigate = useNavigate();
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleLogin = () => {
    navigate("/");
  };

  const handleRegister = async () => {
    try {
      // Reset previous errors
      setEmailError("");
      setPasswordError("");

      // Basic validation
      if (!registerEmail || !registerPassword) {
        if (!registerEmail) setEmailError("Email is required.");
        if (!registerPassword) setPasswordError("Password is required.");
        return;
      }

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        registerEmail,
        registerPassword
      );
      const user = userCredential.user;

      // Get ID token
      const token = await user.getIdToken();

      // Send user details to backend with Authorization header
      await registerUserToBackend(
        {
          email: registerEmail,
          password: registerPassword,
        },
        token
      );

      // Clear inputs after successful registration
      toast.success("Registration successful! Please log in.");
      navigate("/");

      setRegisterEmail("");
      setRegisterPassword("");

      console.log("localStorage keys:", Object.keys(localStorage));
      console.log("Firebase Token:", token); // Print the token to the console
    } catch (error) {
      console.error("Error registering user:", error.message);
      toast.error(`Registration error: ${error.message}`);
    }
  };

  const registerUserToBackend = async (userData, token) => {
    const response = await fetch("http://localhost:3000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Registration error: ${errorData.error}`);
    }

    return await response.json();
  };

  return (
    <div>
      <h1 className="px-10 py-8 text-2xl font-semibold ml-9">
        Create new account
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
              setRegisterEmail(event.target.value);
              setEmailError("");
            }}
            value={registerEmail}
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
              setRegisterPassword(event.target.value);
              setPasswordError("");
            }}
            value={registerPassword}
          />
          {passwordError && (
            <div className="text-red-500 mt-1">{passwordError}</div>
          )}
        </div>
        <div className="mt-8 flex flex-col gap-y-4">
          <button
            onClick={handleRegister}
            className="py-2 bg-indigo-600 text-white text-lg rounded-md"
          >
            Sign up
          </button>
        </div>
        <div>
          <p className="mt-5 ml-8">
            Already have an account?
            <button
              onClick={handleLogin}
              className="font-bold text-sm text-indigo-600"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
