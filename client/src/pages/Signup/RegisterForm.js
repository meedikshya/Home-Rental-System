import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const handleRegister = async (e) => {
    e.preventDefault(); // Prevent default form submission
    try {
      setEmailError("");
      setPasswordError("");

      if (!registerEmail || !registerPassword) {
        if (!registerEmail) setEmailError("Email is required.");
        if (!registerPassword) setPasswordError("Password is required.");
        return;
      }

      const response = await registerUserToBackend({
        email: registerEmail,
        password: registerPassword,
      });

      console.log("API Response:", response);

      if (response.message === "Registration successful") {
        toast.success("Registration successful! Please log in.");
        navigate("/");
        setRegisterEmail("");
        setRegisterPassword("");
      } else {
        throw new Error(response.error || "Registration failed");
      }
    } catch (error) {
      console.error("Error registering user:", error.message);
      toast.error(`Registration error: ${error.message}`);
    }
  };

  const registerUserToBackend = async (userData) => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const responseText = await response.text(); // Read response as text
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || "Registration failed");
        } catch (error) {
          throw new Error("Registration failed: " + responseText);
        }
      }

      return JSON.parse(await response.text()); // Parse response text as JSON
    } catch (error) {
      throw new Error(`Network or server error: ${error.message}`);
    }
  };

  return (
    <div>
      <h1 className="px-10 py-8 text-2xl font-semibold ml-9">
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
            {emailError && <div className="text-red-500 mt-1">{emailError}</div>}
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
              className="py-2 bg-indigo-600 text-white text-lg rounded-md"
            >
              Sign up
            </button>
          </div>
        </form>
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