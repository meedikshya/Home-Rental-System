// src/pages/Login/LoginForm.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import useUser from "../../hooks/useUser.js";

export const LoginForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const { login } = useUser();

  const handleRegister = () => {
    navigate("/register");
  };

  const handleSignin = async () => {
    try {
      setError("");
      setEmailError("");
      setPasswordError("");

      if (!email || !password) {
        if (!email) setEmailError("Email is required.");
        if (!password) setPasswordError("Password is required.");
        return;
      }

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        login({ email, role: data.role }); // Use login from useUser

        toast.success("Login successful!");

        setEmail("");
        setPassword("");

        navigate(data.role === "admin" ? "/adminpanel" : "/home");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }
    } catch (error) {
      setError("Login failed. Please try again later.");
      toast.error(`Login error: ${error.message}`);
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
              setEmail(event.target.value);
              setEmailError("");
            }}
            value={email}
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
